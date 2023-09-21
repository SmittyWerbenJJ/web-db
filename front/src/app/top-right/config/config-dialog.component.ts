import { Component, OnInit } from '@angular/core';
import { Configuration } from "../../../classes/configuration";
import { RequestService } from "../../../shared/request.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Server } from "../../../classes/server";
import { FormControl, Validators } from "@angular/forms";
import { Licence } from "../../../classes/licence";
import { environment } from "../../../environments/environment";
import { MatDialogRef } from "@angular/material/dialog";
import packageJson from '../../../../package.json';
import { firstValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Component({
	templateUrl: './config-dialog.component.html',
	styleUrls: ['./config-dialog.component.scss']
})
export class ConfigDialog implements OnInit {

	upToDate!: boolean;
	configuration: Configuration = new Configuration();
	email = new FormControl('', [Validators.required, Validators.email]);
	licence?: Licence;
	env = environment
	protected readonly packageJson = packageJson;

	constructor(
		public dialogRef: MatDialogRef<ConfigDialog>,
		private snackBar: MatSnackBar,
		private http: HttpClient,
		private request: RequestService
	) {
	}

	async ngOnInit() {
		this.licence = await Licence.get(this.request, false);

		const local = await firstValueFrom(
			this.http.get(`${environment.rootUrl}changelog.html`, {responseType: 'text'})
		);
		const remote = await firstValueFrom(
			this.http.get(`https://demo.webdb.app/changelog.html`, {responseType: 'text'})
		);
		this.upToDate = local.length >= remote.length;
	}

	async save(email: string) {
		try {
			await this.request.post('subscription/save', {email});
			this.snackBar.open(`You successfully register this account. Thanks you =)`, "╳", {duration: 3000});
			await this.ngOnInit();

			if (Server.getSelected()) {
				await this.request.reloadServer();
			}
		} catch (err: any) {
			this.snackBar.open("Error : " + err.error + ". You can contact us at: main.webdb@gmail.com", "╳", {panelClass: 'snack-error'});
		}
	}

	async update(name: string, value: string) {
		this.configuration.update(name, value);
		if (Server.getSelected()) {
			await this.request.reloadServer();
		}
	}
}
