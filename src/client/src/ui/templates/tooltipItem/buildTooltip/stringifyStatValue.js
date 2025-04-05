const percentageStats = [
	'addCritChance',
	'addCritMultiplier',
	'addAttackCritChance',
	'addAttackCritMultiplier',
	'addSpellCritChance',
	'addSpellCritMultiplier',
	'sprintChance',
	'xpIncrease',
	'blockAttackChance',
	'blockSpellChance',
	'dodgeAttackChance',
	'dodgeSpellChance',
	'attackSpeed',
	'castSpeed',
	'itemQuantity',
	'magicFind',
	'catchChance',
	'catchSpeed',
	'fishRarity',
	'fishWeight',
	'fishItems'
];

const stringifyStatValue = (statName, statValue) => {
	let res = statValue;
	if (statName.indexOf('CritChance') > -1)
		res = res / 20;

	if (percentageStats.includes(statName) || statName.indexOf('Percent') > -1 || (statName.indexOf('element') === 0 && statName.indexOf('Resist') === -1))
		res += '%';

	return res + '';
};

export default stringifyStatValue;
