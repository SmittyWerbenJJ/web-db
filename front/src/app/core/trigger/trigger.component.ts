import { Component, OnInit } from '@angular/core';
import { Table } from "../../../classes/table";
import { MatSnackBar } from "@angular/material/snack-bar";
import { ActivatedRoute } from "@angular/router";
import { RequestService } from "../../../shared/request.service";
import { Trigger } from "../../../classes/trigger";
import { Server } from "../../../classes/server";
import { addMonacoError, initBaseEditor, isSQL } from "../../../shared/helper";
import helper from "../../../shared/common-helper.mjs";

@Component({
	selector: 'app-trigger',
	templateUrl: './trigger.component.html',
	styleUrls: ['./trigger.component.scss']
})
export class TriggerComponent implements OnInit {

	selectedServer?: Server;
	selectedTable?: Table;
	editors: any[] = [];
	triggers?: Trigger[];
	editorOptions = {
		language: ''
	};
	levels = [
		'strict',
		'moderate',
		'off'
	];
	actions = [
		'error',
		'warn'
	];
	timings = [
		'BEFORE',
		'AFTER'
	];
	events = [
		'INSERT',
		'UPDATE',
		'DELETE'
	];

	protected readonly isSQL = isSQL;

	constructor(
		private snackBar: MatSnackBar,
		private request: RequestService,
		private activatedRoute: ActivatedRoute
	) {
		this.editorOptions.language = Server.getSelected()?.driver.trigger.language!;
	}

	async ngOnInit() {
		this.activatedRoute.parent?.params.subscribe(async (_params) => {
			await this.loadData();
		});
	}

	async loadData() {
		this.selectedTable = Table.getSelected();
		this.selectedServer = Server.getSelected();

		this.triggers = (await this.request.post('trigger/list', undefined)).map((trg: Trigger) => {trg.saved = true; return trg})
	}

	initEditor(editor: any, index: number) {
		this.editors[index] = editor;
	}

	add() {
		this.triggers?.push(new Trigger(
			Server.getSelected()?.driver.trigger.base,
			undefined,
			"trigger_" + this.selectedTable?.name,
			this.timings[0],
			this.events[0],
			this.actions[0],
			this.levels[0]
			));
	}

	async delete(trigger: Trigger, i: number) {
		if (trigger.saved) {
			await this.request.post('trigger/drop', trigger);
		}
		this.triggers?.splice(i);
	}

	async replace(trigger: Trigger, i: number) {
		try {
			await this.request.post('trigger/replace', trigger);
			this.snackBar.open(`Trigger saved`, "╳", {duration: 3000});
		} catch (result: any) {
			addMonacoError(trigger.code, this.editors[i], result.error);
		}
	}

	filterChanged(_value: string) {
		const value = _value.toLowerCase();
		this.triggers = this.triggers?.map(trg => {
			if (trg.name) {
				trg.hide = trg.name.toLowerCase().indexOf(value) < 0 && trg.code.toLowerCase().indexOf(value) < 0;
			} else {
				trg.hide = trg.code.toLowerCase().indexOf(value) < 0;
			}
			return trg;
		});
	}

	nameValid(name: string) {
		if (!name.match(helper.validName)) {
			return false;
		}
		return this.triggers!.filter(trg => trg.name === name).length < 2;
	}

	duplicate(trigger: Trigger) {
		this.triggers?.push({...trigger});
	}
}
