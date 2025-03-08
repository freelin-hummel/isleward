const generatorSpells = require('../../../../items/generators/spellbook');

module.exports = ([rollsMin, rollsMax], obj, [item]) => {
	if (!item.spell)
		return;

	const reforgeCount = rollsMin + ~~(Math.random() * (rollsMax - rollsMin + 1));

	const spellName = item.spell.name.toLowerCase();

	const clonedItem = extend({}, item);

	const oldDamage = item.spell.values.damage;

	for (let i = 0; i < reforgeCount; i++) {
		delete clonedItem.spell;
		generatorSpells.generate(clonedItem, {
			spellName
		});

		if (reforgeCount === 1 || clonedItem.spell.rolls.damage > item.spell.rolls.damage)
			Object.assign(item.spell, clonedItem.spell);
	}

	if (reforgeCount > 1 && item.spell.values.damage === oldDamage) {
		return {
			msg: 'Blessed Reforge failed to increase the damage'
		};
	}

	return {
		msg: `Reforged weapon to damage from: ${oldDamage} to ${item.spell.values.damage} (${reforgeCount}x rolls})`
	};
};
