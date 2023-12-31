const localStorageName = "configuration";

interface Config {
	name: string,
	description: string,
	values: any[]
}

export class Configuration {

	name!: string;
	value: any;

	configs: Config[] = [
		{
			name: 'operand',
			description: 'Which operand to use between filter (chips)',
			values: ['AND', 'OR']
		}, {
			name: 'reloadData',
			description: 'Time in second to reload data when activated',
			values: ['3', '5', '15']
		}, {
			name: 'noSqlSample',
			description: 'Sample size to infer NoSQL structure from',
			values: ['50', '200', '500']
		}, {
			name: 'stringifyData',
			description: 'Show data types, null, empty string and empty key',
			values: [false, true]
		}, {
			name: 'autoFormat',
			description: 'Format query when executed',
			values: [true, false]
		}, {
			name: 'statsRefreshRate',
			description: 'Refresh rate of statistics, in seconds',
			values: ['1', '5', '30']
		}, {
			name: 'autoCloseError',
			description: 'Dismiss error when new query succeed',
			values: [true, false]
		}
	];

	constructor() {
		for (const config of this.configs) {
			const value = this.getByName(config.name);
			if (value === undefined) {
				this.update(config.name, config.values[0]);
			}
		}
	}

	getByName(name: string): Configuration | null {
		const configs = JSON.parse(localStorage.getItem(localStorageName) || "[]");

		return configs.find((config: Configuration) => config.name === name);
	}

	update(name: string, value: any) {
		const configs = JSON.parse(localStorage.getItem(localStorageName) || "[]");

		if (!this.getByName(name)) {
			configs.push({name: name, value});
		} else {
			configs[configs.findIndex((conf: Configuration) => conf.name === name)] = {name: name, value};
		}

		localStorage.setItem(localStorageName, JSON.stringify(configs));
	}
}
