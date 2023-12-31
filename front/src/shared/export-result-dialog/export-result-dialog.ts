import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { saveAs } from "file-saver-es";
import { Table } from "../../classes/table";
import { Column } from "../../classes/column";
import { Server } from "../../classes/server";
import { Group } from "../../classes/driver";
import { MatSnackBar } from "@angular/material/snack-bar";

@Component({
	templateUrl: './export-result-dialog.html',
	styleUrls: ['./export-result-dialog.scss']
})
export class ExportResultDialog {

	str!: string;
	type = "JSON";
	columns: string[];
	editorOptions = {
		readOnly: true,
		language: ''
	};
	isLoading = true;

	constructor(
		public snackBar: MatSnackBar,
		@Inject(MAT_DIALOG_DATA) public data: any[],
	) {
		this.columns = Object.keys(this.data[0]).filter(col => {
			const column = Table.getSelected().columns.find(c => c.name === col);
			if (column) {
				return !Column.isOfGroups(Server.getSelected().driver, column, [Group.Blob]);
			}
			return true;
		});
		this.show(this.columns);
	}

	show(columns: string[]) {
		this.isLoading = true;
		setTimeout(() => {
			const rows = this.data.map(row => {
				const d: any = {};
				for (const [key, val] of Object.entries(row)) {
					if (columns.indexOf(key) < 0) {
						continue;
					}
					d[key] = val;
				}
				return d;
			});

			switch (this.type) {
				case "CSV":
					this.str = this.columns.join(',') + '\n';
					this.editorOptions.language = 'csv';
					for (let res of rows) {
						this.str += Object.values(res).join(',') + '\n';
					}
					break;
				case "JSON":
					this.str = JSON.stringify(rows, null, "\t");
					this.editorOptions.language = 'json';
					break;
			}
			this.isLoading = false;
		});
	}

	download() {
		const blob = new Blob([this.str], {type: "text/plain;charset=utf-8"});
		saveAs(blob, Table.getSelected().name + '.' + this.type.toLowerCase());
	}
}
