/* eslint-disable max-lines-per-function */

const itemTypes = require('../items/config/types');
const spellGenerator = require('../items/generators/spellbook');
const statGenerator = require('../items/generators/stats');
const effectGenerator = require('../items/generators/effects');
const { getByName: getItemConfigByName } = require('../config/itemConfig');
const { spells: spellsConfig } = require('../config/spellsConfig');

module.exports = {
	fixCharacterList: function (username, characterList) {
		let didChange = false;

		characterList.forEach((l, i) => {
			if (typeof(l) === 'object') {
				characterList[i] = l.name;
				didChange = true;
			}
		});

		if (!didChange)
			return;

		io.setAsync({
			table: 'characterList',
			key: username,
			value: characterList,
			serialize: true
		});
	},

	fixCharacter: function (player) {
		const inventory = player.components.find(c => c.type === 'inventory');
		if (inventory?.items)
			this.fixItems(inventory.items);

		const stats = player.components.find(c => c.type === 'stats');
		if (stats?.values?.level > balance.maxLevel)
			stats.values.level = balance.maxLevel;
	},

	fixCustomChannels: function (customChannels) {
		return customChannels
			.filter(c => {
				return (
					c.length <= 15 &&
					c.match(/^[0-9a-zA-Z]+$/)
				);
			});
	},

	fixStash: function (stash) {
		this.fixItems(stash);
	},

	setItemRollRanges: function (item, doRescale) {
		if (item.material === true)
			return;

		const itemLevel = item.originalLevel ?? item.level;

		let rollRanges = item.rollRanges?.[consts.balanceVersion];
		rollRanges = rollRanges ?? {};
		if (!item.rollRanges)
			item.rollRanges = {};
		item.rollRanges[consts.balanceVersion] = rollRanges;

		if (item.spell?.rolls !== undefined) {
			const hasBeenRangedBefore = rollRanges.spellRolls !== undefined;
			if (!rollRanges.spellRolls)
				rollRanges.spellRolls = {};
			const negativeStats = spellsConfig[item.spell.name.toLowerCase()].negativeStats ?? [];
			Object.entries(item.spell.rolls).forEach(([k, v]) => {
				let useV = v;
				if (!hasBeenRangedBefore && doRescale) {
					if (negativeStats.includes(k))
						useV = 1 - ((1 - v) * (itemLevel / balance.maxLevel));
					else
						useV *= itemLevel / balance.maxLevel;
				}

				rollRanges.spellRolls[k] = useV;

				item.spell.rolls[k] = useV;
			});
		}

		if (!item.stats || item.effects || item.slot === 'tool')
			return;

		if (item.implicitStats !== undefined) {
			if (!rollRanges.implicitStats)
				rollRanges.implicitStats = {};

			item.implicitStats.forEach(({ stat, value }) => {
				let typeImplicits = itemTypes.types[item.slot][item.type]?.implicitStat;
				if (!typeImplicits) {
					/* eslint-disable-next-line no-console */
					console.log('No type found for', item.slot, item.type);

					return;
				}

				if (!Array.isArray(typeImplicits))
					typeImplicits = [typeImplicits];

				let blueprint = typeImplicits.find(f => f.stat === stat);
				if (!blueprint && item.type === 'Ring' && stat === 'allAttributes') {
					//Hack to be able to calculate rolls for Soul's Moor Rings
					blueprint = {
						stat: 'allAttributes',
						value: 8
					};
				}

				if (!blueprint) {
					/* eslint-disable-next-line no-console */
					console.log({
						error: 'No implicit blueprint found',
						item: item.name,
						stat,
						type: item.type,
						slot: item.slot
					});

					return;
				}

				if (Array.isArray(blueprint.value)) {
					let [min, max] = blueprint.value;
					if (blueprint.levelMult) {
						min *= itemLevel;
						max *= itemLevel;
					}
					rollRanges.implicitStats[stat] = (value - min) / (max - min);
				} else if (blueprint.value !== undefined)
					rollRanges.implicitStats[stat] = value / blueprint.value;
				else {
					const testItem = {
						type: item.type,
						slot: item.slot,
						level: itemLevel,
						stats: {}
					};

					statGenerator.buildStat(testItem, { perfection: 0 }, stat);
					const min = Math.max(1, Math.round(testItem.stats[stat]) * blueprint.valueMult);
					testItem.stats = {};

					statGenerator.buildStat(testItem, { perfection: 1 }, stat);
					const max = Math.max(1, Math.round(testItem.stats[stat]) * blueprint.valueMult);

					let roll;
					if (min === max)
						roll = value / max;
					else
						roll = (value - min) / (max - min);

					rollRanges.implicitStats[stat] = roll;
				}
			});
		}

		if (item.enchantedStats !== undefined && item.enchantedStats !== null) {
			if (!rollRanges.enchantedStats)
				rollRanges.enchantedStats = {};

			Object.entries(item.enchantedStats).forEach(([stat, value]) => {
				const testItem = {
					type: item.type,
					slot: item.slot,
					level: itemLevel,
					stats: {}
				};

				statGenerator.buildStat(testItem, { perfection: 0 }, stat);
				const min = Math.max(1, Math.round(testItem.stats[stat]));
				testItem.stats = {};

				statGenerator.buildStat(testItem, { perfection: 1 }, stat);
				const max = Math.max(1, Math.round(testItem.stats[stat]));

				let roll;
				if (min === max)
					roll = value / max;
				else
					roll = (value - min) / (max - min);

				rollRanges.enchantedStats[stat] = roll;
			});
		}

		if (item.stats !== undefined) {
			if (!rollRanges.stats)
				rollRanges.stats = {};

			Object.entries(item.stats).forEach(([stat, value]) => {
				const testItem = {
					type: item.type,
					slot: item.slot,
					level: itemLevel,
					stats: {}
				};

				statGenerator.buildStat(testItem, { perfection: 0 }, stat);
				const min = Math.max(1, Math.round(testItem.stats[stat]));
				testItem.stats = {};

				statGenerator.buildStat(testItem, { perfection: 1 }, stat);
				const max = Math.max(1, Math.round(testItem.stats[stat]));

				let useValue = value;
				if (item.enchantedStats?.[stat] !== undefined)
					useValue -= item.enchantedStats[stat];

				if (useValue === 0)
					return;

				let roll;
				if (min === max)
					roll = useValue / max;
				else
					roll = (useValue - min) / (max - min);

				rollRanges.stats[stat] = roll;
			});
		}
	},

	fixItems: function (items) {
		//There are some bugged mounts with cdMax: 0. Set that to 86 as 86 is the new CD (down from 171)
		items
			.filter(i => i.type === 'mount')
			.forEach(i => {
				i.cdMax = 86;
			});

		items
			.filter(i => i.name === 'Candy Corn')
			.forEach(i => {
				i.noDrop = true;
			});

		items
			.filter(i => i.name === 'Milkwort')
			.forEach(i => {
				i.noDrop = false;
				i.noDestroy = false;
			});

		items
			.filter(i => i.name === 'Enchanted Wreath')
			.forEach(i => {
				delete i.noDrop;
				delete i.noDestroy;
			});

		items
			.filter(i => (i.name === 'Elixir of Infatuation'))
			.forEach(function (i) {
				i.cdMax = 342;
				i.sprite = [1, 0];
			});

		items
			.filter(i => i.name === 'Squashling Vine')
			.forEach(i => {
				i.petSheet = 'server/mods/iwd-souls-moor/images/skins.png';
				i.petCell = 16;
			});

		items
			.filter(i => ((i.name === 'Cowl of Obscurity') && (!i.factions)))
			.forEach(function (i) {
				i.factions = [{
					id: 'gaekatla',
					tier: 7
				}];
			});

		items
			.filter(i => i.stats && i.stats.magicFind > 135)
			.forEach(i => {
				let value = '' + i.stats.magicFind;
				i.stats.magicFind = ~~(value.substr(value.length - 2));
			});

		items
			.filter(i => (
				i.enchantedStats && 
				i.slot !== 'tool' && 
				Object.keys(i.enchantedStats).some(e => e.indexOf('catch') === 0 || e.indexOf('fish') === 0)
			))
			.forEach(function (i) {
				let enchanted = i.enchantedStats;
				let stats = i.stats;
				Object.keys(enchanted).forEach(e => {
					if (e.indexOf('catch') === 0 || e.indexOf('fish') === 0) {
						delete stats[e];
						delete enchanted[e];
					}
				});

				if (!Object.keys(enchanted).length)
					delete i.enchantedStats;
			});

		items
			.filter(i => i.factions && i.factions.indexOf && i.factions.some(f => f.id === 'pumpkinSailor') && i.slot === 'finger')
			.forEach(i => {
				i.noDestroy = false;
			});

		items
			.filter(i => i.name === 'Gourdhowl')
			.forEach(i => {
				const effect = i.effects[0];

				if (!effect.rolls.castSpell) {
					effect.rolls = {
						castSpell: {
							type: 'whirlwind',
							damage: effect.rolls.damage,
							range: 1,
							statType: 'str',
							isAttack: true
						},
						castTarget: 'none',
						chance: effect.rolls.chance,
						textTemplate: 'Grants you a ((chance))% chance to cast a ((castSpell.damage)) damage whirlwind on hit',
						combatEvent: {
							name: 'afterDealDamage',
							afterDealDamage: {
								spellName: 'melee'
							}
						}
					};
				}
			});

		items
			.filter(i => i.name === 'Putrid Shank')
			.forEach(i => {
				const effect = i.effects[0];

				if (!effect.rolls.castSpell) {
					effect.rolls = {
						chance: effect.rolls.chance,
						textTemplate: 'Grants you a ((chance))% chance to cast a ((castSpell.damage)) damage smokebomb on hit',
						combatEvent: {
							name: 'afterDealDamage',
							afterDealDamage: {
								spellName: 'melee'
							}
						},
						castTarget: 'none',					
						castSpell: {
							type: 'smokeBomb',
							damage: 1,
							range: 1,
							element: 'poison',
							statType: 'dex',
							duration: 5,
							isAttack: true
						}
					};
				}

				if (effect.rolls.castSpell.type === 'smokebomb')
					effect.rolls.castSpell.type = 'smokeBomb';
			});

		items
			.filter(i =>
				i.name === 'Princess Morgawsa\'s Trident' &&
				(
					i.type !== 'Trident' ||
					i.spell.type !== 'projectile'
				)
			)
			.forEach(i => {
				i.type = 'Trident';
				i.requires[0].stat = 'int';

				delete i.implicitStats;

				const typeConfig = itemTypes.types[i.slot][i.type];
				spellGenerator.generate(i, {
					...typeConfig,
					spellQuality: i.spell.quality
				});
			});

		items
			.filter(i =>
				i.name === 'Steelclaw\'s Bite' &&
				(
					i.type !== 'Curved Dagger' ||
					i.spell.type !== 'melee'
				)
			)
			.forEach(i => {
				i.type = 'Curved Dagger';
				i.requires[0].stat = 'dex';

				delete i.implicitStats;

				const typeConfig = itemTypes.types[i.slot][i.type];
				spellGenerator.generate(i, {
					...typeConfig,
					spellQuality: i.spell.quality
				});
			});

		items
			.filter(f => f.effects?.[0]?.factionId === 'akarei' && !f.effects[0].properties)
			.forEach(function (i) {
				let effect = i.effects[0];
				let chance = parseFloat(effect.text.split(' ')[0].replace('%', ''));

				effect.properties = {
					chance: chance
				};
			});

		items
			.filter(f => ((f.stats) && (f.stats.dmgPercent)))
			.forEach(function (i) {
				i.stats.physicalPercent = i.stats.dmgPercent;
				delete i.stats.dmgPercent;

				if ((i.enchantedStats) && (i.enchantedStats.dmgPercent)) {
					i.enchantedStats.physicalPercent = i.enchantedStats.dmgPercent;
					delete i.enchantedStats.dmgPercent;
				}
			});

		//Fix all weapon damage ranges
		items
			.filter(f => f.spell !== undefined && f.slot !== undefined)
			.forEach(item => {
				//There are items with invalid slot/type combinations
				const spellConfig = itemTypes.types[item.slot]?.[item.type]?.spellConfig;
				if (!spellConfig)
					return;

				//We are slowly removing statMult from everything (Should just be 1 on everything implicitly)
				delete item.spell.statMult;

				//Ensure type scaling is corrected on old items
				item.spell.cdMax = spellConfig.cdMax;
				item.spell.castTimeMax = spellConfig.castTimeMax;
				item.spell.random.damage = [...spellConfig.random.damage];

				//Reroll values with nw ranges
				spellGenerator.generateRollValues(item, item.spell, item.spell.rolls);
			});

		//Fix all item effects for items present in itemConfig
		items.forEach(item => {
			const itemConfig = getItemConfigByName(item.name);
			if (!itemConfig)
				return;

			const effectsToRemove = [];
			const effectsToAdd = [];
			const effectsToScale = [];

			itemConfig.effects.forEach(eNew => {
				const eOld = item.effects.find(f => f.type === eNew.type);

				if (!eOld)
					effectsToAdd.push(eNew);
				else {
					effectsToScale.push({
						eOld: eOld,
						eNew: eNew
					});
				}
			});

			item.effects.forEach(eOld => {
				const eNew = itemConfig.effects.find(f => f.type === eOld.type);

				if (!eNew)
					effectsToRemove.push(eOld);
			});

			effectsToRemove.forEach(e => item.effects.spliceWhere(f => f === e));

			if (effectsToAdd.length > 0) {
				const proxyItem = {};
				effectGenerator.generate(proxyItem, itemConfig);

				effectsToAdd.forEach(e => {
					item.effects.push(proxyItem.effects.find(f => f.type === e.type));
				});
			}

			if (effectsToScale.length > 0) {
				const proxyItem = {};
				effectGenerator.generate(proxyItem, itemConfig);

				effectsToScale.forEach(({ eOld, eNew }) => {
					Object.entries(eOld.rolls).forEach(([k, currentRoll]) => {
						const rollConfig = eNew.rolls[k] ?? eNew.rolls[`i_${k}`];

						if (!Array.isArray(rollConfig))
							return;

						const [minRoll, maxRoll] = rollConfig;

						if (currentRoll < minRoll)
							eOld.rolls[k] = minRoll;
						else if (currentRoll > maxRoll)
							eOld.rolls[k] = maxRoll;
					});
				});
			}
		});

		items.forEach(item => {
			this.setItemRollRanges(item, true);
		});
	}
};
