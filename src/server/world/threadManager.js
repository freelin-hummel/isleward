/*
	This module contains an array of all threads. Each thread looks like this:

	{
		id: 'The equals the map name unless the map is instanced, in which case it will be a GUID. Mods may also override this',
		name: 'The name of the map',
		instanced: 'Boolean value indicating whether the thread is instanced or not',
		path: 'The path to the map file',
		worker: 'The actual thread that has been spawned',
		isReady: 'Boolean value that turns from false to true as soon as the thread is ready to accept players',
		promise: 'Used by the getThread method to wait for the thread to be ready, so it can be sent to the atlas',
		cbOnInitialized: 'The promise resolver',
		players: 'An array of all player id's that have been in this thread',
		playersCurrent: 'An array of player id's that are currently in this thread',
		birthEpoch: 'Defines the epoch when this was created',
		destroyWhenEmptyForMs: 'If not equal to -1, defines whether the thread should be destroyed if it has been empty for this amount of milliseconds',
		emptySinceEpoch: 'An epoch of when the thread became empty, or null if not empty',
		preConfig: 'An object containing extra values to be sent to the thread. These can be accessed though instancer.threadArgs.preConfig',
		sendArgsToWorker: 'An array of keys (existing on this thread obj) that will be sent to the thread. These can be access through instancer.threadArgs',
		workerArgs: 'An object defining the threadArgs that were sent to the thread'
	}
*/

//System Imports
const childProcess = require('child_process');

//Imports
const objects = require('../objects/objects');
const { mapList } = require('./mapManager');
const { registerCallback } = require('./atlas/registerCallback');
const eventEmitter = require('../misc/events');

//Internals
const threads = [];
const listenersOnZoneIdle = [];

//Helpers
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

const killThread = thread => {
	_.log(`Killing: ${thread.workerArgs.id}`);

	thread.destroyed = true;
	thread.worker.kill();
	threads.spliceWhere(t => t === thread);
};

const untrackPlayerOnThread = (thread, obj) => {
	thread.playersCurrent.spliceWhere(p => p === obj.serverId);
	delete obj.threadId;

	if (thread.playersCurrent.length === 0 && thread.destroyWhenEmptyForMs === 0)
		killThread(thread);
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

	rezone: async function (thread, message) {
		const { args: { obj, newZone, keepPos = true, threadArgs, forceNew } } = message;

		untrackPlayerOnThread(thread, obj);

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
		await atlas.addObject(obj, keepPos, isRezone, threadArgs, forceNew);
	},

	onZoneIdle: function (thread) {
		listenersOnZoneIdle.forEach(l => l(thread));
	},

	killThread: function (thread) {
		killThread(thread);
	}
};

const onMessage = (thread, message) => {
	if (message.module) {
		try {
			if (message.includeThreadInArgs)
				message.threadId = thread.id;

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

const spawnThread = async ({
	map: {
		name,
		path,
		instanced,
		destroyWhenEmptyForMs = consts.destroyThreadWhenEmptyForMs
	},
	threadArgs,
	obj
}) => {
	let cbOnInitialized;

	const promise = new Promise(resolveOnReady => {
		cbOnInitialized = resolveOnReady;
	});

	let id = instanced ? _.getGuid() : name;
	const thread = {
		id,
		name,
		instanced,
		path,
		worker: null,
		isReady: false,
		promise,
		preConfig: {},
		cbOnInitialized,
		players: [],
		playersCurrent: [],
		birthEpoch: +new Date(),
		destroyWhenEmptyForMs,
		emptySinceEpoch: null,
		sendArgsToWorker: ['name', 'id', 'preConfig'],
		workerArgs: null
	};

	threads.push(thread);

	const emBeforeSpawnThread = {
		thread,
		spawnForObject: obj
	};
	eventEmitter.emit('beforeSpawnThread', emBeforeSpawnThread);

	if (threadArgs !== undefined) {
		thread.sendArgsToWorker.push('extraThreadArgs');
		thread.extraThreadArgs = threadArgs;
	}

	thread.workerArgs = Object.fromEntries(
		thread.sendArgsToWorker.map(a => [a, thread[a]])
	);

	_.log(`Spawning: ${thread.name} (${thread.id})`);
	thread.worker = childProcess.fork('./world/worker', [JSON.stringify(thread.workerArgs)]);

	thread.worker.on('message', onMessage.bind(null, thread));

	return promise;
};

const notifyWaitForThread = serverObj => {
	serverObj.socket.emit('event', {
		event: 'onGetAnnouncement',
		data: {
			msg: 'Generating a new map, please wait as this may take a few moments..',
			ttl: 500
		}
	});
};

const getThread = async ({ serverObj, zoneName, zoneId, obj, threadArgs, forceNew }) => {
	const result = {
		resetObjPosition: false,
		thread: null
	};

	let map = mapList.find(m => m.name === zoneName);

	if (!map) {
		map = mapList.find(m => m.name === clientConfig.config.defaultZone);

		zoneName = map.name;
		zoneId = null;
	}

	let thread;
	if (!forceNew) {
		thread = threads.find(t =>
			(
				zoneId === null ||
				t.id === zoneId
			) && t.name === zoneName
		);

		//Maybe this player has been in a thread for this map before
		if (!thread)
			thread = threads.find(t => t.name === zoneName && t.players.includes(obj.id));
	}

	const emBeforeChooseThread = {
		chooseForObject: obj,
		zoneId,
		zoneName,
		chosenThread: thread,
		threads,
		threadArgs,
		forceNew
	};
	eventEmitter.emit('beforeChooseThread', emBeforeChooseThread);
	thread = emBeforeChooseThread.chosenThread;

	if (!thread) {
		if (emBeforeChooseThread.zoneName !== map.name)
			map = mapList.find(m => m.name === emBeforeChooseThread.zoneName);

		if (map.instanced)
			result.resetObjPosition = true;

		notifyWaitForThread(serverObj);

		thread = await spawnThread({
			map,
			obj,
			threadArgs
		});
	}

	if (!thread) {
		io.logError({
			sourceModule: 'threadManager',
			sourceMethod: 'getThread',
			error: 'No thread found',
			info: {
				requestedZoneName: zoneName,
				requestedZoneId: zoneId,
				useMapName: map.name
			}
		});

		process.exit();
	}

	if (!thread.isReady) {
		notifyWaitForThread(serverObj);

		await thread.promise;
	}

	result.thread = thread;

	return result;
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

const spawnMapThreads = async () => {
	const promises = mapList
		.filter(m => m.autoSpawn === true)
		.map(m => spawnThread({ map: m }));

	await Promise.all(promises);
};

const trackPlayerOnThread = (thread, obj) => {
	thread.players.push(obj.id);
	thread.playersCurrent.push(obj.id);

	obj.threadId = thread.id;

	if (thread.emptySinceEpoch)
		thread.emptySinceEpoch = null;
};

const update = () => {
	let tLen = threads.length;
	for (let i = 0; i < tLen; i++) {
		const t = threads[i];
		if (!t.isReady || t.destroyWhenEmptyForMs === -1)
			continue;

		if (t.destroyed) {
			tLen--;
			i--;
		}

		if (!t.emptySinceEpoch && t.playersCurrent.length === 0)
			t.emptySinceEpoch = +new Date();

		if (!t.emptySinceEpoch)
			continue;

		const ageInMs = (+new Date() - t.emptySinceEpoch);

		if (ageInMs < t.destroyWhenEmptyForMs)
			continue;

		killThread(t);
		i--;
		tLen--;
	}
};

const init = async () => {
	await spawnMapThreads();

	setInterval(update, 5000);
};

//Exports
module.exports = {
	init,
	getThread,
	killThread,
	getThreadFromId,
	spawnMapThreads,
	messageAllThreads,
	sendMessageToThread,
	trackPlayerOnThread,
	returnWhenThreadsIdle,
	getPlayerCountInThread,
	untrackPlayerOnThread
};
