//Imports
let factionBase = require('../factionBase');
let factions = require('../factions');

//Internals
const cache = {};

//Method
const getFactionBlueprint = factionId => {
	if (cache[factionId])
		return cache[factionId];

	let res = null;
	try {
		res = factions.getFaction(factionId);
	} catch (e) {
		console.error('Failed to load faction', factionId, e);
	}

	if (!res)
		return;

	res = extend({}, factionBase, res);

	cache[factionId] = res;

	return res;
};

module.exports = {
	getFactionBlueprint
};
