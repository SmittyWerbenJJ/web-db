import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from "@angular/router";
import { Server } from "../../../classes/server";
import { Database } from "../../../classes/database";
import { Table } from "../../../classes/table";
import { DrawerService } from "../../../shared/drawer.service";
import { combineLatest, distinctUntilChanged, Subscription } from "rxjs";
import { RequestService } from "../../../shared/request.service";
import { Column } from "../../../classes/column";
import { Title } from "@angular/platform-browser";
import { MatSnackBar } from "@angular/material/snack-bar";

class Tab {
	link!: string
	icon!: string
}

export const Tabs: Tab[] = [
	{link: "explore", icon: "quick_reference_all"},
	{link: "query", icon: "code_blocks"},
	{link: "structure", icon: "view_week"},
	{link: "insert", icon: "note_add"},
	{link: "trigger", icon: "device_hub"},
	{link: "advanced", icon: "settings_applications"},
];

@Component({
	selector: 'app-tables',
	templateUrl: './tables.component.html',
	styleUrls: ['./tables.component.scss']
})
export class TablesComponent implements OnInit, OnDestroy {

	obs?: Subscription;
	selectedDatabase?: Database;
	selectedServer?: Server;
	selectedTable?: Table;

	tooltips: any = {};
	tabs = Tabs;

	constructor(
		private router: Router,
		private titleService: Title,
		private snackBar: MatSnackBar,
		private drawer: DrawerService,
		private request: RequestService,
		private activatedRoute: ActivatedRoute
	) {
	}

	async ngOnInit() {
		this.obs = combineLatest([this.activatedRoute.paramMap, this.request.serverReload]).pipe(
			distinctUntilChanged()
		).subscribe(async (_params) => {
			this.selectedDatabase = Database.getSelected();
			this.selectedServer = Server.getSelected();

			if (!this.selectedDatabase || !this.selectedDatabase.tables?.length) {
				return;
			}

			const tableName = this.activatedRoute.snapshot.paramMap.get('table') || this.selectedDatabase.tables[0].name;
			const table = this.selectedDatabase.tables.find(table => table.name === tableName);
			if (!table) {
				this.snackBar.open(`Can't access to ${tableName}`, "╳", {panelClass: 'snack-error'});
				return;
			}
			this.titleService.setTitle(tableName + " – " + this.selectedDatabase.name + " – " + this.selectedServer.port);
			this.selectedTable = table;
			Table.setSelected(this.selectedTable!);

			if (!this.activatedRoute.snapshot.paramMap.get('table')) {
				await this.router.navigate([
					this.selectedServer.name,
					this.selectedDatabase.name,
					this.selectedTable.name
				]);
			}
		});
	}

	ngOnDestroy(): void {
		this.obs?.unsubscribe();
	}

	filterChanged(_value: string) {
		if (!this.selectedDatabase) {
			return;
		}

		const value = _value.toLowerCase();

		for (const [index, table] of this.selectedDatabase.tables!.entries()) {
			let match = table.name.toLowerCase().indexOf(value) > -1;
			match = match || (table.columns.findIndex(col => col.name.toLowerCase().indexOf(value) > -1) > -1);

			this.selectedDatabase.tables![index].hide = !match;
		}
	}

	getTooltip(table: Table) {
		if (this.tooltips[table.name]) {
			delete this.tooltips[table.name];
			return;
		}

		let str = "<table class='table'>";
		const indexes = Table.getIndexes(table);
		const relations = Table.getRelations(table);

		for (const col of table.columns) {
			const relation = relations.find(relation => relation.column_source === col.name);
			const tags = Column.getTags(col, indexes, relation);

			str += `<tr class="mat-row"><td class="mat-cell">${col.name}</td><td class="mat-cell">${tags.join('　')}</td></tr>`;
		}

		this.tooltips[table.name] = str + "</table>";
	}

	async addTable() {
		this.drawer.toggle();
		await this.router.navigate(
			[{outlets: {right: ['table', 'create']}}],
			{relativeTo: this.activatedRoute.parent})
	}

	async changeTable(name: string) {
		let url = this.router.url.replace(`/${this.selectedTable!.name}/`, `/${name}/`);

		const explore = url.indexOf(`/explore?`);
		if (explore >= 0) {
			url = url.substring(0, explore) + '/explore';
		}

		await this.router.navigateByUrl(url);
	}
}
