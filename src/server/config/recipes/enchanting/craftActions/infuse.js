let generatorStats = require('../../../../items/generators/stats');

module.exports = (obj, [item, idol]) => {
	const originalItemLevel = item.originalLevel ?? item.level;

	item.infused = true;

	const result = {
		msg: 'Infusion successful',
		addStatMsgs: [],
		itemsDestroyed: true
	};

	generatorStats.generate(item, {
		statCount: 1,
		stats: [idol.applyStat]
	}, result);

	item.infusedStats = {
		[result.addStatMsgs[0].stat]: result.addStatMsgs[0].value
	};

	let newItemLevel = originalItemLevel;
	newItemLevel -= (item.stats?.lvlRequire ?? 0);
	if (newItemLevel < 1)
		newItemLevel = 1;

	if (newItemLevel === originalItemLevel) {
		delete item.originalLevel;

		item.level = newItemLevel;
	} else {
		if (!item.originalLevel)
			item.originalLevel = originalItemLevel;

		item.level = newItemLevel;
	}

	obj.inventory.destroyItem({ itemId: idol.id }, 1);

	obj.syncer.deleteFromArray(true, 'inventory', 'getItems', i => i.id === item.id);
	obj.syncer.setArray(true, 'inventory', 'getItems', obj.inventory.simplifyItem(item), true);

	return result;
};
