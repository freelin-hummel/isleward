//Imports
const eventEmitter = require('../misc/events');
const events = require('../events/events');
const herbs = require('../config/herbs');
const map = require('./map');
const messages = require('../misc/messages');
const mods = require('../misc/mods');
const objects = require('../objects/objects');
const physics = require('./physics');
const questBuilder = require('../config/quests/questBuilder');
const resourceSpawner = require('./resourceSpawner');
const scheduler = require('../misc/scheduler');
const serverConfig = require('../config/serverConfig');
const spawners = require('./spawners');
const spellCallbacks = require('../config/spells/spellCallbacks');
const syncer = require('./syncer');
const transactions = require('../security/transactions');

//Own helpers
const { stageZoneIn, unstageZoneIn, clientAck } = require('./instancer/handshakes');

let lastTick;
let tickInterval;

let cbTick;

module.exports = {
	instances: [],
	zoneId: -1,

	//During regens, adds are placed in a queue
	addQueue: [],

	lastTime: 0,

	mapName: null,
	threadArgs: null,

	init: function (args) {
		const { zoneId, zoneName } = args;

		tickInterval = consts.tickTime;

		cbTick = this.tick.bind(this);

		this.zoneName = zoneName;
		this.zoneId = zoneId;

		spellCallbacks.init();
		herbs.init();
		map.init(args);

		const fakeInstance = {
			objects,
			syncer,
			physics,
			zoneId,
			zoneName,
			spawners,
			questBuilder,
			events,
			map,
			scheduler,
			eventEmitter,
			resourceSpawner,
			zoneConfig: map.zoneConfig
		};

		this.instances.push(fakeInstance);

		spawners.init(fakeInstance);
		scheduler.init();

		map.create();
		if (map.mapFile.properties.isRandom) {
			if (!map.oldCollisionMap)
				map.oldCollisionMap = map.collisionMap;

			map.randomMap.init(fakeInstance);
			this.startRegen();
		} else
			_.log(`Ready: ${this.threadArgs.id}`);

		map.clientMap.zoneId = this.zoneId;

		[resourceSpawner, syncer, objects, questBuilder, events].forEach(i => i.init(fakeInstance));

		this.tick();

		this.clientAck = clientAck;
		eventEmitter.on('removeObject', unstageZoneIn);

		eventEmitter.emit('afterZoneReady', this.zoneName);

		process.send({
			method: 'onInitialized'
		});
	},

	startRegen: function (respawnMap, respawnPos) {
		this.addQueue = [];

		this.regenBusy = true;

		this.respawnMap = respawnMap;
		this.respawnPos = respawnPos;
	},

	queueMessage: function (msg) {
		this.unqueueMessage(msg);

		this.addQueue.push(msg);
	},

	unqueueMessage: function (msg) {
		this.addQueue.spliceWhere(q => q.obj.id === msg.obj.id);
	},

	tickRegen: function () {
		const { respawnPos, respawnMap } = this;

		//Ensure that all players are gone
		const players = objects.objects.filter(o => o.player);
		players.forEach(p => {
			if (p.destroyed)
				return;

			p.fireEvent('beforeRezone');
			p.destroyed = true;

			const simpleObj = p.getSimple(true, false, true);

			if (respawnPos) {
				const { x, y } = respawnPos;
				simpleObj.x = x;
				simpleObj.y = y;
			}

			process.send({
				method: 'rezone',
				id: p.serverId,
				args: {
					obj: simpleObj,
					newZone: respawnMap,
					keepPos: true
				}
			});
		});

		//Only objects and syncer should update if there are players
		if (players.length) {
			objects.update();
			syncer.update();

			return;
		}

		//Clear stuff
		spawners.reset();

		objects.objects.length = 0;
		objects.objects = [];

		events.stopAll();

		//Try generating
		const isValid = map.randomMap.generate({
			timeLeftToTryInMs: serverConfig.msAllowedPerTickForMapGeneration
		});

		if (!isValid)
			return;

		map.seed = _.getGuid();

		//If it succeeds, set regenBusy to false and reset vars
		this.regenBusy = false;
		this.respawnPos = null;
		this.respawnMap = null;

		this.addQueue.forEach(q => this.addObject(q));

		this.addQueue = [];

		_.log(`Ready: ${this.threadArgs.id}`);
	},

	tick: function () {
		if (lastTick) {
			const now = Date.now();

			lastTick = now;
		} else
			lastTick = +new Date();

		if (this.regenBusy) {
			this.tickRegen();

			setTimeout(cbTick, tickInterval);

			return;
		}

		events.update();
		objects.update();
		resourceSpawner.update();
		spawners.update();
		syncer.update();
		scheduler.update();
		mods.tick();

		const hastenNextTickByMs = Date.now() - lastTick;

		setTimeout(cbTick, tickInterval - hastenNextTickByMs);
	},

	addObject: function (msg) {
		if (this.regenBusy) {
			this.queueMessage(msg);

			return;
		}

		let obj = msg.obj;
		obj.serverId = obj.id;
		delete obj.id;

		let spawnPos = map.getSpawnPos(obj);
		let spawnEvent = {
			spawnPos: extend({}, spawnPos),
			changed: false
		};
		eventEmitter.emit('onBeforePlayerSpawn', { name: obj.name, instance: { physics } }, spawnEvent);
		//If a player is added, destroy any player objects with the same name
		const existing = objects.filter(o => o.player && o.name === msg.obj.name);
		existing.forEach(o => {
			o.destroyed = true;
		});

		if (spawnEvent.changed)
			msg.keepPos = false;

		if (msg.keepPos && (!physics.isValid(obj.x, obj.y) || !map.canPathFromPos(obj)))
			msg.keepPos = false;

		if (!msg.keepPos || !obj.has('x') || (map.mapFile.properties.isRandom && obj.zoneMapSeed !== map.seed)) {
			obj.x = spawnPos.x;
			obj.y = spawnPos.y;
		}

		if (map.seed)
			obj.zoneMapSeed = map.seed;
		else
			delete obj.zoneMapSeed;

		obj.spawn = map.spawn;

		stageZoneIn(msg);

		process.send({
			method: 'events',
			data: {
				getMap: [{
					obj: map.clientMap,
					to: [obj.serverId]
				}],
				onRemoveAnnouncement: [{
					obj: {
						msg: messages.threads.generatingNewMap
					},
					to: [obj.serverId]
				}]
			}
		});
	},

	//This function fires when the player logs in the first time, not upon rezone
	onAddObject: function (obj) {
		if (obj.player) {
			obj.stats.onLogin();
			eventEmitter.emit('onAfterPlayerEnterZone', obj, { isTransfer: false });
		}

		questBuilder.obtain(obj);
		obj.fireEvent('afterMove');

		if (obj.dead) {
			obj.instance.syncer.queue('onDeath', {
				x: obj.x,
				y: obj.y
			}, [obj.serverId]);
		}
	},

	updateObject: function (msg) {
		let obj = objects.find(o => o.serverId === msg.id);
		if (!obj)
			return;

		let msgObj = msg.obj;

		let components = msgObj.components || [];
		delete msgObj.components;

		for (let p in msgObj) 
			obj[p] = msgObj[p];

		let cLen = components.length;
		for (let i = 0; i < cLen; i++) {
			let c = components[i];
			let component = obj[c.type];
			for (let p in c) 
				component[p] = c[p];
		}
	},

	queueAction: function (msg) {
		let obj = objects.find(o => o.serverId === msg.id);
		if (!obj)
			return;

		obj.queue(msg.action);
	},

	performAction: function (msg) {
		let obj = null;
		let targetId = msg.action.data.targetId;
		if (!targetId)
			obj = objects.find(o => o.serverId === msg.id);
		else {
			obj = objects.find(o => o.id === targetId);
			if (obj) {
				let action = msg.action;
				if (!action.data)
					action.data = {};
				action.data.sourceId = msg.id;
			}
		}

		if (!obj)
			return;

		obj.performAction(msg.action);
	},

	removeObject: async function (msg) {
		if (this.regenBusy) {
			this.unqueueMessage(msg);

			this.resolveCallback(msg);

			return;
		}

		//We fire this event because even though an object might be destroyed already,
		// mods and modules might have staged events/actions we need to clear
		eventEmitter.emit('removeObject', { obj: msg.obj });

		let obj = msg.obj;
		obj = objects.find(o => o.serverId === obj.id);
		if (!obj) {
			//We could reach this if a player dc's while zoning in
			this.resolveCallback(msg);

			return;
		}

		if (obj.auth)
			await obj.auth.doSave();

		if (obj.player) {
			obj.fireEvent('beforeRezone');

			eventEmitter.emit('onAfterPlayerLeaveZone', obj);
		}

		obj.destroyed = true;

		this.resolveCallback(msg);
	},

	notifyOnceIdle: async function () {
		await transactions.returnWhenDone();

		process.send({
			method: 'onZoneIdle'
		});
	},

	forceSavePlayer: async function (msg) {
		const { playerId } = msg;
		const player = objects.objects.find(o => o.serverId === playerId);

		if (!player?.auth) {
			await io.setAsync({
				key: new Date(),
				table: 'error',
				value: 'no auth found for forcesave ' + player?.name
			});

			return;
		}

		await player.auth.doSave();

		this.resolveCallback(msg);
	},

	getPlayerCount: function (msg) {
		this.resolveCallback(msg, {
			result: {
				playerCount: objects.objects.filter(o => o.player !== undefined).length
			}
		});
	},

	resolveCallback: function ({ callbackId }, data) {
		if (!callbackId)
			return;

		const payload = {
			module: 'atlas',
			method: 'resolveCallback',
			msg: {
				id: callbackId
			}
		};

		if (data)
			Object.assign(payload.msg, data);

		process.send(payload);
	}
};
