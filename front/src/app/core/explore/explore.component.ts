import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { Server } from "../../../classes/server";
import { ActivatedRoute, Params, Router } from "@angular/router";
import { Table } from "../../../classes/table";
import { combineLatest, distinctUntilChanged, Subscription } from "rxjs";
import { MatChipInputEvent } from "@angular/material/chips";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Configuration } from "../../../classes/configuration";
import { RequestService } from "../../../shared/request.service";
import { SelectionModel } from "@angular/cdk/collections";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";

@Component({
	selector: 'app-explore',
	styleUrls: ['explore.component.scss'],
	templateUrl: 'explore.component.html',
})
export class ExploreComponent implements OnInit, OnDestroy {

	configuration: Configuration = new Configuration();
	selectedTable?: Table;
	selectedServer?: Server;
	obs?: Subscription;
	querySize = 0;
	pageSize = 100;
	params = {
		chips: "",
		sortField: "",
		sortDirection: "",
		page: 0
	}
	filter: any[any] = [];
	autoUp: boolean | NodeJS.Timer = false;
	query = "";
	isLoading = false;
	actionColum = "##ACTION##";
	displayedColumns: string[] = [];
	dataSource!: MatTableDataSource<any>;
	selection = new SelectionModel<any>(true, []);

	protected readonly Math = Math;
	@ViewChild(MatPaginator) paginator!: MatPaginator;

	constructor(
		private snackBar: MatSnackBar,
		private request: RequestService,
		private router: Router,
		private dialog: MatDialog,
		private activatedRoute: ActivatedRoute
	) {
	}

	ngOnDestroy(): void {
		if (this.autoUp && typeof this.autoUp === "number") {
			clearInterval(this.autoUp);
			this.autoUp = false
		}
		this.obs?.unsubscribe();
	}

	ngOnInit() {
		this.obs = combineLatest([this.activatedRoute.parent?.params, this.activatedRoute?.queryParams, this.request.serverReload]).pipe(
			distinctUntilChanged()
		).subscribe(async (_params) => {
			this.selectedServer = Server.getSelected();
			this.selectedTable = Table.getSelected();

			// @ts-ignore
			const params = <Params>{..._params[0], ..._params[1]};
			this.changePage(params["page"] || 0, false);
			this.params.sortField = params["sortField"] || "";
			this.params.sortDirection = params["sortDirection"] || "";
			this.params.chips = params["chips"] || "";
			this.selection.clear();

			await this.refreshData();
		});
	}

	changePage(page: any, navigate = true) {
		page = +page;
		if ((page * this.pageSize) > this.querySize) {
			page = 0;
			navigate = true;
		}

		this.params.page = +page;

		if (navigate) {
			this.navigateWithParams()
		}
		return event;
	}

	navigateWithParams() {
		this.router.navigate([], {
			relativeTo: this.activatedRoute,
			queryParams: this.params,
			queryParamsHandling: 'merge',
		});
	}

	async refreshData() {
		this.isLoading = true;
		this.query = this.filterToWhere();

		try {
			await Promise.all([this.getQueryData(), this.getQuerySize()]);
		} catch (HttpErrorResponse) {
		} finally {
			this.isLoading = false;
		}
	}

	async getQueryData() {
		let query = this.query;

		if (this.params.sortDirection && this.params.sortField) {
			query += this.selectedServer?.driver.getBaseSort(this.params.sortField, <"asc" | "desc">this.params.sortDirection);
		}

		const result = await this.request.post('database/query', {
			query,
			pageSize: this.pageSize,
			page: this.params.page
		});

		this.dataSource = new MatTableDataSource<any>(result);
		this.displayedColumns = result.length ? this.selectedTable!.columns.map(column => column.name).concat([this.actionColum]) : [];
	}

	async getQuerySize() {
		this.querySize = await this.request.post('database/querySize', {query: this.query});
	}

	filterToWhere(): string {
		const condition = this.params.chips.split(';').filter(e => e);
		const operand = this.configuration.getByName('operand')?.value;

		return this.selectedServer!.driver.getBaseFilter(this.selectedTable!, condition, operand);
	}

	addChips(column: string, event: MatChipInputEvent): void {
		let value = event.value.trim();
		if (!value) {
			return;
		}

		if (this.selectedServer?.driver.availableComparator.find((comparator) => {
			return value.toLowerCase().startsWith(comparator.symbol.toLowerCase())
		})) {
			this.params.chips += `${column} ${value};`;
		} else {
			this.params.chips += `${column} ${this.selectedServer?.driver.defaultFilter} ${value};`;
		}

		this.params.page = 0;
		event.chipInput!.clear();
		this.navigateWithParams();
	}

	removeChips(chips: string): void {
		this.params.chips = this.params.chips.replace(`${chips};`, '');

		this.navigateWithParams();
	}

	async removeRows() {
		const nb = await this.request.post('data/delete', this.selection.selected);

		this.dataSource.data = this.dataSource.data.filter((row) => {
			return !this.selection.isSelected(row);
		});
		this.selection.clear();

		this.snackBar.open(`${nb} rows deleted`, "╳", {duration: 3000});
	}

	editRow(i: number, row: any) {
		const dialogRef = this.dialog.open(UpdateDataDialog, {
			data: row,
		});

		dialogRef.afterClosed().subscribe(async result => {
			if (result) {
				this.dataSource.data[i] = result;
				this.dataSource._updateChangeSubscription();
			}
		});
	}

	shiftCheckBox(event: MouseEvent, row: any) {
		if (!event || !event.shiftKey || this.selection.isEmpty()) {
			return;
		}

		const indexRow = this.dataSource.data.findIndex(da => JSON.stringify(da) === JSON.stringify(row));
		const indexFirst = this.dataSource.data.findIndex(da => this.selection.isSelected(da));

		for (const [index, line] of this.dataSource.data.entries()) {
			if (index <= Math.min(indexRow, indexFirst)) {
				continue;
			}
			if (index >= Math.max(indexRow, indexFirst)) {
				continue;
			}
			this.selection.toggle(line);
		}
	}

	setAutoUp() {
		if (this.autoUp && typeof this.autoUp === "number") {
			clearInterval(this.autoUp);
			this.autoUp = false
		} else {
			this.autoUp = setInterval(async () => {
				await this.refreshData();
			}, this.configuration.getByName('reloadData')?.value * 1000);
		}
	}

	isAllSelected() {
		return this.selection.selected.length === this.dataSource.data.length;
	}

	toggleAllRows() {
		if (this.isAllSelected()) {
			this.selection.clear();
			return;
		}
		this.selection.select(...this.dataSource.data);
	}
}


@Component({
	templateUrl: 'update-dialog.html',
})
export class UpdateDataDialog {

	updateSuggestions: { [key: string]: string[] } = {};
	str = "";
	editorOptions = {
		language: 'json'
	};

	constructor(
		public dialogRef: MatDialogRef<UpdateDataDialog>,
		public snackBar: MatSnackBar,
		private request: RequestService,
		@Inject(MAT_DIALOG_DATA) public old: any,
	) {
		this.str = JSON.stringify(old, null, "\t");
		this.loadSuggestions();
	}

	async update() {
		const n = JSON.parse(this.str);
		const nb = await this.request.post('data/update', {old_data: this.old, new_data: n});

		this.snackBar.open(`${nb} row(s) updated`, "╳", {duration: 3000});
		this.dialogRef.close(n);
	}

	isTouched() {
		return JSON.stringify(this.old, null, "\t") !== this.str;
	}

	async loadSuggestions() {
		const relations = Table.getRelations();
		const limit = 1000;

		for (const col of Table.getSelected().columns) {
			const enums = Server.getSelected().driver.extractEnum(col);
			if (enums) {
				this.updateSuggestions[col.name] = enums;
				continue;
			}

			if (relations.find(relation => relation.column_source === col.name)) {
				const datas = await this.request.post('relation/exampleData', {column: col.name, limit});
				if (datas && datas.length < limit) {
					this.updateSuggestions[col.name] = datas.map((data: any) => data.example);
				}
			}
		}
	}
}
