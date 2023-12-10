import {join} from "path";
import {promises as fsp} from "fs";
import {URL} from 'url';

export function getDatabase(dbs, dbName) {
	let found = dbs.find(db => db.name === dbName + ", public");
	if (found) {
		return found;
	}

	found = dbs.find(db => db.name === dbName);
	if (found) {
		return found;
	}

	return false;
}

export async function iterateDir(dir) {
	const dirname = new URL('.', import.meta.url).pathname;
	const endpointPath = join(dirname, dir);
	const entries = await fsp.readdir(endpointPath);
	entries.sort((a, b) => {
		return +a.split('-')[0] - +b.split('-')[0];
	});

	return entries.map(entry => join(endpointPath, entry));
}

export async function getScenarios() {
	const files = await iterateDir("scenarios");

	const loaded = [];
	for (const file of files) {
		const test = await import(file);
		if (test.default) {
			loaded.push(test.default);
		}
	}
	return loaded;
}

export async function getTags(docker) {
	const tags = await (await fetch(`https://registry.hub.docker.com/v2/repositories/${docker.name}/tags?page_size=100`)).json();
	let digests = [];
	tags.results.map(tag => {
		if (docker.exclusions && docker.exclusions.find(exclusion => tag.name.indexOf(exclusion) >= 0)) {
			return;
		}
		if (!digests[tag.digest]) {
			digests[tag.digest] = [];
		}
		digests[tag.digest].push(tag.name);
	});

	return Object.values(digests).slice(0, 10).map(values => {
		return values.sort();
	});
}
