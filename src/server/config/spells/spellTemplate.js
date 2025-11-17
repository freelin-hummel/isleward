const spellCastResultTypes = require('../../components/spellbook/spellCastResultTypes');
const combat = require('../../combat/combat');

module.exports = {
	cd: 0,
	cdMax: 0,
	manaCost: 1,
	threatMult: 1,

	casting: false,
	castTime: 0,
	castTimeMax: 0,

	/*
		While casting a spell with castTimeMax > 0, we need to store {
			castTimeMax,
			usedSpeed
		}
		Check the comment above castBase for more info on this
	*/
	castingInfo: null,

	needLos: false,
	//Should damage/heals caused by this spell cause events to be fired on objects?
	noEvents: false,

	currentAction: null,

	pendingAttacks: [],

	canCast: function () {
		const { cd, manaCost } = this;

		if (cd > 0)
			return false;
		else if (manaCost > this.obj.stats.values.mana)
			return false;

		return true;
	},

	getSpellCanCastResult: function (target) {
		const { obj } = this;

		if (!target)
			return spellCastResultTypes.noTarget;

		if (!this.targetGround && !target.aggro)
			return spellCastResultTypes.invalidTarget;

		if (this.cd > 0)
			return spellCastResultTypes.onCooldown;
		else if (this.manaCost > obj.stats.values.mana)
			return spellCastResultTypes.insufficientMana;
		else if (target.aggro) {
			if (this.targetFriendly) {
				if (obj.aggro.canAttack(target))
					return spellCastResultTypes.invalidTarget;
			} else if (this.aura)
				return spellCastResultTypes.success;
			else if (!obj.aggro.canAttack(target))
				return spellCastResultTypes.invalidTarget;
		}

		if (this.has('range')) {
			const distance = Math.max(Math.abs(target.x - obj.x), Math.abs(target.y - obj.y));

			if (distance > this.range)
				return spellCastResultTypes.outOfRange;
		}

		return spellCastResultTypes.success;
	},

	/*
		If this spell is instant cast, we cast it here. If not, we start casting. This function returns:
		{
			castTimeMax:
				What was the cast time we used (influenced by attack/castSpeed and the beforeGetSpellCastTime event),
			usedSpeed:
				If we used attack/castSpeed to reduce the castTimeMax, how much of it did we use?
				We need this to calculate what the cooldown will be
		}
	*/
	castBase: function (action, config) {
		if (!config?.ignoreCastTime) {
			if (this.castTimeMax > 0) {
				if ((!this.currentAction) || (this.currentAction.target !== action.target)) {
					this.currentAction = action;

					const { castTimeMax, usedSpeed } = this.calculateCastTimeMax({
						isAttack: this.isAttack,
						statValues: this.obj.stats.values,
						castTimeMax: this.castTimeMax
					});

					const castEvent = {
						spell: this,
						castTimeMax
					};
					this.obj.fireEvent('beforeGetSpellCastTime', castEvent);

					if (castEvent.castTimeMax === 0) {
						if (this.cast(action)) {
							return {
								castTimeMax,
								usedSpeed
							};
						}

						return null;
					}

					this.currentAction.castTimeMax = castEvent.castTimeMax;
					this.castTime = castEvent.castTimeMax;
					this.obj.syncer.set(false, null, 'casting', 0);

					this.castingInfo = {
						castTimeMax,
						usedSpeed
					};
				}

				return null;
			}
		}

		if (this.cast(action)) {
			return {
				castTimeMax: config?.ignoreCastTime ? 0 : this.castTimeMax,
				usedSpeed: 0
			};
		}

		return null;
	},

	updateBase: function () {
		//It's possible that we rezoned midway through casting (map regen)
		// We'll have a hanging cast bar but at least we won't crash
		if (this.castTime > 0 && !this.currentAction)
			this.castTime = 0;

		if (this.castTime > 0) {
			let action = this.currentAction;

			if (
				action?.target?.destroyed ||
				this.getSpellCanCastResult(action.target) !== spellCastResultTypes.success
			) {
				this.currentAction = null;
				this.castTime = 0;
				this.obj.syncer.set(false, null, 'casting', 0);
				return;
			}

			this.castTime--;
			this.obj.syncer.set(false, null, 'casting', (action.castTimeMax - this.castTime) / action.castTimeMax);

			if (!this.castTime) {
				this.currentAction = null;

				if (this.cast(action)) {
					this.consumeMana();
					this.setCd(this.castingInfo);

					this.obj.fireEvent('afterCastSpell', {
						castSuccess: true,
						spell: this,
						action
					});
				}
			} else {
				if (this.onCastTick)
					this.onCastTick();
				
				this.sendBump(null, 0, -1);
			}

			return;
		}

		if (this.cd > 0) {
			this.cd--;

			if (this.cd === 0)
				this.obj.syncer.setArray(true, 'spellbook', 'getSpells', this.simplify());
		}
	},

	consumeMana: function (config) {
		const manaCost = config?.overrides?.manaCost ?? this.manaCost;

		let stats = this.obj.stats.values;
		stats.mana -= manaCost;

		if (this.obj.player)
			this.obj.syncer.setObject(true, 'stats', 'values', 'mana', stats.mana);
	},

	setCd: function ({ castTimeMax, usedSpeed }) {
		let cdMax = this.cdMax;

		//If a spell has no cast time, attack/cast speed start influencing its cooldown
		if (castTimeMax === 0) {
			let speedModifier = this.obj.stats.values[this.isAttack ? 'attackSpeed' : 'castSpeed'];
			speedModifier -= usedSpeed;

			cdMax = Math.max(1, Math.ceil(cdMax * (1 - (speedModifier / 100))));
		}

		const emBeforeSetSpellCooldown = { cd: cdMax };
		this.obj.fireEvent('beforeSetSpellCooldown', emBeforeSetSpellCooldown, this);

		this.cd = emBeforeSetSpellCooldown.cd;

		const syncSpell = this.simplify();
		this.obj.syncer.setArray(true, 'spellbook', 'getSpells', syncSpell);
	},

	setAuto: function (autoConfig) {
		this.autoActive = autoConfig;

		if (this.obj.player) {
			this.obj.instance.syncer.queue('onGetSpellActive', {
				id: this.obj.id,
				spell: this.id,
				active: !!autoConfig
			}, [this.obj.serverId]);
		}
	},

	calcDps: function (target, noSync) {
		if ((!this.values) || (this.spellType === 'buff') || (this.spellType === 'aura'))
			return;

		if ((!this.damage) && (!this.healing))
			delete this.values.dps;
		else {
			let noMitigate = !target;

			let cdMax = this.cdMax;

			//If a spell has no cast time, attack/cast speed start influencing its cooldown
			if (this.castTimeMax === 0) {
				const _speedModifier = this.obj.stats.values[this.isAttack ? 'attackSpeed' : 'castSpeed'];
				cdMax = Math.max(1, Math.ceil(cdMax * (1 - (_speedModifier / 100))));
			}

			let dmg = combat.getDamage({
				source: this.obj,
				target: (target || {
					stats: {
						values: {}
					}
				}),
				spellType: this.type,
				castTime: this.castTimeMax,
				damage: (this.healing ?? this.damage) * (this.dmgMult ?? 1),
				cd: cdMax,
				element: this.element,
				statType: this.statType,
				noMitigate: noMitigate,
				isAttack: this.isAttack,
				duration: this.values.duration,
				noCrit: true
			}).amount;

			let statValues = this.obj.stats.values;

			let critChance = statValues.critChance + (this.isAttack ? statValues.attackCritChance : statValues.spellCritChance);
			let critMultiplier = statValues.critMultiplier + (this.isAttack ? statValues.attackCritMultiplier : statValues.spellCritMultiplier);

			let castTimeMax = this.castTimeMax;
			let speedModifier = this.obj.stats.values[this.isAttack ? 'attackSpeed' : 'castSpeed'];
			castTimeMax = Math.ceil(castTimeMax * (1 - (Math.min(50, speedModifier) / 100)));
			critChance = Math.min(critChance, 100);
			dmg = (((dmg / 100) * (100 - critChance)) + (((dmg / 100) * critChance) * (critMultiplier / 100)));
			let duration = this.values.duration;
			if (duration) 
				dmg *= duration;

			const div = (this.cdMax + castTimeMax) || 1;
			dmg /= div;

			if (this.damage) 
				this.values.dmg = ~~(dmg * 100) / 100;
			else
				this.values.heal = ~~(dmg * 100) / 100;

			if (!noSync)
				this.obj.syncer.setArray(true, 'spellbook', 'getSpells', this.simplify());
		}
	},

	sendAnimation: function (blueprint) {
		this.obj.instance.syncer.queue('onGetObject', blueprint, -1);
	},

	sendBump: function (target, deltaX, deltaY) {
		if (target) {
			let x = this.obj.x;
			let y = this.obj.y;

			let tx = target.x;
			let ty = target.y;

			if (tx < x)
				deltaX = -1;
			else if (tx > x)
				deltaX = 1;

			if (ty < y)
				deltaY = -1;
			else if (ty > y)
				deltaY = 1;
		}

		let components = [{
			type: 'bumpAnimation',
			deltaX: deltaX,
			deltaY: deltaY
		}];

		//During casting we only bump
		if ((target) && (this.animation)) {
			components.push({
				type: 'animation',
				template: this.animation
			});
		}

		this.obj.instance.syncer.queue('onGetObject', {
			id: this.obj.id,
			components: components
		}, -1);
	},

	simplify: function (self) {
		let values = {};
		for (let p in this) {
			let value = this[p];
			let type = typeof(value);

			if (
				type === 'undefined' ||
				type === 'function' || 
				(
					type === 'number' &&
					isNaN(value)
				) ||
				['obj', 'currentAction', 'events'].includes(p)
			)
				continue;

			if (p === 'autoActive')
				value = value !== null && value !== false;

			values[p] = value;
		}

		if (this.animation)
			values.animation = this.animation.name;
		if (this.values)
			values.values = this.values;

		if (this.onAfterSimplify)
			this.onAfterSimplify(values);

		return values;
	},

	getDamage: function (target, noMitigate, extraConfig) {
		let cdMax = this.cdMax;

		//If a spell has no cast time, attack/cast speed start influencing its cooldown
		if (this.castTimeMax === 0) {
			const speedModifier = this.obj.stats.values[this.isAttack ? 'attackSpeed' : 'castSpeed'];
			cdMax = Math.max(1, Math.ceil(cdMax * (1 - (speedModifier / 100))));
		}

		const config = {
			source: this.obj,
			target: target,
			damage: (this.healing ?? this.damage) * (this.dmgMult ?? 1),
			cd: cdMax,
			spellType: this.type,
			castTime: this.castTimeMax,
			element: this.element,
			statType: this.statType,
			isAttack: this.isAttack,
			noScale: this.noScale,
			noMitigate: noMitigate,
			spell: this,
			scaleConfig: this.scaleConfig,
			duration: this.values?.duration,
			...extraConfig
		};

		if (this.obj.mob)
			config.noCrit = true;

		this.obj.fireEvent('onBeforeCalculateDamage', config);

		if (this.percentDamage)
			config.damage = target.stats.values.hpMax * this.damage;

		const damage = combat.getDamage(config);

		this.obj.fireEvent('onAfterCalculateDamage', {
			damage
		});

		return damage;
	},

	queueCallback: function (callback, delay, destroyCallback, target, destroyOnRezone) {
		return this.obj.spellbook.registerCallback(this.obj.id, callback, delay, destroyCallback, target ? target.id : null, destroyOnRezone);
	},

	calculateCastTimeMax: function ({ isAttack, statValues, castTimeMax: originalCastTime }) {
		const speedModifier = statValues[isAttack ? 'attackSpeed' : 'castSpeed'];

		let castTimeMax = Math.max(0, originalCastTime * (1 - (speedModifier / 100)));
		if (castTimeMax > 1) {
		//If remainder is less than 0.4, floor the value
			if (castTimeMax - ~~castTimeMax < 0.4)
				castTimeMax = ~~castTimeMax;
			else
				castTimeMax = Math.ceil(castTimeMax);
		} else if (castTimeMax < 0.1) {
		//If remainder is less than 0.1, make it 0
			castTimeMax = 0;
		} else
			castTimeMax = Math.ceil(castTimeMax);

		let usedSpeed = speedModifier === 0 ?
			0 :
			((1 - castTimeMax) / originalCastTime) * 100;

		//Since speed < 1.4 jumps to 1, and speed < 0.1 jumps to 0, we need to compensate
		if (usedSpeed > speedModifier)
			usedSpeed = speedModifier;

		return {
			castTimeMax,
			usedSpeed
		};
	},

	die: function () {
		delete this.castingInfo;

		//We unregister callbacks where we are the source OR the target
		this.obj.spellbook.unregisterCallback(this.obj.id);
		this.obj.spellbook.unregisterCallback(this.obj.id, true);
	}
};
