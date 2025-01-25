const itemConfig = {
	steelclawsBite: {
		name: 'Steelclaw\'s Bite',
		level: [18, 20],
		attrRequire: 'dex',
		quality: 4,
		slot: 'oneHanded',
		sprite: [1, 0],
		spritesheet: '../../../images/legendaryItems.png',
		type: 'Curved Dagger',
		description: 'The blade seems to be made of some kind of bone and steel alloy.',
		stats: ['dex', 'dex', 'addCritMultiplier', 'addCritMultiplier'],
		effects: [{
			type: 'alwaysCrit',
			rolls: {}
		}, {
			type: 'scaleDamage',
			rolls: {
				i_percentage: [20, 40]
			}
		}]
	},
	putridShank: {
		name: 'Putrid Shank',
		level: 13,
		quality: 4,
		slot: 'oneHanded',
		type: 'Dagger',
		spritesheet: '../../../images/legendaryItems.png',
		sprite: [0, 1],
		implicitStat: {
			stat: 'lifeOnHit',
			value: [5, 20]
		},
		effects: [{
			type: 'castSpellOnHit',
			rolls: {
				i_chance: [5, 20],
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
			}
		}]
	},
	princessMorgawsasTrident: {
		name: 'Princess Morgawsa\'s Trident',
		level: [18, 20],
		attrRequire: 'int',
		quality: 4,
		slot: 'twoHanded',
		sprite: [0, 0],
		spritesheet: '../../../images/legendaryItems.png',
		type: 'Trident',
		description: 'Summoned from the ancient depths of the ocean by the Benthic Incantation.',
		stats: ['elementFrostPercent', 'elementFrostPercent', 'elementFrostPercent'],
		effects: [{
			type: 'freezeOnHit',
			rolls: {
				i_chance: [2, 5],
				i_duration: [2, 4]
			}
		}],
		spellName: 'projectile',
		spellConfig: {
			statType: 'int',
			element: 'arcane',
			auto: true,
			cdMax: 7,
			castTimeMax: 0,
			manaCost: 0,
			range: 9,
			random: {
				damage: [2.58, 16.8]
			}
		}
	},
	cowlOfObscurity: {
		name: 'Cowl of Obscurity',
		level: [4, 13],
		quality: 4,
		noSpell: true,
		slot: 'head',
		sprite: [2, 0],
		spritesheet: '../../../images/legendaryItems.png',
		type: 'Silk Cowl',
		description: 'Imbued with the powers of Gaekatla herself.',
		stats: ['hpMax', 'hpMax', 'int', 'int'],
		effects: [{
			type: 'healOnCrit',
			rolls: {
				i_chance: [8, 16],
				i_percentage: [1, 3]
			}
		}],
		factions: [{
			id: 'gaekatla',
			tier: 3
		}]
	}
};

module.exports = {
	get: id => {
		return extend({}, itemConfig[id]);
	},

	getByName: name => {
		const entry = Object.entries(itemConfig).find(([id, config]) => {
			return config.name === name;
		});

		if (entry === undefined)
			return;

		return extend({}, entry[1]);
	}
};
