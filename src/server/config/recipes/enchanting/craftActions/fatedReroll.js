let statGenerator = require('../../../../items/generators/stats');

module.exports = (obj, [item]) => {
	const newItem = extend({}, item);

	const allowedStatPicks = Object.keys(newItem.stats);
	const toRemove = [];
	allowedStatPicks.forEach(s => {
		const actualValue = newItem.stats[s] - (newItem.enchantedStats?.[s] ?? 0);
		if (actualValue <= 0)
			toRemove.push(s);
	});

	toRemove.forEach(t => allowedStatPicks.spliceWhere(f => f === t));

	if (allowedStatPicks.length === 0) {
		return {
			msg: 'That item does not have any explicit stats'
		};
	}

	const chosenStat = allowedStatPicks[~~(Math.random() * allowedStatPicks.length)];
	
	const testItem = extend({}, newItem);
	testItem.stats = {};

	statGenerator.buildStat(testItem, { perfection: 0 }, chosenStat);
	const min = Math.max(1, Math.round(testItem.stats[chosenStat]));
	testItem.stats = {};

	statGenerator.buildStat(testItem, { perfection: 1 }, chosenStat);
	const max = Math.max(1, Math.round(testItem.stats[chosenStat]));

	const oldValue = newItem.stats[chosenStat] - (item.enchantedStats?.[chosenStat] ?? 0);

	let roll;
	if (min === max)
		roll = oldValue / max;
	else
		roll = (oldValue - min) / (max - min);

	if (roll < 0)
		roll = 0;

	let statCount = 1;
	if (roll >= 1.95)
		statCount = 4;
	else if (roll >= 1.45)
		statCount = 3;
	else if (roll >= 0.95)
		statCount = 2;

	const result = { msg: 'Fated Reroll successful', addStatMsgs: [] };

	let newChosenStat;

	do {
		result.addStatMsgs.length = 0;
		statGenerator.generate(newItem, {
			statCount: 1
		}, result);

		newChosenStat = result.addStatMsgs[0].stat;
	} while (newChosenStat === chosenStat);

	newItem.stats = {};

	result.addStatMsgs.length = 0;

	statGenerator.generate(newItem, {
		statCount,
		stats: (new Array(statCount)).fill(newChosenStat)
	}, result);

	item.stats[chosenStat] = 0;
	item.stats[chosenStat] += (item.enchantedStats?.[chosenStat] ?? 0);
	if (item.stats[chosenStat] === 0)
		delete item.stats[chosenStat];

	const newStatValueBefore = item.stats[newChosenStat] ?? 0;
	item.stats[newChosenStat] = newStatValueBefore;
	result.addStatMsgs.forEach(s => {
		item.stats[newChosenStat] += s.value;
	});

	return result;
};
