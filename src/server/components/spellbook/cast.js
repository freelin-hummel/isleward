const targetIsOutOfRange = (action, spell, obj) => {
	if (spell.range === null || spell.range === undefined)
		return false;

	const distance = Math.max(Math.abs(action.target.x - obj.x), Math.abs(action.target.y - obj.y));
	let range = spell.range;
	if ((spell.useWeaponRange) && (obj.player)) {
		const weapon = obj.inventory.findItem(obj.equipment.eq.oneHanded) || obj.inventory.findItem(obj.equipment.eq.twoHanded);
		if (weapon)
			range = weapon.range || 1;
	}

	return distance > range;
};

const castAuto = (cpnSpellbook, action, isAuto, config, spell) => {
	if (!action.target || action.target.nonSelectable || action.target.destroyed)
		return false;

	const currentAutoSpell = cpnSpellbook.spells.find(s => !!s.autoActive);

	if (currentAutoSpell && action.target === spell.autoActive.target.id)
		currentAutoSpell.setAuto(null);
	else {
		spell.setAuto({
			target: action.target,
			spell: spell.id
		});
	}

	const syncSpell = spell.simplify();
	spell.obj.syncer.setArray(true, 'spellbook', 'getSpells', syncSpell);

	return true;
};
 
const cast = (cpnSpellbook, action, isAuto, config) => {
	const { obj, physics, spells } = cpnSpellbook;

	//Stop casting
	if (!config?.stopOtherCasting && !action.has('spell')) {
		const wasCasting = cpnSpellbook.isCasting();
		cpnSpellbook.stopCasting();

		//Consume a tick if we were casting
		return wasCasting;
	}

	const spell = spells.find(s => (s.id === action.spell));
	if (!spell)
		return false;

	//isAuto means that this method was called from spellbook.update (trying to auto-cast every tick). So when it's
	// false, it means the player called it and we need to toggle auto-cast instead.
	if (spell.auto && !isAuto)
		return castAuto(cpnSpellbook, action, isAuto, config, spell);

	action.target = cpnSpellbook.getTarget(spell, action);
	action.auto = spell.auto;

	//If a target has become nonSelectable, we need to stop attacks that are queued/auto
	if (!action.target || action.target.nonSelectable)
		return false;

	const manaCost = config?.overrides?.manaCost ?? spell.manaCost;

	let success = true;
	if (!config?.ignoreCooldown && spell.cd > 0)
		success = false;
	else if (manaCost > obj.stats.values.mana)
		success = false;
	else if (targetIsOutOfRange(action, spell, obj))
		success = false;

	//LoS check
	//Null means we don't have LoS and as such, we should move
	if (spell.needLos && success) {
		if (!physics.hasLos(~~obj.x, ~~obj.y, ~~action.target.x, ~~action.target.y))
			success = null;
	}

	if (!success)
		return false;
	const eventBeforeCastSpell = {
		success: true,
		action
	};
	obj.fireEvent('beforeCastSpell', eventBeforeCastSpell);
	if (!eventBeforeCastSpell.success)
		return false;

	if (spell.manaReserve) {
		const reserve = spell.manaReserve;

		if (reserve.percentage) {
			const reserveEvent = {
				spell: spell.name,
				reservePercent: reserve.percentage
			};
			obj.fireEvent('onBeforeReserveMana', reserveEvent);

			if (!spell.active) {
				if (1 - obj.stats.values.manaReservePercent < reserve.percentage) {
					cpnSpellbook.sendAnnouncement('Insufficient mana to cast spell');

					return false;
				} obj.stats.addStat('manaReservePercent', reserveEvent.reservePercent);
			} else
				obj.stats.addStat('manaReservePercent', -reserveEvent.reservePercent);
		}
	}

	if (spell.targetFurthest)
		spell.target = obj.aggro.getFurthest();
	else if (spell.targetRandom)
		spell.target = obj.aggro.getRandom();

	if (!!eventBeforeCastSpell.action.target?.effects) {
		const eventBeforeIsSpellTarget = {
			source: obj,
			spell,
			target: eventBeforeCastSpell.action.target
		};
		eventBeforeIsSpellTarget.target.fireEvent('beforeIsSpellTarget', eventBeforeIsSpellTarget);
		eventBeforeCastSpell.action.target = eventBeforeIsSpellTarget.target;
	}

	success = spell.castBase(eventBeforeCastSpell.action, config);
	cpnSpellbook.stopCasting(spell, true);

	if (success) {
		spell.consumeMana(config);

		if (!config?.ignoreCooldown)
			spell.setCd(success);
	}

	obj.fireEvent('afterCastSpell', {
		castSuccess: success,
		spell,
		action: eventBeforeCastSpell.action
	});

	//Spells with castTime return null when they start casting. It's not a failure, so we must tell objBase
	// that we used this tick
	return success !== false;
};

module.exports = cast;
	
