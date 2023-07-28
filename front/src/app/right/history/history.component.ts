import { Component, OnInit } from '@angular/core';
import { Server } from "../../../classes/server";
import { HistoryService, Query } from "../../../shared/history.service";
import { Configuration } from "../../../classes/configuration";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DrawerService } from "../../../shared/drawer.service";
import { Router } from "@angular/router";
import { Table } from "../../../classes/table";
import { Database } from "../../../classes/database";

@Component({
	selector: 'app-history',
	templateUrl: './history.component.html',
	styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

	configuration: Configuration = new Configuration();
	selectedServer!: Server;
	queryHistory: Query[] = [];
	filter = "";
	sort: 'time' | 'occurrence' = 'time';

	constructor(
		public history: HistoryService,
		public snackBar: MatSnackBar,
		private drawer: DrawerService,
		private router: Router,
	) {
		this.drawer.drawer.openedChange.subscribe((state) => {
			this.queryHistory = this.history.getLocal();
		});
	}

	ngOnInit() {
		this.selectedServer = Server.getSelected();
	}

	changeStar(query: Query) {
		query.star = !query.star;
		this.history.saveLocal(this.queryHistory);
	}

	goToQuery(query: string) {
		this.router.navigate([Server.getSelected().name, Database.getSelected().name, Table.getSelected().name, 'query', query]);
		this.drawer.toggle();
	}

	sortHistory() {
		return (a: Query, b: Query) => {
			if (a.star) {
				return -1;
			}
			if (b.star) {
				return 1;
			}

			if (this.sort === 'time') {
				return b.date - a.date;
			}
			return b.occurrence - a.occurrence;
		};
	}

	remove(his: Query) {
		this.queryHistory.splice(this.queryHistory.findIndex(query => query.query === his.query), 1);
		this.history.saveLocal(this.queryHistory);
	}
}
