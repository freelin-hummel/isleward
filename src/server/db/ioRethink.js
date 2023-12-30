const serverConfig = require('../config/serverConfig');
const tableNames = require('./tableNames');

const r = require('rethinkdbdash')({
	host: serverConfig.dbHost,
	port: serverConfig.dbPort,
	db: serverConfig.dbName,
	user: serverConfig.dbUser,
	password: serverConfig.dpPass
});

module.exports = {
	staticCon: null,

	init: async function (cbReady) {
		await this.create();

		cbReady();
	},

	create: async function () {
		try {
			await r.dbCreate(serverConfig.dbName).run();
		} catch (e) {

		}

		for (const table of tableNames) {
			try {
				await r.tableCreate(table).run();
			} catch (e) {
				if (!e.message.includes('already exists'))
					_.log(e);
			}
		}
	},

	createTable: async function (tableName) {
		try {
			await r.tableCreate(tableName).run();
		} catch (e) {
			if (!e.message.includes('already exists'))
				_.log(e);
		}
	},

	getAsyncIgnoreCase: async function (table, key) {
		const res = await r.table(table)
			.filter(doc => doc('id').match(`(?i)^${key}$`))
			.run();

		return res[0];
	},

	getAsync: async function ({
		table,
		key,
		isArray,
		noDefault,
		ignoreCase
	}) {
		let res = null;

		if (ignoreCase)
			res = await this.getAsyncIgnoreCase(table, key);
		else {
			res = await r.table(table)
				.get(key)
				.run();
		}

		if (res)
			return res.value;
		else if (isArray && !noDefault)
			return [];

		return res;
	},

	getFilterAsync: async function (
		{ table, noDefault, filter, limit, offset, orderAsc, orderDesc }
	) {
		let res = r
			.table(table)
			.filter(filter);

		if (orderAsc)
			res = res.orderBy(orderAsc);
		if (orderDesc)
			res = res.orderBy(r.desc(orderDesc));
		if (offset)
			res = res.skip(offset);
		if (limit)
			res = res.limit(limit);

		await res.run();

		if (res)
			return res;

		if (!noDefault)
			return [];

		return null;
	},

	getAllAsync: async function ({
		table,
		key,
		isArray,
		noDefault
	}) {
		let res = await r.table(table)
			.run();

		if (res)
			return res;
		else if (isArray && !noDefault)
			return [];

		return res;
	},

	setAsync: async function ({
		table,
		key: id,
		value,
		conflict = 'update'
	}) {
		try {
			await r.table(table)
				.insert({
					id,
					value
				}, {
					conflict
				})
				.run();
		} catch (e) {
			this.logError({
				sourceModule: 'ioRethink',
				sourceMethod: 'setAsync',
				error: e,
				info: {
					table,
					key: id,
					value: JSON.stringify(value)
				}
			});
		}
	},

	setFlat: async function ({
		table,
		value,
		conflict = 'update'
	}) {
		try {
			await r.table(table)
				.insert(value, { conflict })
				.run();
		} catch (e) {
			this.logError({
				sourceModule: 'ioRethink',
				sourceMethod: 'setFlat',
				error: e,
				info: {
					table,
					value: JSON.stringify(value)
				}
			});
		}
	},

	deleteAsync: async function ({
		key,
		table
	}) {
		await r.table(table)
			.get(key)
			.delete()
			.run();
	},

	subscribe: function (table) {
		return r.table(table)
			.changes()
			.run();
	},

	append: async function ({
		table,
		key,
		value,
		field
	}) {
		try {
			await r.table(table)
				.get(key)
				.update(row => {
					return r.branch(
						row('value').typeOf().eq('ARRAY'),
						{
							[field]: row('value').setUnion(value)
						},
						{
							[field]: value
						}
					);
				})
				.run();
		} catch (e) {
			this.logError({
				sourceModule: 'ioRethink',
				sourceMethod: 'append',
				error: e,
				info: {
					table,
					key,
					field,
					value: JSON.stringify(value)
				}
			});
		}
	},

	exists: async function ({
		table,
		key
	}) {
		let res = await r.table(table)
			.get(key)
			.run();

		return !!res;
	},

	logError: async function ({ sourceModule, sourceMethod, error, info }) {
		try {
			await this.setAsync({
				table: 'error',
				value: {
					date: new Date(),
					sourceModule,
					sourceMethod,
					error: error.toString(),
					stack: error.stack.toString(),
					info
				}
			});
		} catch (e) {}

		if (process.send) {
			process.send({
				event: 'onCrashed'
			});
		} else
			process.exit();
	}
};
