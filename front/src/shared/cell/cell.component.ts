import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { Table } from "../../classes/table";
import { Relation } from "../../classes/relation";
import { Server } from "../../classes/server";
import { Database } from "../../classes/database";
import helper from "../common-helper.mjs";

@Component({
	selector: 'app-cell',
	templateUrl: './cell.component.html',
	styleUrls: ['./cell.component.scss']
})
export class CellComponent implements OnInit {

	@Input() row!: any;
	@Input() column!: string;
	@Input() stringify = false;

	selectedTable?: Table;
	relations?: Relation[];
	nested = false;
	expand = true;
	fkLink?: string[];

	constructor(
		public ref: ElementRef
	) {
	}

	ngOnInit(): void {
		this.relations = Table.getRelations();
		const fk = this.relations?.find(relation => relation.column_source === this.column);
		this.fkLink = !fk ? undefined : ['/', Server.getSelected().name, Database.getSelected().name, fk.table_dest, 'explore'];

		this.nested = helper.isNested(this.row[this.column]);
		if (this.nested) {
			if (JSON.stringify(this.row[this.column]).length > 70) {
				this.expand = false;
			}
		} else if (this.stringify) {
			this.row[this.column] = JSON.stringify(this.row[this.column]);
		}
	}

	getFkParams() {
		const fk = this.relations?.find(relation => relation.column_source === this.column);

		return {chips: `${fk!.column_dest}='${this.row[this.column]}';`};
	}
}
