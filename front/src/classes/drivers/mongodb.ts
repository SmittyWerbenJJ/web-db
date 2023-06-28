import { Driver, QueryParams, TypeName } from "../driver";
import { Column } from "../column";
import { Table } from "../table";
import { Relation } from "../relation";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";

declare var monaco: any;

export class MongoDB implements Driver {

	defaultParams = {
		serverSelectionTimeoutMS: 2000
	};

	languageDocumentation = "https://www.mongodb.com/docs/drivers/node/current/quick-reference/";
	nameDel = '"';
	driverDocumentation = "https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/";
	extraAttributes: string[] = [];
	language = 'javascript';
	canRename = true;
	constraints = [];
	availableComparator = [
		{symbol: '$gt', example: "", definition: "More than"},
		{symbol: '$lt', example: "", definition: "Less than"},
		{symbol: '$gte', example: "0", definition: "More or equal than"},
		{symbol: '$lte', example: "0", definition: "Less or equal than"},
		{symbol: '$eq', example: '"0"', definition: "Strictly equal to"},
		{symbol: '$ne', example: "'0'", definition: "Strictly different to"},
		{symbol: '$in', example: '("0", "1")', definition: "Is in array of"},
		{symbol: '$all', example: '("0", "1")', definition: "If the array contains all elements"},
		{symbol: '$range', example: '"0" AND "1"', definition: "If in the range of"},
		{symbol: '$regexMatch', example: '"[a-z]"', definition: "If match regex"},
		{symbol: '$text', example: '"0%"', definition: "Search text"},
		{symbol: '$nin', example: '("0", "1")', definition: "Is not in array of"},
	];
	typesList = [
		{
			name: TypeName.String,
			proposition: ["varchar(size)", 'longtext', 'longblob'],
			full: ["varchar", 'longtext', 'longblob', 'char', 'binary', 'varbinary', 'blob', 'text', 'mediumblob', 'tinyblob', 'mediumtext', 'tinytext'],
		}
	];
	acceptedExt = ['.csv', '.tsv'];
	functions = {};
	keywords = [];
	defaultFilter = "$eq";

	nodeLib = (query: QueryParams) => "";

	async loadExtraLib(http: HttpClient) {
		for (const path of ['mongo.d.ts', 'bson.d.ts']) {
			if (monaco.languages.typescript.typescriptDefaults._extraLibs[`file://${path}`]) {
				continue;
			}

			const lib = await firstValueFrom(http.get('assets/libs/' + path, {responseType: 'text' as 'json'}))
			monaco.languages.typescript.javascriptDefaults.addExtraLib(
				`declare module '${path}' { ${lib} }; `,
				`file://${path}`
			);
		}
		monaco.languages.typescript.javascriptDefaults.addExtraLib(
			`import * as bsonModule from "bson.d.ts";
			import * as mongoModule from "mongo.d.ts";

			declare global {
				var mongo: typeof mongoModule;
				var bson: typeof bsonModule;
				var db: mongoModule.Db;
			}`,
			`file:///main.tsx`
		);
	}

	extractEnum(col: Column): string[] | false {
		return false;
	}

	generateSuggestions(textUntilPosition: string): string[] {
		return [];
	}

	format(code: string): string {
		return code;
	}

	extractConditionParams(query: string): QueryParams {
		return <QueryParams>{
			query
		};
	}

	getBaseDelete(table: Table) {
		const cols = table.columns?.map(column => `${column.name}: ""`);
		return `db.collection("${table.name}").deleteOne({${cols.join(", ")}})`;
	}

	getBaseInsert(table: Table) {
		const cols = table.columns?.map(column => `${column.name}: ""`);
		return `db.collection("${table.name}").insertOne({${cols.join(", ")}})`;
	}

	getBaseUpdate(table: Table) {
		const cols = table.columns?.map(column => `${column.name}: ""`);
		return `db.collection("${table.name}").updateOne({${cols.join(", ")}})`;
	}

	getBaseSelect(table: Table) {
		return `db.collection("${table.name}").find({}).toArray()`;
	}

	getBaseSelectWithRelations(table: Table, relations: Relation[]) {
		const columns = table.columns?.map(column => `${table.name}.${column.name}`).join(', ');

		const joins: string[] = [];
		for (const relation of relations) {
			joins.push(`INNER JOIN ${relation.table_dest} ON ${relation.table_dest}.${relation.column_dest} = ${relation.table_source}.${relation.column_source}`)
		}

		return `SELECT ${columns} FROM ${table.name} ${joins.join("\n")} GROUP BY ${columns} HAVING 1 = 1`;
	}

	getBaseFilter(table: Table, conditions: string[], operand: 'AND' | 'OR') {
		const cond = conditions.map(condition => {
			const obj: any = {};
			const key = condition.substring(0, condition.indexOf("$") - 1).trim();
			condition = condition.substring(condition.indexOf("$"));
			const operator = condition.substring(0, condition.indexOf(" ")).trim();
			condition = condition.substring(condition.indexOf(" "));

			obj[key] = {};
			obj[key][operator] = condition.substring(condition.indexOf(":") + 1).trim();
			return obj;
		});

		const filter = conditions.length > 0 ? JSON.stringify({[`$${operand.toLowerCase()}`]: cond}) : '';
		return `db.collection("${table.name}").find(${filter})`;
	}

	getBaseSort(field: string, direction: 'asc' | 'desc') {
		return `.sort({${field}: ${direction === "asc" ? 1 : -1}})`;
	}
}
