const spellCastResultTypes = require('./spellCastResultTypes');

const messages = {
	outOfRange: 'Target out of range',
	insufficientMana: 'Not enough mana',
	noTarget: 'No target selected',
	invalidTarget: 'Invalid target selected',
	noLineOfSight: 'Target not in line of sight',
	spellNotFound: 'Unknown spell',
	onCooldown: 'Spell is on cooldown'
};

const exportMap = {
	...messages,
	...Object.entries(spellCastResultTypes)
		.filter(([key]) => key !== 'success')
		.reduce((acc, [key, value]) => {
			acc[value] = messages[key] || key;

			return acc;
		}, {})
};

module.exports = exportMap;
