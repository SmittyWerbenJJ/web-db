import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { environment } from "../environments/environment";
import { Database } from "../classes/database";
import { Server } from "../classes/server";
import { Table } from "../classes/table";
import { MatSnackBar } from "@angular/material/snack-bar";
import * as drivers from "../classes/drivers";

@Injectable({
	providedIn: 'root'
})
export class RequestService {

	private loadingSubject = new BehaviorSubject(0);
	loadingServer = this.loadingSubject.asObservable();

	constructor(
		private http: HttpClient,
		private snackBar: MatSnackBar,
	) {
	}

	async post(url: string, data: any,
			   table = Table.getSelected(),
			   database = Database.getSelected(),
			   server = Server.getSelected(),
			   headers = new HttpHeaders(),
			   snackError = true) {
		const shallow = Server.getShallow(server);

		headers = headers.set('Server', JSON.stringify(shallow));
		if (table) {
			headers = headers.set('Table', table.name)
		}
		if (database) {
			headers = headers.set('Database', database.name)
		}

		const result = await firstValueFrom(this.http.post<any>(
			environment.apiRootUrl + url, data, {headers}
		));
		if (snackError && result.error) {
			this.snackBar.open(result.error, "╳", {panelClass: 'snack-error'});
			throw new HttpErrorResponse({statusText: result.error});
		}

		return result;
	}

	async connectServers(servers: Server[], full = true) {
		const toLoad = [];

		for (let server of servers) {
		// @ts-ignore
		server.driver = new drivers[server.wrapper];
		server.params = server.params || server.driver.connection.defaultParams;

		const connect = await firstValueFrom(this.http.post<any>(environment.apiRootUrl + 'server/connect', Server.getShallow(server)));

			server.connected = !connect.error;
			toLoad.push(server);
		}

		return await this.loadServers(toLoad, full, false);
	}

	async loadServers(servers: Server[], full: boolean, reloadPage: boolean) {
		let loading = reloadPage ? 0 : 1;
		this.loadingSubject.next(loading);

		const promises = [];
		for (const server of servers) {
			if (!server.connected) {
				continue;
			}
			promises.push(
				new Promise(async resolve => {
					const res = await firstValueFrom(this.http.post<Database[]>(environment.apiRootUrl + `server/structure?full=${full}`, Server.getShallow(server)));
					this.loadingSubject.next(loading += 100 / servers.length);

					resolve({...server, ...res});
				})
			);
		}
		servers = <Server[]>(await Promise.all(promises));

		this.loadingSubject.next(100);
		return servers;
	}

	async reloadServer(reloadPage = true, server = Server.getSelected()) {
		server = (await this.loadServers([server], true, reloadPage))[0];
		if (server.name !== Server.getSelected()?.name) {
			return server;
		}

		Database.reload(server.dbs);
		Table.reload(Database.getSelected());

		return server;
	}
}
