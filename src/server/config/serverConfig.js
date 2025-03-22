/* eslint-disable no-process-env */

module.exports = {
	version: '0.18.0',
	port: process.env.IWD_PORT || 4000,
	startupMessage: 'Ready: Server',

	nodeEnv: process.env.NODE_ENV,

	testUiAvailable: process.env.TEST_UI_AVAILABLE === 'true',

	//Options:
	// sqlite
	// rethink
	db: process.env.IWD_DB || 'rethink',
	dbHost: process.env.IWD_DB_HOST || 'localhost',
	dbPort: process.env.IWD_DB_PORT || 28015,
	dbName: process.env.IWD_DB_NAME || 'live',
	dbUser: process.env.IWD_DB_USER || 'admin',
	dbPass: process.env.IWD_DB_PASS || ''
};
