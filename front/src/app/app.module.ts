import { ErrorHandler, NgModule, Provider } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from "./app-routing.module";
import { ContainerComponent } from './container/container.component';
import { MatCardModule } from "@angular/material/card";
import { FlexModule } from "@angular/flex-layout";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatMenuModule } from "@angular/material/menu";
import { MatDividerModule } from "@angular/material/divider";
import { MatSidenavModule } from "@angular/material/sidenav";
import { ConnectionComponent, CreateDatabaseDialog } from "./connection/connection.component";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatListModule } from "@angular/material/list";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSelectModule } from "@angular/material/select";
import { HttpClientModule } from "@angular/common/http";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MonacoEditorModule, NgxMonacoEditorConfig } from "ngx-monaco-editor-v2";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatStepperModule } from "@angular/material/stepper";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { HIGHLIGHT_OPTIONS, HighlightModule, HighlightOptions, } from 'ngx-highlightjs';
import { Server } from "../classes/server";
import { MatTabsModule } from "@angular/material/tabs";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { CreateTableDialog, TablesComponent } from "./tables/tables.component";
import { ConfigDialog } from "./top-right/config/config-dialog.component";
import { SharedModule } from "../shared/shared.module";
import { LogsDialog, TopRightComponent } from './top-right/top-right.component';
import { createErrorHandler } from "@sentry/angular-ivy";
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { MatCheckboxModule } from "@angular/material/checkbox";
import { EditConnectionComponent } from './connection/edit-connection/edit-connection.component';

const providers: Provider[] = [
	{
		provide: HIGHLIGHT_OPTIONS,
		useValue: <HighlightOptions>{
			lineNumbers: true,
			// @ts-ignore
			lineNumbersLoader: () => import('highlightjs-line-numbers.js'),
			fullLibraryLoader: () => import('highlight.js'),
		}
	}
];
if (environment.production) {
	providers.push({
		provide: ErrorHandler,
		useValue: createErrorHandler({
			showDialog: false,
		}),
	});
}

declare var monaco: any;

export const monacoConfig: NgxMonacoEditorConfig = {
	defaultOptions: {
		padding: {top: 10},
		minimap: {enabled: false},
		theme: 'vs-dark',
		automaticLayout: true,
		fixedOverflowWidgets: true,
		tabSize: 4
	}, onMonacoLoad: () => {
		monaco.languages.registerDocumentFormattingEditProvider('sql', {
			provideDocumentFormattingEdits(model: any, options: any) {
				return [
					{
						range: model.getFullModelRange(),
						text: Server.getSelected().driver.format!(model.getValue())
					}
				];
			},
		});
		monaco.languages.registerCompletionItemProvider('sql', {
			triggerCharacters: [".", '"', "'", '`', '(', '{', '['],
			provideCompletionItems: (model: any, position: any) => {
				const textUntilPosition = model.getValueInRange({
					startLineNumber: position.lineNumber,
					startColumn: 0,
					endLineNumber: position.lineNumber,
					endColumn: position.column,
				});

				return {
					suggestions: Server.getSelected().driver.generateSuggestions!(textUntilPosition)
				};
			}
		});
	}
};

@NgModule({
	declarations: [
		AppComponent,
		ContainerComponent,
		ConnectionComponent,
		ConfigDialog,
		LogsDialog,
		CreateDatabaseDialog,
		TablesComponent,
		CreateTableDialog,
  		TopRightComponent,
    	EditConnectionComponent,
	],
    imports: [
        AppRoutingModule,
        BrowserModule,
        BrowserAnimationsModule,
        MonacoEditorModule.forRoot(monacoConfig),
        MatCardModule,
        FlexModule,
        HighlightModule,
        MatToolbarModule,
        MatButtonModule,
        MatSidenavModule,
        MatTooltipModule,
        MatMenuModule,
        MatIconModule,
        MatDividerModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatListModule,
        MatExpansionModule,
        MatProgressBarModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSelectModule,
        HttpClientModule,
        MatSnackBarModule,
        MatSlideToggleModule,
        FormsModule,
        MonacoEditorModule,
        MatButtonToggleModule,
        MatStepperModule,
        ClipboardModule,
        MatTabsModule,
        DragDropModule,
        SharedModule,
        ServiceWorkerModule.register('ngsw-worker.js', {
            enabled: environment.production,
            registrationStrategy: 'registerWhenStable:30000'
        }),
        MatCheckboxModule
    ],
	providers,
	bootstrap: [AppComponent]
})
export class AppModule {
}
