const spellCastResultTypes = require('../components/spellbook/spellCastResultTypes');

const getDistance = (xa, ya, xb, yb) => {
	let dx = xa - xb;
	if (dx < 0)
		dx = -dx;

	let dy = ya - yb;
	if (dy < 0)
		dy = -dy;

	return dx > dy ? dx : dy;
};

module.exports = {
	moveQueue: [],
	spellQueue: [],

	clearQueue: function () {
		if (this.has('serverId')) {
			this.instance.syncer.queue('onClearQueue', {
				id: this.id
			}, [this.serverId]);
		}

		this.moveQueue = [];
		this.spellQueue = [];

		this.fireEvent('clearQueue');
	},

	queue: function (msg) {
		const { action, data } = msg;

		if (action === 'spell') {
			const { spellbook } = this;

			const { spell: spellId } = data;

			if (spellbook.isForcedSpell(spellId)) {
				spellbook.castForcedSpell(spellId);

				return;
			} else if (spellbook.isSpellAuto(spellId)) {
				//If it's an auto spell, just toggle it and carry on
				this.spellbook.cast(data);

				return;
			}

			this.spellQueue.push(msg);
		} else if (action === 'move') {
			const { priority } = data;

			if (this.moveQueue.length >= 50)
				return;

			if (priority)
				this.spellbook.stopCasting();

			this.moveQueue.push(msg);
		}
	},

	//If force
	queueAutoMove: function (spellId, target) {
		const { spellbook, moveQueue, serverId, instance: { physics, syncer } } = this;

		if (
			moveQueue.length > 0 ||
			!spellbook.autoMoveActive
		)
			return false;

		const { range } = spellbook.spells.find(f => f.id === spellId);

		let { x, y } = this;
		const { x: tx, y: ty } = target;

		let dx = 0;
		if (tx > x)
			dx = 1;
		else if (tx < x)
			dx = -1;

		let dy = 0;
		if (ty > y)
			dy = 1;
		else if (ty < y)
			dy = -1;

		const addToQueue = [];

		let distance = getDistance(x, y, tx, ty);
		while (distance > range) {
			if (x !== tx)
				x += dx;

			if (y !== ty)
				y += dy;

			if (physics.isTileBlocking(x, y)) {
				addToQueue.length = 0;

				break;
			}

			addToQueue.push({
				action: 'move',
				data: {
					x,
					y
				}
			});

			distance = getDistance(x, y, tx, ty);
		}

		if (addToQueue.length === 0) {
			process.send({
				method: 'events',
				data: {
					onGetAnnouncement: [{
						obj: {
							msg: 'Target not in line of sight, no auto-move queued.'
						},
						to: [serverId]
					}]
				}
			});

			return false;
		}

		moveQueue.push(...addToQueue);

		syncer.queue('overridePath', {
			id: this.id,
			data: {
				path: moveQueue.map(m => m.data)
			}
		}, [serverId]);

		return true;
	},

	performQueue: function (skipSpells = false) {
		const { moveQueue, spellQueue, spellbook } = this;

		//If we have any spells queued, perform them first
		let castDone = false;

		if (spellQueue.length > 0 && !skipSpells) {
			const { data: queuedSpell } = spellQueue[0];
			const { spell: spellId } = queuedSpell;

			//If the target is a number (object id), get it
			let targetIsObject = typeof(queuedSpell.target) === 'number';
			let target;
			if (targetIsObject)
				target = this.instance.objects.find(f => f.id === queuedSpell.target);

			//There are some conditions where we just ignore the queued spell completely
			if (
				//Spell no longer exists in spellbook
				!spellbook.hasSpell(spellId) ||
				//Target doesn't exist or is dead
				(
					targetIsObject &&
					(
						!target ||
						target.destroyed
					)
				)
			) {
				spellQueue.shift();

				return this.performQueue();
			}

			const canCastResponse = spellbook.getSpellCanCastResult(queuedSpell);
			if (canCastResponse === spellCastResultTypes.outOfRange) {
				if (moveQueue.length === 0) {
					const queueSuccess = this.queueAutoMove(spellId, target);
					if (!queueSuccess)
						spellQueue.shift();
				}
			} else if (canCastResponse === spellCastResultTypes.success) {
				castDone = this.spellbook.cast(queuedSpell);

				//If cast succeeded, we can remove it from the queue. If not, we'll try again next tick
				if (castDone)
					spellQueue.shift();
			}
		}

		if (castDone)
			return true;

		if (spellbook) {
			//We need to inform updateAutoCast if skipSpells is true to stop infinite loops for mobs:
			// obj.update -> A -> obj.performQueue -> spellbook.updateAutoCast -> goto A
			const didAutoCast = this.spellbook.updateAutoCast(skipSpells);
			if (didAutoCast)
				return true;
		}

		if (moveQueue.length === 0)
			return false;

		const moveEvent = { sprintChance: this.stats.values.sprintChance ?? 0 };

		this.fireEvent('onBeforeTryMove', moveEvent);

		let queuedMove = moveQueue.shift();

		if (moveQueue.length > 0) {
			let maxDistance = 1;

			let sprintChance = moveEvent.sprintChance;
			do {
				const roll = ~~(Math.random() * 100);
				if (
					roll < sprintChance &&
					!this.instance.physics.isTileBlocking(queuedMove.data.x, queuedMove.data.y)
				) {
					queuedMove = moveQueue.shift();
					maxDistance++;
				}

				sprintChance -= 100;
			} while (sprintChance > 0 && moveQueue.length > 0);

			queuedMove.maxDistance = maxDistance;
		}

		const success = this.performMove(queuedMove);
		if (!success) {
			if (this.has('serverId')) {
				this.instance.syncer.queue('onClearQueue', {
					id: this.id
				}, [this.serverId]);
			}

			this.moveQueue = [];

			return false;
		}

		return true;
	}
};
