import assert from 'node:assert';
import axios from "axios";
import {test} from "node:test";
import {getDatabase} from "../helper.js";

async function run(config) {
	const created = await axios.post(`${config.api}database/create`, {name: config.database});
	const result_created = created.status === 200 && !created.data.error;
	await test('[database] Creation ok', () => {
		assert.ok(result_created);
	});
	if (!result_created) {
		throw new Error();
	}

	const structure = await axios.post(`${config.api}server/structure?full=0&size=50`, config.credentials);
	const result_structure = getDatabase(structure.data.dbs, config.database);
	await test('[database] Created is present in structure', () => {
		assert.ok(result_structure);
	});
	if (!result_structure) {
		throw new Error();
	}
}
/*
import {loadConfig} from "../config.js";
import servers from "../servers.js";
await run(await loadConfig(servers.postgres));
*/
export default run;
