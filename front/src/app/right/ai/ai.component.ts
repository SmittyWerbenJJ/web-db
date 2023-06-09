import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Database } from "../../../classes/database";
import { Server } from "../../../classes/server";
import { Licence } from "../../../classes/licence";
import { RequestService } from "../../../shared/request.service";
import { Configuration, OpenAIApi } from "openai";
import { combineLatest, distinctUntilChanged, Subscription } from "rxjs";
import { Configuration as WebConfig } from "../../../classes/configuration";
import { marked } from 'marked';
import { MatSelect } from "@angular/material/select";
import { DrawerService } from "../../../shared/drawer.service";

const localKeyOpenAI = 'openai-key';

enum Role {
	System = 'system',
	User = 'user',
	Assistant = 'assistant',
}

class Msg {
	user!: Role;
	error = false;
	html?: string;
	txt!: string;

	constructor(txt: string, user: Role, error = false) {
		this.txt = txt;
		this.user = user;
		this.error = error;

		const parser = new DOMParser();
		const htmlDoc = parser.parseFromString(marked(txt), 'text/html');
		const pres = htmlDoc.getElementsByTagName('pre');
		for (const pre of pres) {
			const parent = pre.parentNode!;
			const newDiv = document.createElement('div') as HTMLDivElement;
			const code = pre.getElementsByTagName('code')[0];

			newDiv.innerHTML = "<pre><code>" + Server.getSelected()?.driver.highlight(code.outerText)! + "</code></pre>";
			if (user === Role.Assistant) {
				newDiv.innerHTML +=
					`<button
						(click)="sendMessage(getCode(ch.txt));"
						color="primary"
						mat-icon-button>
						<span class="material-symbols-outlined">
							fast_forward
						</span>
						Send result to IA
					</button>

					<button
						(click)="snackBar.open('Copied to clipboard', '╳', {duration: 3000})"
						[cdkCopyToClipboard]="getCode(ch.txt)"
						color="primary"
						mat-icon-button>
						<span class="material-symbols-outlined">
							file_copy
						</span>
						To clipboard
					</button>`;
			}

			parent.replaceChild(pre, newDiv);
		}

		this.html = htmlDoc.body.innerHTML;
	}
}

@Component({
	selector: 'app-ai',
	templateUrl: './ai.component.html',
	styleUrls: ['./ai.component.scss']
})
export class AiComponent implements OnInit, OnDestroy {

	@ViewChild('select') select!: MatSelect;

	selectedServer?: Server;
	selectedDatabase?: Database;
	licence?: Licence;
	obs!: Subscription;
	configuration: WebConfig = new WebConfig();
	initialized = false

	Role = Role;
	examples = [
		'Adapt this query to retrieve "registering_date" : `SELECT email, password FROM users WHERE email LIKE ?`',
		'I need to store a new entity called licence, with "1,1" relation with user, give me the plan to do it',
		'Give me, in SQL, the CRUD queries for user',
		'Explain me the purpose of my database',
		'How to find the last inserted row in Entity Framework ?','Can you optimize : `SELECT * FROM users WHERE email LIKE ?`',
		'Create a trigger checking password strength before inserting',
		'Give me, with Mongoose the listing of all user',
		'Here is, with PDO, the query to insert ... can you help me fixing it'
	]
	changing = false;
	localKeyChatHistory!: string;
	chat: Msg[] = [];
	key?: string;
	openai?: OpenAIApi;
	isLoading = false;
	sample = "";
	preSent: any[] = ['structure', 5];

	constructor(
		private request: RequestService,
		private drawer: DrawerService
	) {
	}

	async ngOnInit() {
		this.selectedDatabase = Database.getSelected();
		this.selectedServer = Server.getSelected();

		this.drawer.drawer.openedChange.subscribe(async (state) => {
			if (state && !this.initialized) {
				this.initialized = true;

				this.obs = combineLatest([this.select.selectionChange, this.request.serverReload]).pipe(
					distinctUntilChanged()
				).subscribe(async (_params) => {
					await this.loadSample();
				});

				await this.loadSample();
			}
		})

		this.localKeyChatHistory = 'chat-' + this.selectedDatabase.name;

		this.licence = await Licence.get(this.request);
		this.initChat();
	}

	async loadSample() {
		this.sample = (await this.request.post('database/sample', {
			preSent: this.preSent,
			language: navigator.language
		}, undefined)).txt;
	}

	ngOnDestroy(): void {
		this.obs.unsubscribe();
	}

	initChat() {
		const msgs = JSON.parse(localStorage.getItem(this.localKeyChatHistory) || '[]');
		this.chat = msgs.map((msg: Msg) => new Msg(msg.txt, msg.user, msg.error));

		this.key = localStorage.getItem(localKeyOpenAI) || '';
		this.changing = !this.key;
		this.openai = new OpenAIApi(new Configuration({
			apiKey: this.key,
		}));
	}

	setKey(key: string) {
		if (!key) {
			return;
		}
		localStorage.setItem(localKeyOpenAI, key);
		this.initChat();
	}

	saveChat() {
		localStorage.setItem(this.localKeyChatHistory, JSON.stringify(this.chat.map(ch => {delete ch.html; return ch;})));
	}

	async sendMessage(txt: string) {
		txt = txt.trim();
		if (!txt) {
			return;
		}

		this.isLoading = true;
		this.chat.push(new Msg(txt, Role.User));
		let message: Msg;

		try {
			const completion = await this.openai!.createChatCompletion({
				model: this.configuration.getByName('openAIModel')?.value,
				messages: [
					{role: Role.System, content: this.sample},
					{role: Role.User, content: txt}
				],
			});
			message = new Msg(completion.data.choices[0].message!.content, Role.Assistant);
		} catch (error: any) {
			message = new Msg(error.response?.data.error.message || 'An error occurred during OpenAI request: ' + error, Role.Assistant, true);
		}

		this.chat.push(message);
		this.saveChat();
		this.isLoading = false;
	}

	//History + stream
}
