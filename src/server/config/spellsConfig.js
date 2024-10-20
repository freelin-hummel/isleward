let events = require('../misc/events');

let spells = {
	melee: {
		auto: true,
		cdMax: 10,
		castTimeMax: 0,
		useWeaponRange: true,
		random: {
			damage: [3, 11.4]
		}
	},
	projectile: {
		auto: true,
		cdMax: 10,
		castTimeMax: 0,
		manaCost: 0,
		range: 9,
		random: {
			damage: [2, 7.2]
		}
	},

	'magic missile': {
		statType: 'int',
		element: 'arcane',
		cdMax: 7,
		castTimeMax: 6,
		manaCost: 5,
		range: 9,
		random: {
			damage: [4, 75]
		}
	},
	'ice spear': {
		statType: 'int',
		element: 'frost',
		cdMax: 10,
		castTimeMax: 2,
		manaCost: 4,
		range: 9,
		random: {
			damage: [2, 47],
			i_freezeDuration: [6, 10]
		}
	},
	fireblast: {
		statType: 'int',
		element: 'fire',
		cdMax: 4,
		castTimeMax: 2,
		manaCost: 5,
		random: {
			damage: [2, 35],
			i_radius: [1, 2.2],
			i_pushback: [2, 5]
		}
	},
	smite: {
		statType: 'int',
		element: 'holy',
		cdMax: 6,
		castTimeMax: 3,
		range: 9,
		manaCost: 7,
		random: {
			damage: [4, 35],
			i_stunDuration: [6, 10]
		}
	},
	consecrate: {
		statType: 'int',
		element: 'holy',
		cdMax: 15,
		castTimeMax: 4,
		manaCost: 12,
		range: 9,
		radius: 3,
		random: {
			healing: [0.3, 0.53],
			i_duration: [7, 12]
		}
	},

	'healing touch': {
		statType: 'int',
		element: 'holy',
		cdMax: 6,
		castTimeMax: 4,
		manaCost: 8,
		range: 9,
		random: {
			healing: [1, 3.5]
		}
	},

	slash: {
		statType: 'str',
		threatMult: 4,
		cdMax: 9,
		castTimeMax: 1,
		manaCost: 4,
		useWeaponRange: true,
		random: {
			damage: [6, 55]
		}
	},
	charge: {
		statType: 'str',
		threatMult: 3,
		cdMax: 14,
		castTimeMax: 1,
		range: 10,
		manaCost: 3,
		random: {
			damage: [2, 42],
			i_stunDuration: [6, 10]
		}
	},
	flurry: {
		statType: 'dex',
		cdMax: 20,
		castTimeMax: 0,
		manaCost: 10,
		random: {
			i_duration: [10, 20],
			i_chance: [30, 60]
		}
	},
	whirlwind: {
		statType: 'str',
		threatMult: 6,
		cdMax: 12,
		castTimeMax: 2,
		manaCost: 7,
		random: {
			i_range: [1, 2.5],
			damage: [4, 59]
		}
	},
	smokebomb: {
		statType: 'dex',
		element: 'poison',
		cdMax: 7,
		castTimeMax: 0,
		manaCost: 6,
		random: {
			damage: [0.25, 4.4],
			i_radius: [1, 3],
			i_duration: [7, 13]
		}
	},
	ambush: {
		statType: 'dex',
		cdMax: 15,
		castTimeMax: 3,
		range: 10,
		manaCost: 7,
		random: {
			damage: [8, 79],
			i_stunDuration: [4, 7]
		}
	},
	'crystal spikes': {
		statType: ['dex', 'int'],
		manaCost: 14,
		needLos: true,
		cdMax: 15,
		castTimeMax: 0,
		range: 9,
		isAttack: true,
		random: {
			damage: [3, 66],
			i_delay: [1, 4]
		},
		negativeStats: [
			'i_delay'
		]
	},
	innervation: {
		statType: ['str'],
		manaReserve: {
			percentage: 0.25
		},
		cdMax: 10,
		castTimeMax: 0,
		auraRange: 9,
		effect: 'regenHp',
		random: {
			regenPercentage: [0.2, 0.5]
		}
	},
	tranquility: {
		statType: ['int'],
		element: 'holy',
		manaReserve: {
			percentage: 0.25
		},
		cdMax: 10,
		castTimeMax: 0,
		auraRange: 9,
		effect: 'regenMana',
		random: {
			regenPercentage: [4, 10]
		}
	},
	swiftness: {
		statType: ['dex'],
		element: 'fire',
		manaReserve: {
			percentage: 0.4
		},
		cdMax: 10,
		castTimeMax: 0,
		auraRange: 9,
		effect: 'swiftness',
		random: {
			chance: [8, 20]
		}
	}

};

module.exports = {
	spells: spells,
	init: function () {
		events.emit('onBeforeGetSpellsConfig', spells);
	}
};
