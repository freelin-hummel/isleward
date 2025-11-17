let events = require('../misc/events');

let spells = {
	melee: {
		auto: true,
		isAttack: true,
		cdMax: 10,
		castTimeMax: 0,
		useWeaponRange: true,
		random: {
			damage: [3, 11.4]
		}
	},
	projectile: {
		auto: true,
		isAttack: false,
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
		isAttack: false,
		element: 'arcane',
		cdMax: 7,
		castTimeMax: 6,
		manaCost: 5,
		range: 9,
		random: {
			damage: [4, 74]
		}
	},
	'ice spear': {
		statType: 'int',
		isAttack: false,
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
		isAttack: false,
		isAoe: true,
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
		isAttack: false,
		element: 'holy',
		cdMax: 6,
		castTimeMax: 3,
		range: 9,
		manaCost: 7,
		random: {
			damage: [4, 31],
			i_stunDuration: [6, 10]
		}
	},
	consecrate: {
		statType: 'int',
		isAttack: false,
		isAoe: true,
		isHeal: true,
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
		isAttack: false,
		isHeal: true,
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
		isAttack: true,
		threatMult: 4,
		cdMax: 9,
		castTimeMax: 1,
		manaCost: 4,
		useWeaponRange: true,
		random: {
			damage: [1, 57]
		}
	},
	charge: {
		statType: 'str',
		isAttack: true,
		isMovement: true,
		threatMult: 3,
		cdMax: 14,
		castTimeMax: 1,
		range: 10,
		manaCost: 3,
		random: {
			damage: [2, 22],
			i_stunDuration: [6, 10]
		}
	},
	flurry: {
		statType: 'dex',
		isBuff: true,
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
		isAttack: true,
		isAoe: true,
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
		isAttack: true,
		isAoe: true,
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
		isAttack: true,
		isMovement: true,
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
		isAttack: true,
		isAoe: true,
		manaCost: 14,
		needLos: true,
		cdMax: 15,
		castTimeMax: 0,
		range: 9,
		radius: 1,
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
		isAura: true,
		manaReserve: {
			percentage: 0.25
		},
		cdMax: 10,
		castTimeMax: 0,
		auraRange: 9,
		effect: 'regenHp',
		random: {
			regenPercentage: [0.2, 0.8]
		}
	},
	tranquility: {
		statType: ['int'],
		isAura: true,
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
		isAura: true,
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
	spells,

	init: function () {
		events.emit('onBeforeGetSpellsConfig', spells);
	}
};
