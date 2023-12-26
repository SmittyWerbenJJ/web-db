const columns01 = {
	sql: [
		{name: "cId", type: "int", nullable: false, defaut: null, extra: []},
		{name: "cName", type: "varchar(200)", nullable: false, defaut: "name", extra: []},
		{name: "cDate", type: "date", nullable: false, defaut: null, extra: []},
		{name: "cBinary", type: "json", nullable: false, defaut: null, extra: []}
	],
	nosql: [
		{name: "cId", type: "Number", nullable: false, defaut: null, extra: []},
		{name: "cName", type: "String", nullable: false, defaut: "name", extra: []},
		{name: "cDate", type: "Date", nullable: false, defaut: null, extra: []},
		{name: "cBinary", type: "Object", nullable: false, defaut: null, extra: []}
	]
}

export const currencyPerContinent = {
	PostgreSQL: "SELECT continent.name AS continent, COUNT(currency.id) AS \"nbCurrencies\" FROM continent LEFT JOIN country ON continent.id = country.continent_id LEFT JOIN currency_country ON country.id = currency_country.id_country LEFT JOIN currency ON currency_country.id_currency = currency.id GROUP BY continent.name ORDER BY continent.name;",
	MySQL: "SELECT continent.name AS continent, COUNT(currency.id) AS \"nbCurrencies\" FROM continent LEFT JOIN country ON continent.id = country.continent_id LEFT JOIN currency_country ON country.id = currency_country.id_country LEFT JOIN currency ON currency_country.id_currency = currency.id GROUP BY continent.name ORDER BY continent.name;",
	MongoDB: "db.collection(\"continent\").aggregate([ { $lookup: { from: \"country\", localField: \"_id\", foreignField: \"continent_id\", as: \"countries\" } }, { $lookup: { from: \"currency_country\", localField: \"countries._id\", foreignField: \"id_country\", as: \"currency_countries\" } }, { $lookup: { from: \"currency\", localField: \"currency_countries.id_currency\", foreignField: \"_id\", as: \"currencies\" } }, { $project: { _id: 0, continent: \"$name\", nbCurrencies: { $size: \"$currencies\" } } }, { $sort: { continent: 1 } } ]).toArray()"
}

export default {
	mysql: {
		internal_port: 3306,
		external_port: 3307,
		columns: columns01.sql,
		docker: {
			name: "library/mysql",
			env: ["MYSQL_ROOT_PASSWORD=notSecureChangeMe"],
			cmd: "mysqld --default-authentication-plugin=mysql_native_password"
		},
		wrapper: "MySQL",
		params: {
			dateStrings: true,
			multipleStatements: true,
			supportBigNumbers: true,
			bigNumberStrings: true
		}
	},
	mariadb: {
		internal_port: 3306,
		external_port: 3308,
		columns: columns01.sql,
		docker: {
			name: "library/mariadb",
			env: ["MYSQL_ROOT_PASSWORD=notSecureChangeMe"],
		},
		wrapper: "MySQL",
		params: {
			dateStrings: true,
			multipleStatements: true,
			supportBigNumbers: true,
			bigNumberStrings: true
		}
	},
	percona: {
		internal_port: 3306,
		external_port: 3309,
		columns: columns01.sql,
		docker: {
			exclusions: ["psmdb-"],
			name: "library/percona",
			env: ["MYSQL_ROOT_PASSWORD=notSecureChangeMe"],
		},
		wrapper: "MySQL",
		params: {
			dateStrings: true,
			multipleStatements: true,
			supportBigNumbers: true,
			bigNumberStrings: true
		}
	},
	mongo: {
		internal_port: 27017,
		external_port: 27017,
		columns: columns01.nosql,
		docker: {
			exclusions: ["windowsservercore", "nanoserver"],
			name: "library/mongo",
			env: ["MONGO_INITDB_ROOT_USERNAME=root", "MONGO_INITDB_ROOT_PASSWORD=notSecureChangeMe"],
		},
		wrapper: "MongoDB",
		params: {
			serverSelectionTimeoutMS: 2000,
			authSource: 'admin'
		}
	},
	postgres: {
		internal_port: 5432,
		external_port: 5432,
		columns: columns01.sql,
		wrapper: "PostgreSQL",
		docker: {
			name: "library/postgres",
			env: ["POSTGRES_USER=root", "POSTGRES_PASSWORD=notSecureChangeMe"]
		},
	},
	cockroachdb: {
		internal_port: 26257,
		external_port: 26257,
		columns: columns01.sql,
		wrapper: "PostgreSQL",
		docker: {
			name: "cockroachdb/cockroach",
			env: ["COCKROACH_USER=root", "COCKROACH_PASSWORD=notSecureChangeMe"],
			cmd: "start-single-node --insecure"
		}
	},
	yugabyte: {
		internal_port: 5433,
		external_port: 5433,
		columns: columns01.sql,
		wrapper: "PostgreSQL",
		docker: {
			name: "yugabytedb/yugabyte",
			env: ["YSQL_USER=root", "YSQL_PASSWORD=notSecureChangeMe"],
			cmd: "bin/yugabyted start --daemon=false"
		}
	}
}


