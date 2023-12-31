import wrapperModel from "./wrapper.js";

class Http {

	async getLoggedDriver(req) {
		const server = JSON.parse(req.get("Server"));
		const driver = await wrapperModel.getDriver(server);

		return [driver, req.get("Database"), req.get("Table"), JSON.parse(req.get("Server"))];
	}
}

export default new Http();
