let generator = require('../../../../items/generator');

module.exports = (obj, items) => {
	const [itemA, itemB, itemC] = items;

	//Check if the items are unique
	if (itemA.id === itemB.id || itemA.id === itemC.id || itemB.id === itemC.id) {
		return {
			msg: 'You must pick three different items.',
			success: false
		};
	}

	//Get an array of all stats that aren't enchanted stats
	const combinedStats = [];
	items.forEach(item => {
		Object.entries(item.stats).forEach(([stat, value]) => {
			if (value > (item?.enchantedStats?.[stat] ?? 0))
				combinedStats.push(stat);
		});
	});

	//Check if any stat occurs more than once
	const duplicateStats = [];
	combinedStats.forEach(s => {
		if (combinedStats.filter(f => f === s).length === 3 && !duplicateStats.includes(s))
			duplicateStats.push(s);
	});

	if (duplicateStats.length === 0) {
		return {
			msg: 'All items must have at least one stat in common. Enchanted stats are not taken into consideration.',
			success: false
		};
	}

	const uniqueStats = [];
	combinedStats.forEach(c => {
		if (!uniqueStats.includes(c))
			uniqueStats.push(c);
	});

	//Choose a random stat
	const pickStat = uniqueStats[~~(Math.random() * uniqueStats.length)];

	//Destroy the items
	items.forEach(({ id: itemId }) => {
		obj.inventory.destroyItem({ itemId });
	});

	//Create the Charged Idol
	const idol = generator.generate({
		currency: true,
		name: 'Charged Arcane Idol'
	});
	idol.name = idol.name += ` of ${pickStat}`;
	idol.applyStat = pickStat;

	//Give the Charged Idol to the player
	obj.inventory.getItem(idol);

	return {
		msg: `You created a [${idol.name}].`,
		itemsDestroyed: true
	};
};
