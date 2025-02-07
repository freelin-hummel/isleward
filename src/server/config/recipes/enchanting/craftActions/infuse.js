let generatorStats = require('../../../../items/generators/stats');

module.exports = (obj, [item, idol]) => {
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

	obj.inventory.destroyItem({ itemId: idol.id }, 1);

	obj.syncer.deleteFromArray(true, 'inventory', 'getItems', i => i.id === item.id);
	obj.syncer.setArray(true, 'inventory', 'getItems', obj.inventory.simplifyItem(item), true);

	return result;
};
