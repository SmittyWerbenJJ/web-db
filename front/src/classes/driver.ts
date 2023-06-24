import { Column } from "./column";
import { Relation } from "./relation";
import { Table } from "./table";

export interface Comparator {
	symbol: string
	example: string
}

export interface TypeGroup {
	name: TypeName
	proposition: string[];
	full: string[];
}

export enum TypeName {
	'String' = 'String',
	'Numeric' = 'Numeric',
	'Date' = 'Date',
	'Other' = 'Other'
}

export class QueryParams {
	query!: string;
	params: any[] = [];
}

export interface Driver {
	nameDel: string;
	nodeLib: (queryParams: QueryParams) => string;
	availableComparator: Comparator[];
	typesList: TypeGroup[];
	extractEnum: (col: Column) => string[] | false;
	extractConditionParams: (query: string) => QueryParams;
	generateSuggestions: (textUntilPosition: string) => string[];
	keywords: string[];
	functions: {[key: string]: string | null};
	constraints: string[];
	acceptedExt: string[];
	language: string;
	format: (code: string) => string;
	getBaseDelete:(table: Table) => string;
	getBaseUpdate:(table: Table) => string;
	getBaseSelect:(table: Table) => string;
	getBaseInsert:(table: Table) => string;
	getBaseSelectWithRelations:(table: Table, relations: Relation[]) => string;
	canRename: boolean;
	defaultParams: {};
	driverDocumentation: string;
	languageDocumentation: string;
	disclaimerSsh?: string
	extraAttributes: string[];
}
