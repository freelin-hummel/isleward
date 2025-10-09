//Imports
const spellTemplate = require('../config/spells/spellTemplate');
const animations = require('../config/animations');
const playerSpells = require('../config/spells');
const playerSpellsConfig = require('../config/spellsConfig');
const spellCastResultTypes = require('./spellbook/spellCastResultTypes');

//Helpers
const rotationManager = require('./spellbook/rotationManager');
const cast = require('./spellbook/cast');

//Spells that always exist for players
const forcedPlayerSpells = [{
	id: 5,
	type: 'autoMove',
	name: 'Auto-Move',
	description: 'When active, you will automatically move closer to your target if the next queued rune cast is out of range.',
	icon: [3, 4],
	forcedSpell: true,
	//Bit of a hack, to allow us to cast it without a target
	aura: true,
	values: {},
	manaCost: 0,
	cdMax: 0,
	cast: (spellbook, spell) => {
		const { obj } = spellbook;

		spellbook.autoMoveActive = !spellbook.autoMoveActive;

		obj.instance.syncer.queue('onGetSpellActive', {
			id: obj.id,
			spell: spell.id,
			active: spellbook.autoMoveActive
		}, [obj.serverId]);

		obj.syncer.setArray(true, 'spellbook', 'getSpells', {
			...spell,
			autoActive: spellbook.autoMoveActive
		});
	}
}];

//Component
module.exports = {
	type: 'spellbook',

	spells: [],
	physics: null,
	objects: null,

	closestRange: -1,
	furthestRange: -1,

	callbacks: [],

	rotation: null,

	//When autoMoveActive is set to true, players will automatically move closer to their targets (without path-finding)
	// until they are close enough to cast
	autoMoveActive: false,

	init: function (blueprint) {
		this.objects = this.obj.instance.objects;
		this.physics = this.obj.instance.physics;

		(blueprint.spells || []).forEach(s => this.addSpell(s, -1));

		if (blueprint.rotation) {
			const { duration, spells } = blueprint.rotation;

			this.rotation = {
				currentTick: 0,
				duration,
				spells
			};
		}

		delete blueprint.spells;

		//External helpers that should form part of the component
		this.getSpellToCast = rotationManager.getSpellToCast.bind(null, this);
		this.getFurthestRange = rotationManager.getFurthestRange.bind(null, this);
		this.resetRotation = rotationManager.resetRotation.bind(null, this);
	},

	transfer: function () {
		let spells = this.spells;
		this.spells = [];

		spells.forEach(s => this.addSpell(s, -1));
	},

	die: function () {
		this.stopCasting();

		this.spells.forEach(s => {
			let reserve = s.manaReserve;

			if (reserve && reserve.percentage && s.active) {
				let reserveEvent = {
					spell: s.name,
					reservePercent: reserve.percentage
				};
				this.obj.fireEvent('onBeforeReserveMana', reserveEvent);
				this.obj.stats.addStat('manaReservePercent', -reserveEvent.reservePercent);
			}

			s.die();
		}, this);
	},

	simplify: function (self, isSave) {
		if (!self)
			return null;

		const res = {
			type: this.type,
			closestRange: this.closestRange,
			furthestRange: this.furthestRange
		};

		let spells = this.spells;
		if (spells.length && spells[0].obj)
			spells = spells.map(f => f.simplify());

		if (this.obj.player && !isSave)
			spells.push(...forcedPlayerSpells);

		res.spells = spells;

		return res;
	},

	save: function (self) {
		return this.simplify(true, true);
	},

	addSpell: function (options, spellId) {
		//Forced spells can't actually be added since they aren't real spells. We simply add them to send to the client
		if (options.forcedSpell)
			return;

		if (!options.type) {
			options = {
				type: options
			};
		}

		let type = options.type[0].toUpperCase() + options.type.substr(1);

		let typeTemplate = {
			type: type,
			template: null
		};
		this.obj.instance.eventEmitter.emit('onBeforeGetSpellTemplate', typeTemplate);
		if (!typeTemplate.template)
			typeTemplate.template = require('../config/spells/spell' + type);

		let builtSpell = extend({}, spellTemplate, typeTemplate.template, options);
		builtSpell.obj = this.obj;
		builtSpell.baseDamage = builtSpell.damage || 0;
		builtSpell.damage += (options.damageAdd || 0);
		if (options.damage)
			builtSpell.damage = options.damage;

		if (builtSpell.animation) {
			let animation = null;
			let sheetName = this.obj.sheetName || '../../../images/characters.png';
			let animationName = builtSpell.animation;

			if (sheetName === 'mobs')
				animation = animations.mobs;
			else if (sheetName === 'bosses')
				animation = animations.bosses;
			else if (sheetName.indexOf('/') > -1)
				animation = animations.mobs[sheetName];
			else
				animation = animations.classes;

			if ((animation) && (animation[this.obj.cell]) && (animation[this.obj.cell][animationName])) {
				builtSpell.animation = extend({}, animation[this.obj.cell][animationName]);
				builtSpell.animation.name = animationName;
			} else
				builtSpell.animation = null;
		}

		if (!builtSpell.castOnDeath && builtSpell.range) {
			if (this.closestRange === -1 || builtSpell.range < this.closestRange)
				this.closestRange = builtSpell.range;
			if (this.furthestRange === -1 || builtSpell.range > this.furthestRange)
				this.furthestRange = builtSpell.range;
		}

		if ((!options.has('id')) && (spellId === -1)) {
			spellId = 0;
			this.spells.forEach(function (s) {
				if (s.id >= spellId)
					spellId = s.id + 1;
			});
		}

		builtSpell.id = !options.has('id') ? spellId : options.id;

		//Mobs don't get abilities put on CD when they learn them
		if (!this.obj.mob && builtSpell.cdMax)
			builtSpell.cd = builtSpell.cdMax;
		this.spells.push(builtSpell);
		this.spells.sort(function (a, b) {
			return (a.id - b.id);
		});

		builtSpell.calcDps(null, true);
		if (builtSpell.init)
			builtSpell.init();

		if (this.obj.player)
			this.obj.syncer.setArray(true, 'spellbook', 'getSpells', builtSpell.simplify());

		return builtSpell.id;
	},

	addSpellFromRune: function (runeSpell, spellId) {
		let type = runeSpell.type;
		let playerSpell = playerSpells.spells.find(s => (s.name.toLowerCase() === runeSpell.name.toLowerCase())) || playerSpells.spells.find(s => (s.type === type));
		let playerSpellConfig = playerSpellsConfig.spells[runeSpell.name.toLowerCase()] || playerSpellsConfig.spells[runeSpell.type];
		if (!playerSpellConfig)
			return -1;

		if (!runeSpell.rolls)
			runeSpell.rolls = {};

		runeSpell.values = {};

		let builtSpell = extend({
			type: runeSpell.type,
			values: {}
		}, playerSpell, playerSpellConfig, runeSpell);

		for (let r in builtSpell.random) {
			let range = builtSpell.random[r];
			let roll = runeSpell.rolls[r] || 0;
			runeSpell.rolls[r] = roll;

			let int = r.indexOf('i_') === 0;

			let val = range[0] + ((range[1] - range[0]) * roll);
			if (int) {
				val = Math.round(val);
				r = r.replace('i_', '');
			} else
				val = ~~(val * 100) / 100;

			builtSpell[r] = val;
			builtSpell.values[r] = val;
			runeSpell.values[r] = val;
		}

		if (runeSpell.properties) {
			for (let p in runeSpell.properties)
				builtSpell[p] = runeSpell.properties[p];
		}

		if (runeSpell.cdMult)
			builtSpell.cdMax *= runeSpell.cdMult;

		delete builtSpell.rolls;
		delete builtSpell.random;

		return this.addSpell(builtSpell, spellId);
	},

	calcDps: function () {
		this.spells.forEach(s => s.calcDps());
	},

	removeSpellById: function (id) {
		let exists = this.spells.spliceFirstWhere(s => (s.id === id));

		if (exists) {
			if (exists.manaReserve && exists.active) {
				let reserve = exists.manaReserve;

				if (reserve.percentage) {
					let reserveEvent = {
						spell: exists.name,
						reservePercent: reserve.percentage
					};
					this.obj.fireEvent('onBeforeReserveMana', reserveEvent);
					this.obj.stats.addStat('manaReservePercent', -reserveEvent.reservePercent);
				}
			}

			if (exists.unlearn)
				exists.unlearn();

			this.obj.syncer.setArray(true, 'spellbook', 'removeSpells', id);
		}
	},

	queueAuto: function (action, spell) {
		if (!action.auto || spell.autoActive)
			return true;

		this.spells.forEach(s => s.setAuto(null));

		spell.setAuto({
			target: action.target,
			spell: spell.id
		});
	},

	getTarget: function (spell, action) {
		let target = action.target;

		//Cast on self?
		if (action.self) {
			if (spell.targetGround) {
				target = {
					x: this.obj.x,
					y: this.obj.y
				};
			} else if (spell.spellType === 'buff')
				target = this.obj;
		}

		if (!spell.aura && !spell.targetGround) {
			//Did we pass in the target id?
			if (target && !target.id) {
				target = this.objects.objects.find(o => o.id === target);
				if (!target)
					return null;
			}

			if (target === this.obj && spell.noTargetSelf)
				target = null;

			if (!target || !target.player) {
				if (spell.autoTargetFollower) {
					target = this.spells.find(s => s.minions && s.minions.length > 0);
					if (target)
						target = target.minions[0];
					else
						return null;
				}
			}

			if (target.aggro && (spell.spellType === 'buff' || spell.spellType === 'heal')) {
				if (this.obj.aggro.faction !== target.aggro.faction || this.obj.aggro.subFaction !== target.aggro.subFaction)
					return;
			} else if (target.aggro && !this.obj.aggro.canAttack(target)) {
				if (this.obj.player)
					this.sendAnnouncement("You don't feel like attacking that target");
				return;
			}
		}

		if (!spell.targetGround && target && !target.aggro && !spell.aura) {
			if (spell.spellType === 'heal')
				this.sendAnnouncement("You don't feel like healing that target");
			else
				this.sendAnnouncement("You don't feel like attacking that target");

			return;
		}

		if (spell.aura)
			target = this.obj;

		return target;
	},

	isForcedSpell: function (spellId) {
		return !!this.obj.player && forcedPlayerSpells.some(f => f.id === spellId);
	},

	castForcedSpell: function (spellId) {
		const spell = forcedPlayerSpells.find(f => f.id === spellId);

		if (spell.type === 'autoMove') {
			spell.cast(this, spell);

			return true;
		}
	},

	hasSpell: function (spellId) {
		return this.spells.some(f => f.id === spellId);
	},

	isSpellAuto: function (spellId) {
		return this.spells.some(f => f.id === spellId && f.auto === true);
	},

	canCast: function (action) {
		if (!action.has('spell'))
			return false;

		const spell = this.spells.find(s => (s.id === action.spell));

		if (!spell)
			return false;

		let target = this.getTarget(spell, action);

		return spell.canCast(target);
	},

	getSpellCanCastResult: function (action) {
		const spell = this.spells.find(s => (s.id === action.spell));

		if (!spell)
			return spellCastResultTypes.noSpellFound;

		const target = this.getTarget(spell, action);

		return spell.getSpellCanCastResult(target);
	},

	/* config: {
		ignoreCooldown: boolean
		ignoreCastTime: boolean
		stopOtherCasting: boolean
	} */
	cast: function (action, isAuto, config) {
		return cast(this, action, isAuto, config);
	},

	getClosestRange: function () {
		const { closestRange } = this;

		if (closestRange <= 0)
			return 1;

		return closestRange;
	},

	getCooldowns: function () {
		let cds = [];
		this.spells.forEach(
			s => cds.push({
				cd: s.cd,
				cdMax: s.cdMax,
				canCast: ((s.manaCost <= this.obj.stats.values.mana) && (s.cd === 0))
			}), this);

		return cds;
	},

	updateAutoCast: function (skipAutoMove = false) {
		if (this.isCasting())
			return false;

		let didCast = false;
		let didMove = false;

		this.spells.forEach(s => {
			let auto = s.autoActive;
			if (!auto)
				return;

			if (!auto.target || auto.target.destroyed) {
				s.setAuto(null);

				return;
			}

			const spellCastResult = s.getSpellCanCastResult(auto.target);

			if (spellCastResult === spellCastResultTypes.outOfRange) {
				if (!skipAutoMove) {
					//Players, when autoMoveActive is true can automatically move closer and try to auto-attack again
					if (this.obj.player) {
						const didQueue = this.obj.queueAutoMove(s.id, auto.target);

						//If we queue an auto-move, we're allowed to try to move once and then try to auto-attack again
						if (didQueue)
							didMove = this.obj.performQueue(true);
					} else if (this.obj.moveQueue.length > 0) {
						//Mobs on the other hand, have to employ a different mechanic since they will always have movement queued
						didMove = this.obj.performQueue(true);
					}

					if (didMove)
						this.updateAutoCast(true);
				}
			} else {
				const res = this.cast(auto, true);

				if (res !== false)
					didCast = true;
			}
		});

		return didCast || didMove;
	},

	update: function () {
		const isCasting = this.isCasting();

		if (this.rotation)
			rotationManager.tick(this);

		this.spells.forEach(s => {
			s.updateBase();
			if (s.update)
				s.update();
		});

		let callbacks = this.callbacks;
		let cLen = callbacks.length;
		for (let i = 0; i < cLen; i++) {
			let c = callbacks[i];

			//If a spellCallback kills a mob he'll unregister his callbacks
			if (!c) {
				i--;
				cLen--;
				continue;
			}

			c.time -= consts.tickTime;

			if (c.time <= 0) {
				if (c.callback)
					c.callback();
				if (c.destroyCallback)
					c.destroyCallback();
				callbacks.splice(i, 1);
				i--;
				cLen--;
			}
		}

		return isCasting;
	},

	//Callbacks to be called when this object is destroyed
	registerDestroyCallback: function (callback) {
		this.callbacks.push({
			cbOnSelfDestroyed: callback
		});
	},

	registerCallback: function (sourceId, callback, time, destroyCallback, targetId, destroyOnRezone) {
		let obj = {
			sourceId: sourceId,
			targetId: targetId,
			callback: callback,
			destroyCallback: destroyCallback,
			destroyOnRezone: destroyOnRezone,
			time: time
		};

		this.callbacks.push(obj);

		return obj;
	},

	unregisterCallback: function (objId, isTarget) {
		let callbacks = this.callbacks;
		let cLen = callbacks.length;
		for (let i = 0; i < cLen; i++) {
			let c = callbacks[i];
			if (
				(
					isTarget &&
					c.targetId === objId
				) ||
				(
					!isTarget &&
					c.sourceId === objId
				)
			) {
				if (c.destroyCallback)
					c.destroyCallback();

				callbacks.splice(i, 1);
				i--;
				cLen--;
			}
		}
	},

	sendAnnouncement: function (msg) {
		process.send({
			method: 'events',
			data: {
				onGetAnnouncement: [{
					obj: {
						msg: msg
					},
					to: [this.obj.serverId]
				}]
			}
		});
	},

	fireEvent: function (event, args) {
		let spells = this.spells;
		let sLen = spells.length;
		for (let i = 0; i < sLen; i++) {
			let s = spells[i];

			let spellEvents = s.events;
			if (spellEvents) {
				let callback = spellEvents[event];
				if (!callback)
					continue;

				callback.apply(s, args);
			}

			if (s.castEvent === event)
				s.cast();
		}
	},

	isCasting: function () {
		return this.spells.some(s => s.currentAction);
	},

	stopCasting: function (ignore, skipAuto) {
		this.spells.forEach(s => {
			if (s === ignore)
				return;

			if (!skipAuto)
				s.setAuto(null);

			if (!s.currentAction)
				return;

			s.castTime = 0;
			s.currentAction = null;
			delete s.castingInfo;

			if (!ignore || !ignore.castTimeMax)
				this.obj.syncer.set(false, null, 'casting', 0);
		});
	},

	destroy: function () {
		this.callbacks.forEach(c => {
			if (c.cbOnSelfDestroyed)
				c.cbOnSelfDestroyed();
		});

		this.spells.forEach(s => {
			if (s.destroy)
				s.destroy();
		});
	},

	events: {
		beforeMove: function () {
			this.stopCasting(null, true);
		},

		onBeforeUseItem: function () {
			this.stopCasting(null, true);
		},

		clearQueue: function () {
			this.stopCasting(null, false);
		},

		beforeDeath: function () {
			this.stopCasting(null, false);

			this.spells.forEach(function (s) {
				if (!s.castOnDeath)
					return;

				s.cast();
			});
		},

		beforeRezone: function () {
			this.spells.forEach(function (s) {
				if (s.active) {
					s.active = false;

					let reserve = s.manaReserve;

					if (reserve && reserve.percentage) {
						let reserveEvent = {
							spell: s.name,
							reservePercent: reserve.percentage
						};
						this.obj.fireEvent('onBeforeReserveMana', reserveEvent);
						this.obj.stats.addStat('manaReservePercent', -reserveEvent.reservePercent);
					}

					//Make sure to remove the buff from party members
					s.updateInactive();
				}
			}, this);

			let callbacks = this.callbacks;
			let cLen = callbacks.length;
			for (let i = 0; i < cLen; i++) {
				let c = callbacks[i];

				//If a spellCallback kills a mob he'll unregister his callbacks
				//Probably not needed since we aren't supposed to damage mobs in destroyCallback
				if (!c) {
					i--;
					cLen--;
					continue;
				}

				if (c.destroyOnRezone) {
					if (c.destroyCallback)
						c.destroyCallback();
					callbacks.splice(i, 1);
					i--;
					cLen--;
				}
			}
		}
	}
};
