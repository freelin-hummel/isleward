//Imports
const objects = require('../objects/objects');
const events = require('../misc/events');
const {
	getThread, sendMessageToThread, getThreadFromId, returnWhenThreadsIdle, trackPlayerOnThread, untrackPlayerOnThread
} = require('./threadManager');
const { registerCallback, removeCallback } = require('./atlas/registerCallback');

//Exports
module.exports = {
	nextId: 0,

	addObject: async function (obj, keepPos, transfer, threadArgs) {
		const serverObj = objects.objects.find(o => o.id === obj.id);
		if (!serverObj)
			return;

		//While rezoning, this is set to true. So we remove it
		delete serverObj.rezoning;

		await events.emit('onBeforePlayerEnterWorld', { obj });

		let { zoneName, zoneId } = obj;

		const partyIds = obj.components.find(c => c.type === 'social')?.party;
		if (partyIds) {
			const partyLeader = cons.players.find(p => {
				if (!partyIds.includes(p.id))
					return false;

				const cpnSocial = p.components.find(c => c.type === 'social');

				if (!cpnSocial)
					return false;

				return cpnSocial.isPartyLeader;
			});

			if (partyLeader?.zoneName === zoneName)
				zoneId = partyLeader.zoneId;
		}

		const eGetThread = {
			serverObj,
			zoneName,
			zoneId,
			threadArgs,
			obj
		};

		const { thread, resetObjPosition } = await getThread(eGetThread);

		//Perhaps the player disconnected while waiting for the thread to spawn
		if (!serverObj.socket.connected)
			return;

		if (resetObjPosition) {
			delete obj.x;
			delete obj.y;
		}

		obj.zoneName = thread.name;
		obj.zoneId = thread.id;

		serverObj.zoneId = thread.id;
		serverObj.zoneName = thread.name;

		events.emit('playerObjChanged', {
			obj
		});

		const simpleObj = obj.getSimple ? obj.getSimple(true, true) : obj;

		trackPlayerOnThread(thread, serverObj);

		sendMessageToThread({
			threadId: serverObj.threadId,
			msg: {
				method: 'addObject',
				args: {
					keepPos: keepPos,
					obj: simpleObj,
					transfer: transfer
				}
			}
		});
	},

	removeObject: async function (obj, skipLocal, callback) {
		if (!skipLocal)
			objects.removeObject(obj);

		const thread = getThreadFromId(obj.zoneId);
		if (!thread) {
			callback();

			return;
		}

		let callbackId = null;
		if (callback)
			callbackId = this.registerCallback(callback);

		sendMessageToThread({
			threadId: obj.threadId,
			msg: {
				method: 'removeObject',
				args: {
					obj: obj.getSimple(true),
					callbackId: callbackId
				}
			}
		});

		untrackPlayerOnThread(thread, obj);
	},
	updateObject: function (obj, msgObj) {
		sendMessageToThread({
			threadId: obj.threadId,
			msg: {
				method: 'updateObject',
				args: {
					id: obj.id,
					obj: msgObj
				}
			}
		});
	},
	queueAction: function (obj, action) {
		sendMessageToThread({
			threadId: obj.threadId,
			msg: {
				method: 'queueAction',
				args: {
					id: obj.id,
					action: action
				}
			}
		});
	},
	performAction: function (obj, action) {
		sendMessageToThread({
			threadId: obj.threadId,
			msg: {
				method: 'performAction',
				args: {
					id: obj.id,
					action: action
				}
			}
		});
	},

	registerCallback: function (callback) {
		return registerCallback(callback);
	},

	resolveCallback: function (msg) {
		const callback = removeCallback(msg.msg.id);
		if (!callback)
			return;

		callback.callback(msg.msg.result);
	},

	returnWhenZonesIdle: async function () {
		await returnWhenThreadsIdle();
	},

	forceSavePlayer: async function (obj) {
		const thread = getThreadFromId(obj.threadId);

		if (!thread)
			return;

		return new Promise(res => {
			const callbackId = this.registerCallback(res);

			thread.worker.send({
				method: 'forceSavePlayer',
				args: {
					playerId: obj.id,
					callbackId
				}
			});
		});
	}

};
