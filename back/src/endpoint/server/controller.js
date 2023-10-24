const wrapperModel = require("../../shared/wrapper.js");
const {commonPass, commonUser} = require("../../shared/guess.js");
const http = require("../../shared/http.js");
const subscriptionCtrl = require("../subscription/controller.js");
const fs = require("fs");
const Tunnel = require("../tunnel/controller.js");
const {join} = require("path");
const {unlinkSync} = require("fs");
const version = require("../../shared/version.js");

class Controller {

	async scan(req, res) {
		const promises = [];
		let hosts = ["127.0.0.1", "host.docker.internal"];
		if (process.env.ADD_HOSTS) {
			hosts = hosts.concat(process.env.ADD_HOSTS.split(","));
		}

		for (const wrapper of await wrapperModel.getWrappers()) {
			for (const host of hosts) {
				const driver = new wrapper(undefined, host);
				promises.push(driver.scan());
			}
		}

		res.send((await Promise.all(promises)).filter(prom => prom.length).flat());
	}

	async getStructure(req, res) {
		const driver = await wrapperModel.getDriver(req.body);
		const final = {
			dbs: [],
			indexes: [],
			relations: [],
			complexes: []
		};
		const promises = [
			new Promise(async resolve => {
				const structure = await driver.getDatabases(+req.query.full, +req.query.size);
				let dbLimit = subscriptionCtrl.getLimit();

				for (const str of Object.values(structure)) {
					structure[str.name].system = driver.isSystemDbs(str.name);

					if (!structure[str.name].system && --dbLimit < 0) {
						delete structure[str.name].tables;
					}
					if (structure[str.name].tables) {
						for (const table of Object.values(structure[str.name].tables)) {
							structure[str.name].tables[table.name].columns = Object.values(table.columns);
						}

						structure[str.name].tables = Object.values(str.tables).sort((a, b) => a.name.localeCompare(b.name));
					}
				}
				final.dbs = Object.values(structure).sort((a, b) => a.name.localeCompare(b.name));
				resolve();
			})
		];

		if (+req.query.full) {
			promises.push(
				(final.complexes = await driver.getComplexes()),
				(final.indexes = await driver.getIndexes()),
				(final.relations = await driver.getRelations(final.dbs, +req.query.size))
			);
		}

		await Promise.all(promises);
		res.send(final);
	}

	async load(req, res) {
		const [driver, , , server] = await http.getLoggedDriver(req);
		if (server.ssh) {
			fs.unlinkSync(req.file.path);
			return res.send({error: "While tunneling, native import is not available with WebDB"});
		}

		const result = await driver.load(req.file.path, req.get("Database"), req.file.originalname);

		fs.unlinkSync(req.file.path);
		res.send(result);
	}

	async dump(req, res) {
		const [driver, database, , server] = await http.getLoggedDriver(req);

		if (req.body.exportType.toLowerCase() !== "json" && server.ssh) {
			return res.send({error: "While tunneling, native export is not available with WebDB"});
		}

		const result = await driver.dump(
			database,
			req.body.exportType,
			req.body.tables,
			req.body.includeData,
		);

		version.commandFinished(driver, "update", database);
		setTimeout(() => {
			unlinkSync(join(__dirname, "../../../static/", result.path));
		}, 60 * 1000);

		res.send(result);
	}

	async guess(req, res) {
		let scanned = [];
		const driverClass = await wrapperModel.getDriverClass(req.body.wrapper);
		const driverInstance = new driverClass();
		const users = req.body.user ? [req.body.user] : Array.from(new Set(driverInstance.commonUser.concat(commonUser)));
		const passwords = req.body.password ? [req.body.password] : Array.from(new Set(driverInstance.commonPass.concat(commonPass)));

		for (const user of users) {
			const promise = [];
			for (const password of passwords) {
				const connection = {
					wrapper: req.body.wrapper,
					host: req.body.host,
					port: req.body.port,
					user,
					password,
					params: req.body.params
				};

				promise.push(new Promise(async resolve => {
					const driver = await wrapperModel.getDriver(connection);
					if (!driver.connection.error) {
						resolve(connection);
					}
					resolve();
				}));
			}

			scanned = scanned.concat((await Promise.all(promise)).filter(r => r));
		}

		res.send(scanned);
	}

	async connect(req, res) {
		const driverClass = await wrapperModel.getDriverClass(req.body.wrapper);
		if (!driverClass) {
			return res.send({error: "Driver Not Yet Implemented"});
		}

		try {
			const forwardPort = await Tunnel.handleSsh(req.body, false);
			if (forwardPort) {
				req.body.port = forwardPort;
			}
		} catch (error) {
			return res.send({error: JSON.stringify(error)});
		}

		const driver = new driverClass(req.body.port, req.body.host, req.body.user, req.body.password, req.body.params);
		const connection = await driver.establish();

		res.send(connection?.error ? connection : {...req.body, uri: driver.makeUri()});
	}
}

module.exports = new Controller();
