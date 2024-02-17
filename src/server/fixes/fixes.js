/* eslint-disable max-lines-per-function */

const itemTypes = require('../items/config/types');
const spellGenerator = require('../items/generators/spellbook');

module.exports = {
	fixDb: async function () {
		await io.deleteAsync({
			key: 'list',
			table: 'leaderboard'
		});
	},

	fixCharacter: function (player) {
		let inv = player.components.find(c => (c.type === 'inventory'));
		if ((inv) && (inv.items))
			this.fixItems(inv.items);
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
			.filter(i => (i.name === 'Steelclaw\'s Bite'))
			.forEach(function (i) {
				let effect = i.effects[0];

				if (!effect.properties) {
					effect.properties = {
						element: 'poison'
					};
				} else if (!effect.properties.element)
					effect.properties.element = 'poison';
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
							statMult: 1,
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
							statMult: 1,
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
	}
};
