//Prebound Methods
const max = Math.max.bind(Math);

//Helpers
const mitigateResistances = ({ elementName, noMitigate, tgtValues }, result) => {
	//Don't mitigate physical damage
	if (!elementName)
		return;

	const resist = tgtValues[elementName + 'Resist'] || 0;

	const resistanceMultiplier = max(0.5 + max((1 - (resist / 100)) / 2, -0.5), 0.5);

	result.amount *= resistanceMultiplier;
};

const mitigateArmor = ({ element, tgtValues, srcValues }, result) => {
	//Don't mitigate elemental damage
	if (element)
		return;

	const armorMultiplier = max(0.5 + max((1 - ((tgtValues.armor || 0) / (srcValues.level * 50))) / 2, -0.5), 0.5);

	result.amount *= armorMultiplier;
};

//Method
const mitigate = (config, result) => {
	const { blocked, dodged } = result; 

	//Heals, among other things, should not be mitigated
	if (blocked || dodged || config.noMitigate)
		return;

	mitigateResistances(config, result);
	mitigateArmor(config, result);
};

//Exports
module.exports = mitigate;
