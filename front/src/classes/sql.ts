import { Driver, QueryParams, TypeName } from "./driver";
import { Column } from "./column";
import { Database } from "./database";
import { Table } from "./table";
import { Server } from "./server";
import { format } from "sql-formatter";
import { highlight } from 'sql-highlight';
import { HistoryService } from "../shared/history.service";
import { Index } from ".";

//import * as monaco from 'monaco-editor'
declare var monaco: any;

const history = new HistoryService();

class TypeData {
	name!: TypeName
	proposition!: string[]
	full!: string[]
}

export class SQL implements Driver {

	nameDel = '"';
	defaultParams = {};
	docUrl = "";
	disclaimerSsh = "";
	extraAttributes: string[] = [];
	canRename = true;
	language = 'sql';
	constraints = [
		'CASCADE',
		'RESTRICT',
		'SET NULL',
		'NO ACTION'
	];
	acceptedExt = [".sql", ".js"];
	availableComparator = [
		{symbol: '>', example: ""},
		{symbol: '<', example: ""},
		{symbol: '>=', example: "0"},
		{symbol: '<=', example: "0"},
		{symbol: '=', example: '"0"'},
		{symbol: '!=', example: "'0'"},
		{symbol: 'IN', example: '("0", "1")'},
		{symbol: 'BETWEEN', example: '"0" AND "1"'},
		{symbol: 'REGEXP', example: '"[a-z]"'},
		{symbol: 'LIKE', example: '"0%"'},
		{symbol: 'NOT IN', example: '("0", "1")'},
		{symbol: 'NOT BETWEEN', example: '"0" AND "1"'},
		{symbol: 'NOT REGEXP', example: '"[a-z]"'},
		{symbol: 'NOT LIKE', example: '"0%"'},
	];
	typesList: TypeData[] = [
		{
			name: TypeName.String,
			proposition: ["varchar(size)"],
			full: ["varchar", 'char', 'binary', 'varbinary'],
		}, {
			name: TypeName.Numeric,
			proposition: ['boolean', 'integer(size)', 'bigint(size)', 'decimal(size)', 'float(size)'],
			full: ['boolean', 'integer', 'bigint', 'decimal', 'float', 'bit', 'double', 'numeric']
		}, {
			name: TypeName.Date,
			proposition: ['date', 'datetime(precision?)', 'timestamp(precision?)', 'time(precision?)'],
			full: ['date', 'datetime', 'timestamp', 'time']
		}, {
			name: TypeName.Other,
			proposition: ['enum("val1", "val2", "val3")', 'json'],
			full: ['enum', 'json']
		}
	];
	keywords = [
		'SELECT',
		'INSERT INTO',
		'DELETE FROM',
		'UPDATE',
		'FROM',
		'WHERE',
		'GROUP BY',
		'HAVING',
		'LIMIT',
		'WITH',
		'AS',
		'ALL',
		'TO',
		'ANY',
		'SOME',
		'UNION',
		'CASE',
		'AND',
		'OR',
		'EXISTS',
		'IS NULL',
		'IS NOT NULL',
		'PRIVILEGES',
		'GRANT',
		'CHARACTER',
		'COLLATION',
		'OPTION',
		'COLLATE',
		'MODIFY',
		'CONVERT',
		'ORDER BY',
		'INNER JOIN',
		'CROSS JOIN',
		'LEFT JOIN',
		'RIGHT JOIN',
		'FULL JOIN',
		'SELF JOIN',
		'NATURAL JOIN',
		'BEGIN',
		'DECLARE',
		'END',
		'FOR EACH ROW',
		'SET',
		'IF',
		'ELSEIF',
		'END IF',
		'DESCRIBE',
		'PRIMARY KEY',
		'FOREIGN KEY',
		'CONSTRAINT',
		'REFERENCES',
		'ON DELETE',
		'ON UPDATE',
	];
	functions = [
		'SUM',
		'MIN',
		'MAX',
		'AVG',
		'COUNT',
		'CONCAT',
		'LENGTH',
		'REPLACE',
		'SUBSTRING',
		'LEFT',
		'RIGHT',
		'REVERSE',
		'TRIM',
		'LTRIM',
		'RTRIM',
		'LPAD',
		'UPPER',
		'LOWER',
		'UCASE',
		'LCASE',
		'LOCATE',
		'REPEAT',
		'INSTR',
		'RAND',
		'ROUND',
		'DATE_FORMAT',
		'DATEDIFF',
		'DAYOFWEEK',
		'MONTH',
		'NOW',
		'TIMEDIFF',
		'TIMESTAMP',
		'YEAR',
		'MD5',
		'CAST',
		'ISNULL',
		'CONVERT',
		'GROUP_CONCAT',
		'WHEN'
	];

	nodeLib = (query: QueryParams) => "";

	highlight(query: string) {
		return highlight(query, {
			html: true,
		})
	}

	format(code: string) {
		code = format(code, {
			language: 'sql',
			useTabs: true,
			keywordCase: "upper"
		});

		return code.replace(/\n/g, " \n");
	}

	extractEnum(col: Column) {
		if (col.type.startsWith("enum(")) {
			return (col.type.match(/\(([^)]+)\)/)![1]).split(',').map(str => str.replace(/['"]+/g, ''));
		}

		return false
	}

	extractConditionParams(query: string): QueryParams {
		const result = <QueryParams>{
			query: query.toLowerCase().replaceAll(/(\r|\n|\r|\t)/gm, " ").replaceAll(/  +/gm, " "),
			params: []
		};
		if (result.query.indexOf("where") < 0) {
			return result;
		}

		const availableComparator = this.availableComparator.map(comp => comp.symbol.toLowerCase()).sort((a, b) => b.length - a.length)
		let condition = result.query.substring(result.query.indexOf("where") + "where".length).trim();

		availableComparator.map(comparator => {
			const nextValue = [
				comparator + " ([(].*?[)])",
				comparator + ` \'(.*?)\'`,
				comparator + ` \"(.*?)\"`,
				comparator + ` ([0-9.]+) `,
			];

			nextValue.map(nextV => {
				const reg = new RegExp(nextV, "g");
				const array = [...condition.matchAll(reg)];

				array.map(match => {
					if (match[1] && match[1].length > 0 && match.index) {
						condition = condition.replaceAll(reg, `${comparator} ?`)
						result.params[match.index] = +match[1] ? match[1] : `"${match[1]}"`;
					}
				});
			});
		});

		result.query = result.query.substring(0, result.query.indexOf("where")) + " WHERE " + condition;
		result.query = "\n" + this.format(result.query);
		result.params = Object.values(result.params);
		return result;
	}

	basicSuggestions() {
		const suggestions: any[] = [];

		this.keywords.map(keyword => {
			suggestions.push({
				label: keyword,
				kind: monaco.languages.CompletionItemKind.Keyword,
				insertText: `${keyword} `
			})
		});

		this.functions.map(fct => {
			suggestions.push({
				label: fct,
				kind: monaco.languages.CompletionItemKind.Module,
				insertText: `${fct}()`
			})
		});

		this.constraints.map(constraint => {
			suggestions.push({
				label: constraint,
				kind: monaco.languages.CompletionItemKind.Function,
				insertText: `${constraint}`
			})
		});

		this.typesList.map(types => {
			types.full.map(type => {
				suggestions.push({
					label: type.toUpperCase(),
					kind: monaco.languages.CompletionItemKind.TypeParameter,
					insertText: `${type.toUpperCase()}`
				})
			})
		});

		this.availableComparator.map(comparator => {
			suggestions.push({
				label: comparator.symbol,
				kind: monaco.languages.CompletionItemKind.Operator,
				insertText: `${comparator.symbol} ${comparator.example}`
			});
		});

		suggestions.push({
			label: `*`,
			kind: monaco.languages.CompletionItemKind.Class,
			insertText: `* `
		});

		return suggestions;
	}

	displayCol(column: Column, indexes: Index[]) {
		const tags = Column.getTags(column, indexes).join(' | ');
		let str = column.type;
		if (tags.length) {
			str += ' | ' + tags;
		}

		return str;
	}

	dotSuggestions(textUntilPosition: string) {
		textUntilPosition = textUntilPosition.trim();

		const space = textUntilPosition.lastIndexOf(' ');
		const tab = textUntilPosition.lastIndexOf('\t');
		const previousToken = textUntilPosition.slice(Math.max(space, tab) + 1).slice(0, -1);
		const suggestions: any[] = [];

		Server.getSelected().dbs.map(db => {
			if (previousToken === db.name.toLowerCase()) {
				db.tables?.map(table => {
					suggestions.push({
						label: `${table.name}`,
						kind: monaco.languages.CompletionItemKind.Struct,
						insertText: `${table.name} `
					});
				});
			}
		});

		if (suggestions.length) {
			return suggestions;
		}

		Database.getSelected()?.tables?.map(table => {
			if (previousToken !== table.name.toLowerCase()) {
				return;
			}

			table.columns.map(column => {
				const indexes = Table.getIndexes(table).filter(index => index.table === table.name && index.columns.indexOf(column.name) >= 0);


				suggestions.push({
					label: `${column.name}`,
					kind: monaco.languages.CompletionItemKind.Class,
					insertText: `${column.name}`,
					detail: this.displayCol(column, indexes)
				});
			})
		});

		return suggestions;
	}

	generateSuggestions(textUntilPosition: string) {
		textUntilPosition = textUntilPosition.toLowerCase();

		if (textUntilPosition.lastIndexOf('.') === textUntilPosition.length - 1) {
			return this.dotSuggestions(textUntilPosition);
		}

		const suggestions = this.basicSuggestions();

		if (Table.getSelected()) {
			Table.getSelected()?.columns.map(column => {
				const indexes = Table.getIndexes().filter(index => index.table === Table.getSelected()?.name && index.columns.indexOf(column.name) >= 0);

				suggestions.push({
					label: `${column.name}`,
					kind: monaco.languages.CompletionItemKind.Class,
					insertText: `${column.name}`,
					detail: this.displayCol(column, indexes)
				});
			});
		} else {
			Server.getSelected()?.dbs.map(db => {
				suggestions.push({
					label: db.name,
					kind: monaco.languages.CompletionItemKind.Module,
					insertText: `${db.name} `
				});

				db.tables?.map(table => {

					suggestions.push({
						label: `${db.name}.${table.name}`,
						kind: monaco.languages.CompletionItemKind.Struct,
						insertText: `${db.name}.${table.name} `
					});

					table.columns.map(column => {
						const indexes = Table.getIndexes(table, db).filter(index => index.table === table.name && index.columns.indexOf(column.name) >= 0);

						suggestions.push({
							label: `${db.name}.${table.name}.${column.name}`,
							kind: monaco.languages.CompletionItemKind.Class,
							insertText: `${db.name}.${table.name}.${column.name}`,
							detail: this.displayCol(column, indexes)
						});
					})
				});
			});
		}

		Database.getSelected()?.tables?.map(table => {
			suggestions.push({
				label: `${table.name}`,
				kind: monaco.languages.CompletionItemKind.Struct,
				insertText: `${table.name} `
			});

			table.columns.map(column => {
				const indexes = Table.getIndexes(table).filter(index => index.table === table.name && index.columns.indexOf(column.name) >= 0);

				suggestions.push({
					label: `${table.name}.${column.name}`,
					kind: monaco.languages.CompletionItemKind.Class,
					insertText: `${table.name}.${column.name}`,
					detail: this.displayCol(column, indexes)
				});
			});
		});

		return this.preselectNext(suggestions, textUntilPosition);
	}

	getLastWord(sentence: string) {
		const n = sentence.trim().split(" ");
		return n[n.length - 1];
	}

	getNextWord(sentence: string) {
		const n = sentence.trim().split(" ");
		if (!n[1]) {
			return false;
		}

		return n[1].replaceAll(/(,|  +)/gm, " ").trim();
	}

	cleanSentence(sentence: string) {
		return sentence.replaceAll(/(\r|\n|\r|\t|,)/gm, " ").replaceAll(/  +/gm, " ");
	}

	preselectNext(suggestions: any[], previousToken: string): any[] {
		if (previousToken.length < 1) {
			return suggestions;
		}

		let tokens: any = [];
		previousToken = this.getLastWord(this.cleanSentence(previousToken));

		const locals = history.getLocal().map(local => local.query.split(";")).flat(1);
		for (const local of locals) {
			const cleaned = this.cleanSentence(local.toLowerCase()).trim();

			const pos = cleaned.indexOf(previousToken);
			if (pos < 0) {
				continue;
			}

			let cutted = cleaned.substring(pos).trim();
			if (previousToken.at(-1) === ' ') {
				cutted = cutted.substring(cutted.indexOf(' ')).trim();
			}

			const next = this.getNextWord(cutted);
			if (!next || next.length < 1) {
				continue;
			}
			tokens[next] = tokens[next] ? tokens[next] + 1 : 1;
		}

		tokens = Object.keys(tokens).sort((a: any, b: any) => tokens[b] - tokens[a]);

		for (const token of tokens) {
			for (const [key, sug] of Object.entries(suggestions)) {
				if (sug.label.toLowerCase() !== token) {
					continue;
				}
				suggestions[<any>key].preselect = true;
				return suggestions;
			}
		}

		return suggestions;
	}
}
