//Imports
require('./globals');
const server = require('./server/index');
const components = require('./components/components');
const mods = require('./misc/mods');
const eventEmitter = require('./misc/events');
const animations = require('./config/animations');
const importedBalance = require('./config/balance');
const skins = require('./config/skins');
const factions = require('./config/factions');
const classes = require('./config/spirits');
const spellsConfig = require('./config/spellsConfig');
const spells = require('./config/spells');
const itemTypes = require('./items/config/types');
const salvager = require('./items/salvager');
const recipes = require('./config/recipes/recipes');
const mapManager = require('./world/mapManager');
const profanities = require('./misc/profanities');
const routerConfig = require('./security/routerConfig');
const threadManager = require('./world/threadManager');

//Module
const startup = {
	init: function () {
		io.init(this.onDbReady.bind(this));
	},

	onDbReady: async function () {
		process.on('unhandledRejection', this.onError.bind(this));
		process.on('uncaughtException', this.onError.bind(this));

		await mods.init();

		this.onModsLoaded();
	},

	onModsLoaded: function () {
		animations.init();
		routerConfig.init();
		classes.init();
		spellsConfig.init();
		spells.init();
		recipes.init();
		itemTypes.init();
		salvager.init();
		profanities.init();
		mapManager.init();
		components.init(this.onComponentsReady.bind(this));
	},

	onComponentsReady: async function () {
		skins.init();
		factions.init();

		await clientConfig.init();

		importedBalance.initMainThread();

		await eventEmitter.emit('beforeMainThreadReady');

		await server.init();

		await threadManager.init();
	},

	onError: async function (e) {
		if (e.toString().includes('ERR_IPC_CHANNEL_CLOSED'))
			return;

		_.log('Error Logged: ' + e.toString());
		_.log(e.stack);

		await io.logError({
			sourceModule: 'mainThread',
			sourceMethod: 'general',
			error: e,
			info: {},
			forceCrash: true
		});
	}
};

startup.init();
