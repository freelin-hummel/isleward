let statsFishingRod = require('./statsFishingRod');

module.exports = {
	generators: {
		elementDmgPercent: function (item, level, blueprint, perfection, calcPerfection) {
			let max = level * 0.25;
			if (item.slot === 'twoHanded')
				max *= 2;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.elementDmgPercent ?? 1);

			return max * perfection * (blueprint.statMult?.elementDmgPercent ?? 1);
		},

		addCritMultiplier: function (item, level, blueprint, perfection, calcPerfection) {
			let div = 1 / 11;
			if (item.slot === 'twoHanded')
				div *= 2;

			const min = (level * 4.3) * div;
			const max = (level * 8.6) * div;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.addCritMultiplier ?? 1);

			return (min + ((max - min) * perfection)) * (blueprint.statMult?.addCritMultiplier ?? 1);
		},

		addCritChance: function (item, level, blueprint, perfection, calcPerfection) {
			let div = 1 / 11;
			if (item.slot === 'twoHanded')
				div *= 2;

			const min = level * 13.75 * div;
			const max = level * 27.5 * div;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.addCritChance ?? 1);

			return (min + ((max - min) * perfection)) * (blueprint.statMult?.addCritChance ?? 1);
		},

		vit: function (item, level, blueprint, perfection, calcPerfection) {
			let max = level / 2;

			if (item.slot === 'twoHanded')
				max *= 2;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.vit ?? 1);

			return max * perfection * (blueprint.statMult?.vit ?? 1);
		},

		mainStat: function (item, level, blueprint, perfection, calcPerfection) {
			let div = 1 / 11;
			if (item.slot === 'twoHanded')
				div *= 2;

			let min = (level / 3) * div;
			let max = (level * 6) * div;

			if (calcPerfection)
				return ((calcPerfection - min) / (max - min));
			else if (!perfection)
				return random.norm(min, max) * (blueprint.statMult?.mainStat ?? 1);

			return (min + ((max - min) * perfection)) * (blueprint.statMult?.mainStat ?? 1);
		},
		armor: function (item, level, blueprint, perfection, calcPerfection) {
			let min = (level * 20);
			let max = (level * 50);

			if (calcPerfection)
				return ((calcPerfection - min) / (max - min));
			else if (!perfection)
				return random.norm(min, max) * blueprint.statMult?.armor;

			return (min + ((max - min) * perfection)) * (blueprint.statMult?.armor ?? 1);
		},
		elementResist: function (item, level, blueprint, perfection, calcPerfection) {
			let div = 1 / 11;
			if (item.slot === 'twoHanded')
				div *= 2;

			if (calcPerfection)
				return (calcPerfection / (100 * div));
			else if (!perfection)
				return random.norm(1, 100) * (blueprint.statMult?.elementResist ?? 1) * div;

			return (1 + (99 * perfection)) * (blueprint.statMult?.elementResist ?? 1) * div;
		},
		regenHp: function (item, level, blueprint, perfection, calcPerfection) {
			let max = [
				1, 2, 2, 4, 4, 4, 5, 6, 7, 7,
				7, 10, 11, 11, 11, 12, 13, 13, 13, 14,
				14, 14, 15
			][level - 1];

			if (item.slot === 'twoHanded')
				max *= 2;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.regenHp ?? 1);

			return max * perfection * (blueprint.statMult?.regenHp ?? 1);
		},
		lvlRequire: function (item, level, blueprint, perfection, calcPerfection) {
			let max = level / 2;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.lvlRequire ?? 1);

			return max * perfection * (blueprint.statMult?.lvlRequire ?? 1);
		},
		lifeOnHit: function (item, level, blueprint, perfection, calcPerfection, statBlueprint) {
			let max = [
				0.5, 0.5, 1, 5, 5, 5, 5, 8, 8, 8,
				9, 13, 13, 13, 13, 17, 17, 17, 17, 21,
				21, 22, 22
			][level - 1];
			const min = 1;

			if (item.slot === 'twoHanded')
				max *= 2;

			if (calcPerfection)
				return ((calcPerfection - min) / max);
			else if (!perfection)
				return (min + random.norm(1, max)) * (blueprint.statMult?.lifeOnHit ?? 1);

			return (min + (max * perfection)) * (blueprint.statMult?.lifeOnHit ?? 1);
		},

		addDamage: function (item, level, blueprint, perfection, calcPerfection) {
			let max = Math.pow(level / balance.maxLevel, 3) * level * 3;
			if (item.slot === 'twoHanded')
				max *= 1.85;

			if (calcPerfection)
				return (calcPerfection / max);
			else if (!perfection)
				return random.norm(1, max) * (blueprint.statMult?.addDamage ?? 1);

			return max * perfection * (blueprint.statMult?.addDamage ?? 1);
		}
	},

	stats: {
		vit: {
			generator: 'vit'
		},
		regenHp: {
			generator: 'regenHp'
		},

		manaMax: {
			min: 1,
			max: 8
		},

		regenMana: {
			min: 1,
			max: 5
		},

		lvlRequire: {
			level: {
				min: 5
			},
			generator: 'lvlRequire'
		},

		str: {
			generator: 'mainStat'
		},
		int: {
			generator: 'mainStat'
		},
		dex: {
			generator: 'mainStat'
		},

		elementArcaneResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},
		elementFrostResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},
		elementFireResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},
		elementHolyResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},
		elementPoisonResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},
		elementAllResist: {
			level: {
				min: 7
			},
			generator: 'elementResist'
		},

		elementArcanePercent: {
			generator: 'elementDmgPercent'
		},
		elementFrostPercent: {
			generator: 'elementDmgPercent'
		},
		elementFirePercent: {
			generator: 'elementDmgPercent'
		},
		elementHolyPercent: {
			generator: 'elementDmgPercent'
		},
		elementPoisonPercent: {
			generator: 'elementDmgPercent'
		},
		physicalPercent: {
			generator: 'elementDmgPercent'
		},
		elementPercent: {
			generator: 'elementDmgPercent'
		},
		spellPercent: {
			generator: 'elementDmgPercent'
		},

		addAttackDamage: {
			generator: 'addDamage'
		},

		addSpellDamage: {
			generator: 'addDamage'
		},

		allAttributes: {
			generator: 'mainStat',
			slots: ['finger', 'neck']
		},

		attackSpeed: {
			min: 1,
			max: 4,
			slots: ['neck', 'finger', 'trinket']
		},

		castSpeed: {
			min: 1,
			max: 4,
			slots: ['neck', 'finger', 'trinket']
		},

		lifeOnHit: {
			slots: ['offHand', 'trinket'],
			generator: 'lifeOnHit'
		},

		armor: {
			generator: 'armor',
			ignore: true
		},

		blockAttackChance: {
			min: 1,
			max: 10,
			ignore: true
		},

		blockSpellChance: {
			min: 1,
			max: 10,
			ignore: true
		},

		dodgeAttackChance: {
			min: 1,
			max: 10,
			slots: ['feet']
		},

		dodgeSpellChance: {
			min: 1,
			max: 10,
			slots: ['feet']
		},

		addCritChance: {
			generator: 'addCritChance'
		},
		addCritMultiplier: {
			generator: 'addCritMultiplier'
		},

		addAttackCritChance: {
			generator: 'addCritChance'
		},
		addAttackCritMultiplier: {
			generator: 'addCritMultiplier'
		},

		addSpellCritChance: {
			generator: 'addCritChance'
		},
		addSpellCritMultiplier: {
			generator: 'addCritMultiplier'
		},

		magicFind: {
			min: 1,
			max: 15
		},

		itemQuantity: {
			min: 2,
			max: 27
		},

		xpIncrease: {
			min: 1,
			max: 6
		},

		sprintChance: {
			min: 1,
			max: 20,
			slots: ['feet']
		}
	},

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
			item.stats[s] = Math.ceil(item.stats[s]);
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
			const level = Math.min(balance.maxLevel, item.originalLevel || item.level);
			value = this.generators[statBlueprint.generator](item, level, blueprint, blueprint.perfection, null, statBlueprint);
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

					const blueprint = {
						statMult: {
							[i.stat]: i.valueMult
						}
					};

					const itemLevel = Math.min(balance.maxLevel, item.level);
					stat.value = Math.ceil(generator(item, itemLevel, blueprint, perfection));
				} else
					stat.value = Math.ceil(random.norm(statBlueprint.min, statBlueprint.max) * i.valueMult);
			}
				
			if (!item.implicitStats)
				item.implicitStats = [];

			item.implicitStats.push(stat);
		});
	}
};
