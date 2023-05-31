import { NgModule } from '@angular/core';
import { CodeComponent, ExportQueryDialog, ExportResultDialog } from "./code.component";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { MatOptionModule } from "@angular/material/core";
import { MatSelectModule } from "@angular/material/select";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatTableModule } from "@angular/material/table";
import { FlexModule } from "@angular/flex-layout";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { MatDividerModule } from "@angular/material/divider";
import { MonacoEditorModule, NgxMonacoEditorConfig } from "ngx-monaco-editor-v2";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { Server } from "../../classes/server";
import * as drivers from '../../classes/drivers';
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatTooltipModule } from "@angular/material/tooltip";
import { NgxJsonViewerModule } from "ngx-json-viewer";
import { MatToolbarModule } from "@angular/material/toolbar";

declare var monaco: any;

export const monacoConfig: NgxMonacoEditorConfig = {
	defaultOptions: {
		padding: {top: 10},
		minimap: {enabled: false},
		theme: 'vs-dark',
		automaticLayout: true
	}, onMonacoLoad: () => {
		const languages = [];
		const onlyUnique = (value: any, index: any, array: string | any[]) => {
			return array.indexOf(value) === index;
		}

		for (const key of Object.keys(drivers)) {
			// @ts-ignore
			languages.push((new drivers[key]).language);
		}

		languages.filter(onlyUnique).map(language => {
			monaco.languages.registerCompletionItemProvider(language, {
				triggerCharacters: ["."],
				provideCompletionItems: (model: any, position: any) => {
					const textUntilPosition = model.getValueInRange({
						startLineNumber: position.lineNumber,
						startColumn: 0,
						endLineNumber: position.lineNumber,
						endColumn: position.column,
					});

					return {
						suggestions: Server.getSelected()!.driver.generateSuggestions(textUntilPosition)
					};
				}
			});
		});
	}
};

@NgModule({
	declarations: [
		CodeComponent,
		ExportQueryDialog,
		ExportResultDialog
	],
	exports: [
		CodeComponent
	],
	imports: [
		MonacoEditorModule.forRoot(monacoConfig),
		ClipboardModule,
		MatDialogModule,
		MatButtonModule,
		MatOptionModule,
		MatSelectModule,
		MatPaginatorModule,
		MatTableModule,
		FlexModule,
		MatProgressBarModule,
		FormsModule,
		CommonModule,
		MatMenuModule,
		MatIconModule,
		MatDividerModule,
		MatSlideToggleModule,
		MatButtonToggleModule,
		MatTooltipModule,
		NgxJsonViewerModule,
		MatToolbarModule
	]
})
export class CodeModule {
}