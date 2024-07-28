const generators = require('./stats/generators');
const itemStatBalance = require('./stats/itemStatBalance');

let statsFishingRod = require('./statsFishingRod');

module.exports = {
	generators,

	stats: itemStatBalance,

	getPossibleStats: function (item, blueprint) {
		const res = Object.keys(this.stats).filter(s => {
			const bpt = this.stats[s];

			return (
				(
					blueprint.ignoreStats === undefined ||
					!blueprint.ignoreStats.includes(s)
				) &&
				(
					bpt.level === undefined ||
					(
						(bpt.level.min ?? 1) <= item.level &&
						(bpt.level.max ?? balance.maxLevel) >= item.level
					)
				) &&
				(
					bpt.slots === undefined ||
					bpt.slots.includes(item.slot)
				)
			);
		});

		return res;
	},

	generate: function (item, blueprint, result) {
		if (item.slot === 'tool') {
			statsFishingRod.generate(item, blueprint, result);

			return;
		}

		if (!blueprint.statCount || !item.stats)
			item.stats = {};

		if (blueprint.noStats)
			return;

		let statCount = blueprint.statCount ?? (item.quality + 1);

		//Force stats should always be rolled on an item, even if said stat should be ignored or can't occur on a slot
		if (blueprint.forceStats) {
			const clonedStats = extend([], blueprint.stats);
			let len = Math.min(statCount, clonedStats.length);
			for (let i = 0; i < len; i++) {
				const choice = clonedStats[~~(Math.random() * clonedStats.length)];
				clonedStats.spliceFirstWhere(s => s === choice);

				this.buildStat(item, blueprint, choice, result);

				statCount--;
			}
		}

		if (blueprint.implicitStat !== undefined)
			this.buildImplicitStats(item, blueprint);

		const possibleStats = this.getPossibleStats(item, blueprint);

		//If we send an array of stats, they can only be rolled if they may occur naturally on a slot
		if (blueprint.stats) {		
			const useStats = blueprint.stats.filter(s => (
				possibleStats.includes(s) ||
				(
					s.includes('|') &&
					possibleStats.includes(s.split[0])
				)
			));

			let len = Math.min(statCount, blueprint.stats.length);

			for (let i = 0; i < len; i++) {
				const choice = useStats[~~(Math.random() * useStats.length)];
				useStats.spliceFirstWhere(s => s === choice);
				if (!choice)
					break;

				this.buildStat(item, blueprint, choice, result);

				statCount--;
			}
		}

		for (let i = 0; i < statCount; i++) {
			const choice = possibleStats[~~(Math.random() * possibleStats.length)];

			this.buildStat(item, blueprint, choice, result);
		}

		for (let s in item.stats) {
			item.stats[s] = Math.round(item.stats[s]);
			if (item.stats[s] === 0)
				delete item.stats[s];
		}
	},

	buildStat: function (item, blueprint, stat, result) {
		const statBlueprint = this.stats[stat];

		let value = null;

		if (stat.includes('|')) {
			const split = stat.split('|');
			stat = split[0];
			value = ~~split[1];
		} else if (statBlueprint.generator !== undefined) {
			const itemLevel = Math.min(balance.maxLevel, item.originalLevel ?? item.level);
			value = this.generators[statBlueprint.generator](item, itemLevel, blueprint.perfection);
		} else if (blueprint.perfection === undefined)
			value = random.norm(statBlueprint.min, statBlueprint.max);
		else
			value = statBlueprint.min + ((statBlueprint.max - statBlueprint.min) * blueprint.perfection);

		if ((result) && (result.addStatMsgs)) {
			result.addStatMsgs.push({
				stat: stat,
				value: value
			});

			if (!item.enchantedStats)
				item.enchantedStats = {};
			if (item.enchantedStats[stat])
				item.enchantedStats[stat] += value;
			else
				item.enchantedStats[stat] = value;
		}

		if (stat === 'lvlRequire') {
			if (!item.originalLevel)
				item.originalLevel = item.level;

			item.level -= value;
			if (item.level < 1)
				item.level = 1;
		}

		if (item.stats[stat] === undefined)
			item.stats[stat] = value;
		else
			item.stats[stat] += value;
	},

	buildImplicitStats: function (item, { implicitStat: implicits, perfection }) {
		implicits = implicits.push ? implicits : [ implicits ];
		implicits.forEach(i => {
			let stat = {
				stat: i.stat
			};

			if (i.value) {
				const [min, max] = i.value;

				if (perfection === undefined)
					stat.value = Math.ceil(random.expNorm(min, max));
				else
					stat.value = Math.ceil(min + ((max - min) * perfection));
			} else if (i.valueMult) {
				let statBlueprint = this.stats[i.stat];

				if (statBlueprint.generator) {
					const generator = this.generators[statBlueprint.generator];

					const itemLevel = Math.min(balance.maxLevel, item.originalLevel ?? item.level);
					stat.value = Math.ceil(generator(item, itemLevel, perfection) * i.valueMult);
				} else
					stat.value = Math.ceil(random.norm(statBlueprint.min, statBlueprint.max) * i.valueMult);
			}
				
			if (!item.implicitStats)
				item.implicitStats = [];

			item.implicitStats.push(stat);
		});
	}
};
