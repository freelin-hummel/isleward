/* eslint-disable no-process-env */

module.exports = {
	version: '0.21.0',
	port: process.env.IWD_PORT || 5000,
	startupMessage: 'Ready: Server',

	nodeEnv: process.env.NODE_ENV,

	//How many miliseconds per tick are we allowed to attempt random map generations
	// We constrain it so that we don't go overboard with using the CPU
	msAllowedPerTickForMapGeneration: 100,

	//UNDO AND RESET TO: process.env.IWD_TEST_UI_AVAILABLE === 'true',
	testUiAvailable: true,

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
