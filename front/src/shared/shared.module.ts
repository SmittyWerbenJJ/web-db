import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundPipe } from "./round.pipe";
import { BooleanPipe } from "./boolean.pipe";
import { CellComponent } from './cell/cell.component';
import { NgxJsonViewerModule } from "ngx-json-viewer";
import { RouterLinkWithHref } from "@angular/router";
import { UpdateDataDialog } from './update-data-dialog/update-data-dialog';
import { FlexModule } from "@angular/flex-layout";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatOptionModule } from "@angular/material/core";
import { MonacoEditorModule } from "ngx-monaco-editor-v2";
import { ClipboardModule } from "@angular/cdk/clipboard";
import { FormsModule } from "@angular/forms";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { ExportResultDialog } from './export-result-dialog/export-result-dialog';
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatSelectModule } from "@angular/material/select";
import { BatchUpdateDialog } from "./batch-update-dialog/batch-update-dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatProgressBarModule } from "@angular/material/progress-bar";

@NgModule({
	declarations: [
		RoundPipe,
		BooleanPipe,
		CellComponent,
		UpdateDataDialog,
		ExportResultDialog,
		BatchUpdateDialog
	],
	exports: [
		RoundPipe,
		BooleanPipe,
		CellComponent,
		UpdateDataDialog,
		ExportResultDialog,
		BatchUpdateDialog
	],
	imports: [
		CommonModule,
		NgxJsonViewerModule,
		RouterLinkWithHref,
		FlexModule,
		MatAutocompleteModule,
		MatButtonModule,
		MatDialogModule,
		MatFormFieldModule,
		MatIconModule,
		MatInputModule,
		MatOptionModule,
		MonacoEditorModule,
		ClipboardModule,
		FormsModule,
		DragDropModule,
		MatButtonToggleModule,
		MatSelectModule,
		MatProgressSpinnerModule,
		MatProgressBarModule,
	]
})
export class SharedModule {
}
