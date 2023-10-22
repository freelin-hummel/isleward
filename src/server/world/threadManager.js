//System Imports
const childProcess = require('child_process');

//Imports
const objects = require('../objects/objects');
const connections = require('../security/connections');
const { mapList } = require('./mapManager');
const { registerCallback } = require('./atlas/registerCallback');

//Internals
const threads = [];
const listenersOnZoneIdle = [];

//Helpers
const getThreadFromName = name => {
	return threads.find(t => t.name === name);
};

const getThreadFromId = threadId => {
	return threads.find(t => t.id === threadId);
};

const getPlayerCountInThread = async thread => {
	const { playerCount } = await new Promise(res => {
		const cb = registerCallback(res);

		thread.worker.send({
			method: 'getPlayerCount',
			args: {
				callbackId: cb
			}
		});
	});

	return playerCount;
};

const messageHandlers = {
	onReady: function (thread) {
		thread.worker.send({
			method: 'init',
			args: {
				zoneName: thread.name,
				zoneId: thread.id,
				path: thread.path
			}
		});
	},

	onInitialized: function (thread) {
		thread.isReady = true;

		thread.cbOnInitialized(thread);
		delete thread.cbOnInitialized;
		delete thread.promise;
	},

	event: function (thread, message) {
		objects.sendEvent(message, thread);
	},

	events: function (thread, message) {
		objects.sendEvents(message, thread);
	},

	object: function (thread, message) {
		objects.updateObject(message);
	},

	track: function (thread, message) {
		let player = objects.objects.find(o => o.id === message.serverId);
		if (!player)
			return;

		player.auth.gaTracker.track(message.obj);
	},

	callDifferentThread: function (thread, message) {
		let obj = connections.players.find(p => (p.name === message.playerName));
		if (!obj)
			return;

		let newThread = getThreadFromName(obj.zoneName);
		if (!newThread)
			return;

		newThread.worker.send({
			module: message.data.module,
			method: message.data.method,
			args: message.data.args
		});
	},

	rezone: async function (thread, message) {
		const { args: { obj, newZone, keepPos = true } } = message;

		if (thread.instanced && (await getPlayerCountInThread(thread)) === 0) {
			thread.worker.kill();
			threads.spliceWhere(t => t === thread);
		}

		//When messages are sent from map threads, they have an id (id of the object in the map thread)
		// as well as a serverId (id of the object in the main thread)
		const serverId = obj.serverId;
		obj.id = serverId;
		obj.destroyed = false;

		const serverObj = objects.objects.find(o => o.id === obj.id);
		const mapExists = mapList.some(m => m.name === newZone);

		if (mapExists) {
			serverObj.zoneName = newZone;
			obj.zoneName = newZone;
		} else {
			obj.zoneName = clientConfig.config.defaultZone;
			serverObj.zoneName = clientConfig.config.defaultZone;
		}

		delete serverObj.zoneId;
		delete obj.zoneId;

		const isRezone = true;
		await atlas.addObject(obj, keepPos, isRezone);
	},

	onZoneIdle: function (thread) {
		listenersOnZoneIdle.forEach(l => l(thread));
	}
};

const onMessage = (thread, message) => {
	if (message.module) {
		try {
			global[message.module][message.method](message);
		} catch (e) {
			/* eslint-disable-next-line no-console */
			console.log('No global method found', message.module, message.method);
			process.exit();
		}
	} else if (message.event === 'onCrashed') {
		thread.worker.kill();
		process.exit();
	} else
		messageHandlers[message.method](thread, message);
};

const spawnThread = async ({ name, path, instanced }) => {
	let cbOnInitialized;

	const promise = new Promise(resolveOnReady => {
		cbOnInitialized = resolveOnReady;
	});

	const worker = childProcess.fork('./world/worker', [name]);

	const id = instanced ? _.getGuid() : name;

	const thread = {
		id,
		name,
		instanced,
		path,
		worker,
		isReady: false,
		promise,
		cbOnInitialized
	};

	worker.on('message', onMessage.bind(null, thread));

	threads.push(thread);

	return promise;
};

const doesThreadExist = ({ zoneName, zoneId }) => {
	let map = mapList.find(m => m.name === zoneName);

	if (!map)
		map = mapList.find(m => m.name === clientConfig.config.defaultZone);

	const exists = threads.some(t => t.id === zoneId && t.name === zoneName);

	if (exists)
		return true;

	if (map.instanced)
		return false;

	const thread = getThreadFromName(map.name);

	return !!thread;
};

const getThread = async ({ zoneName, zoneId }) => {
	const result = {
		resetObjPosition: false,
		thread: null
	};

	let map = mapList.find(m => m.name === zoneName);

	if (!map) 
		map = mapList.find(m => m.name === clientConfig.config.defaultZone);

	let thread = threads.find(t => t.id === zoneId && t.name === zoneName);

	if (!thread) {
		if (map.instanced) {
			result.resetObjPosition = true;

			thread = await spawnThread(map);
		} else
			thread = getThreadFromName(map.name);
	}

	if (!thread.isReady)
		await thread.promise;

	result.thread = thread;

	return result;
};

const killThread = thread => {
	thread.worker.kill();
	threads.spliceWhere(t => t === thread);
};

const killThreadIfEmpty = async thread => {
	const playerCount = await getPlayerCountInThread(thread);

	if (playerCount === 0)
		killThread(thread);
};

const spawnMapThreads = async () => {
	const promises = mapList
		.filter(m => !m.disabled && !m.instanced)
		.map(m => spawnThread(m));

	await Promise.all(promises);
};

const sendMessageToThread = ({ threadId, msg }) => {
	const thread = threads.find(t => t.id === threadId);
	if (thread)
		thread.worker.send(msg);
};

const messageAllThreads = message => {
	threads.forEach(t => t.worker.send(message));
};

const returnWhenThreadsIdle = async () => {
	return new Promise(res => {
		let doneCount = 0;

		const onZoneIdle = thread => {
			doneCount++;

			if (doneCount.length < threads.length)
				return;

			listenersOnZoneIdle.spliceWhere(l => l === onZoneIdle);
			res();
		};

		listenersOnZoneIdle.push(onZoneIdle);

		threads.forEach(t => {
			t.worker.send({
				method: 'notifyOnceIdle'
			});
		});
	});
};

//Exports
module.exports = {
	getThread,
	killThread,
	getThreadFromId,
	doesThreadExist,
	spawnMapThreads,
	messageAllThreads,
	killThreadIfEmpty,
	sendMessageToThread,
	returnWhenThreadsIdle,
	getPlayerCountInThread
};
