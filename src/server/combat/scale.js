//Prebound Methods
const mathRandom = Math.random.bind(Math);
const max = Math.max.bind(Math);

//Helpers
const scaleAddElement = (config, result) => {
	const { isAttack, srcValues, cd, duration } = config;
	const { addAttackDamage, addSpellDamage } = srcValues;

	const addDamage = isAttack ? addAttackDamage : addSpellDamage;
	let totalAdd = addDamage * cd;
	if (duration !== undefined)
		totalAdd /= duration;

	result.amount += totalAdd;
};

const scaleStatType = (config, result) => {
	const { statType, srcValues, scaleConfig } = config;

	if (!statType || scaleConfig?.statMult === false)
		return;

	let statValue = 0;

	if (!statType.push)
		statValue = srcValues[statType];
	else {
		statType.forEach(s => {
			statValue += srcValues[s];
		});
	}

	statValue = max(1, statValue);

	result.amount *= statValue;
};

const scalePercentMultipliers = ({ isAttack, elementName, srcValues, scaleConfig }, result) => {
	if (scaleConfig?.percentMult === false)
		return;

	const { dmgPercent = 0, physicalPercent = 0, spellPercent = 0 } = srcValues;

	let totalPercent = 100 + dmgPercent;	

	if (isAttack)
		totalPercent += physicalPercent;
	else
		totalPercent += spellPercent;

	if (elementName)
		totalPercent += (srcValues[elementName + 'Percent'] || 0);

	result.amount *= (totalPercent / 100);
};

const scaleCrit = ({ noCrit, isAttack, crit: forceCrit, srcValues, scaleConfig }, result) => {
	if (noCrit || scaleConfig?.critMult === false)
		return;

	const { critChance, attackCritChance, spellCritChance } = srcValues;
	const { critMultiplier, attackCritMultiplier, spellCritMultiplier } = srcValues;

	let totalCritChance = critChance;
	let totalCritMultiplier = critMultiplier;

	if (isAttack) {
		totalCritChance += attackCritChance;
		totalCritMultiplier += attackCritMultiplier;
	} else {
		totalCritChance += spellCritChance;
		totalCritMultiplier += spellCritMultiplier;
	}

	const didCrit = forceCrit || mathRandom() * 100 < totalCritChance;

	if (didCrit) {
		result.crit = true;
		result.amount *= (totalCritMultiplier / 100);
	}
};

//Method
const scale = (config, result) => {
	const { blocked, dodged } = result; 

	if (blocked || dodged || config.noScale)
		return;

	scaleStatType(config, result);
	scaleAddElement(config, result);
	scalePercentMultipliers(config, result);
	scaleCrit(config, result);
};

//Exports
module.exports = scale;
