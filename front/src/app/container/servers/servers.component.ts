import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";
import { firstValueFrom, Subscription } from "rxjs";
import { Router } from "@angular/router";
import { Server, SSH } from "../../../classes/server";
import { RequestService } from "../../../shared/request.service";
import * as drivers from '../../../classes/drivers';
import { DomSanitizer } from "@angular/platform-browser";
import { MatIconRegistry } from "@angular/material/icon";
import { ServerService } from "../../../shared/server.service";

@Component({
	selector: 'app-servers',
	templateUrl: './servers.component.html',
	styleUrls: ['./servers.component.scss']
})
export class ServersComponent implements OnInit, OnDestroy {

	obs?: Subscription;
	servers: Server[] = [];
	showPassword = false;
	isLoading = true;
	driverNames = Object.keys(drivers);

	constructor(private http: HttpClient,
				private _snackBar: MatSnackBar,
				private router: Router,
				private request: RequestService,
				private serverService: ServerService,
				private domSanitizer: DomSanitizer,
				private matIconRegistry: MatIconRegistry,
				public dialog: MatDialog) {

		for (const driver of this.driverNames) {
			this.matIconRegistry.addSvgIcon(
				driver.toLowerCase(),
				this.domSanitizer.bypassSecurityTrustResourceUrl(`/assets/drivers/${driver.toLowerCase()}.svg`)
			);
		}
	}

	async ngOnInit() {
		await this.reloadList();

		this.obs = this.serverService.scanServer.subscribe((servers => {
			this.servers = servers;
		}))
	}

	ngOnDestroy(): void {
		this.obs?.unsubscribe();
	}

	async reloadList() {
		this.isLoading = true;
		this.filterChanged('');
		await this.serverService.scan();
		this.isLoading = false;
	}

	async postLogged(localServer: Server, remoteServer: Server) {
		Server.add(<Server>{...localServer, ...remoteServer});
		await this.reloadList();
	}

	async guess(srv: Server, user: string, password: string) {
		const indexServer = this.servers.findIndex(server => server.name === srv.name);

		this.servers[indexServer].isLoading = true;
		const server = <Server>{...this.servers[indexServer], user, password};

		const guessed = await firstValueFrom(this.http.post<Server[]>(environment.apiRootUrl + 'server/guess', Server.getShallow(server)))

		if (guessed.length) {
			this._snackBar.open("Combination found : " + guessed.map(guess => `${guess.user} | ${guess.password}`).join(', '), "╳", {duration: 3000})
			await this.postLogged(server, guessed[0]);
		} else {
			this._snackBar.open("Guess Failed", "╳", {duration: 3000})
		}
		this.servers[indexServer].isLoading = false;
	}

	async login(srv: Server, user: string, password: string) {
		const indexServer = this.servers.findIndex(server => server.name === srv.name);

		const server = <Server>{...this.servers[indexServer], user, password};
		const data = await firstValueFrom(this.http.post<any>(environment.apiRootUrl + 'server/connect', Server.getShallow(server)));

		if (data.error) {
			this._snackBar.open(data.error, "╳", {duration: 3000});
			return;
		}
		await this.postLogged(server, data);
	}

	filterChanged(_value = '') {
		const value = _value.toLowerCase();

		for (const [indexServer, server] of this.servers.entries()) {
			const nbDb = 0;
			let oneDisplayed = false

			this.servers[indexServer].hide = server.name.toLowerCase().indexOf(value) === -1;

			if (!server.dbs) {
				continue;
			}

			for (const [indexDatabase, database] of server.dbs.entries()) {

				this.servers[indexServer].dbs[indexDatabase].hide = database.name.toLowerCase().indexOf(value) === -1;
				if (this.servers[indexServer].dbs[indexDatabase].hide) {
					oneDisplayed = true
				}
			}
			this.servers[indexServer].hide = this.servers[indexServer].hide && !oneDisplayed;
		}
	}

	addDatabase(server: Server) {
		const dialogRef = this.dialog.open(CreateDatabaseDialog, {
			data: server,
		});

		dialogRef.afterClosed().subscribe(async result => {
			if (result) {
				await this.reloadList();
			}
		});
	}

	editConnection(server: Server) {
		const dialogRef = this.dialog.open(ConnectionDialog, {
			data: server,
		});

		dialogRef.afterClosed().subscribe(async (result: Server) => {
			if (result) {
				this._snackBar.open(result.name + " Saved", "╳", {duration: 3000});
			}
			await this.reloadList();
		});
	}

	addServer() {
		const dialogRef = this.dialog.open(ConnectionDialog, {
			data: new Server(),
			disableClose: true
		});

		dialogRef.afterClosed().subscribe(async result => {
			if (result) {
				this._snackBar.open(result.name + " Added", "╳", {duration: 3000});
				await this.reloadList();
			}
		});
	}

	getTooltip(server: Server) {
		if (server.connected) {
			return 'Connected';
		}
		if (server.scanned) {
			if (server.stored) {
				return 'Bad credentials';
			}
			return 'Discovered';
		}
		return 'Unreachable';
	}

	getIcon(server: Server) {
		if (server.connected) {
			return 'signal_wifi_4_bar';
		}
		if (server.scanned) {
			if (server.stored) {
				return 'signal_wifi_statusbar_not_connected';
			}
			return 'wifi_find';
		}
		return 'signal_wifi_bad';
	}

	getServerByDriver(driver: string): Server[] {
		return this.servers.filter(server => server.wrapper === driver);
	}
}

@Component({
	templateUrl: 'connection-dialog.html',
})
export class ConnectionDialog {

	pubRsa!: string;
	newConnection = false;
	connected = false;
	sshStatus: 'notConnected' | 'loading' | 'connected' = "notConnected";
	showPassword = false;
	showPasswordSSH = false;
	driverNames = Object.keys(drivers);
	editorOptions = {
		language: 'json'
	};
	params = "{}";

	constructor(
		public snackBar: MatSnackBar,
		private http: HttpClient,
		private dialogRef: MatDialogRef<ConnectionDialog>,
		@Inject(MAT_DIALOG_DATA) public server: Server,
	) {
		this.http.get(environment.rootUrl + 'id_rsa.pub', {responseType: 'text'}).subscribe((res) => {
			this.pubRsa = res;
		});

		this.server.ssh = this.server.ssh || new SSH();
		if (!this.server.wrapper) {
			this.newConnection = true;
		}
		this.params = JSON.stringify(this.server.params, null, "\t");
	}

	changeWrapper(wrapper: string) {
		//@ts-ignore
		this.server.driver = new drivers[wrapper];
		this.server.wrapper = wrapper;
		this.server.params = this.server.driver.defaultParams;
		this.params = JSON.stringify(this.server.params, null, "\t");
	}

	saveParams() {
		this.server.params = JSON.parse(this.params);
	}

	useDefault() {
		this.params = JSON.stringify(this.server.driver.defaultParams, null, "\t");
	}

	async testServer() {
		this.connected = false;
		this.saveParams();
		const data = await firstValueFrom(this.http.post<any>(environment.apiRootUrl + 'server/connect', Server.getShallow(this.server)));

		if (data.error) {
			this.snackBar.open(data.error, "╳", {duration: 3000});
			return;
		}
		this.connected = true;
	}

	async testSSH() {
		this.sshStatus = 'loading';
		this.saveParams();
		const data = await firstValueFrom(this.http.post<any>(environment.apiRootUrl + 'tunnel/test', Server.getShallow(this.server)));

		if (data.error) {
			this.sshStatus = 'notConnected';
			this.snackBar.open(data.error, "╳", {panelClass: 'snack-error'});
			return;
		}
		this.sshStatus = 'connected';
	}

	forget() {
		Server.remove(this.server!.name);
		this.snackBar.open(this.server!.name + " Forgot", "╳", {duration: 3000});
		this.dialogRef.close(false);
	}

	saveConnection() {
		this.saveParams();
		Server.remove(this.server.name);
		this.dialogRef.close(Server.add(this.server));
	}
}

@Component({
	templateUrl: 'create-database-dialog.html',
})
export class CreateDatabaseDialog {

	constructor(
		public dialogRef: MatDialogRef<CreateDatabaseDialog>,
		private request: RequestService,
		private _snackBar: MatSnackBar,
		@Inject(MAT_DIALOG_DATA) public server: Server,
	) {
	}

	async createDb(name: string) {
		await this.request.post('database/create', {name}, undefined, undefined, this.server);
		this.dialogRef.close(name);
	}
}