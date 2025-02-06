let generatorStats = require('../../../../items/generators/stats');

module.exports = (oldQuality, newQuality, obj, [item]) => {
	if (item.quality !== oldQuality)
		return;

	item.quality = newQuality;

	const result = {
		msg: 'Ascend successful',
		addStatMsgs: [],
		addToEnchantedStats: false
	};

	generatorStats.generate(item, {
		statCount: 1
	}, result);

	return result;
};
