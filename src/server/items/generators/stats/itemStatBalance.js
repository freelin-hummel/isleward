const itemStatBalance = {
	vit: {
		generator: 'vit'
	},
	manaMax: {
		min: 1,
		max: 8
	},

	regenHp: {
		generator: 'regenHp'
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

	...Object.fromEntries([
		'str',
		'int',
		'dex'
	].map(r => [r, { generator: 'mainStat' }])),

	allAttributes: {
		generator: 'mainStat',
		slots: ['finger', 'neck']
	},

	...Object.fromEntries([
		'elementAllResist',
		'elementArcaneResist',
		'elementFrostResist',
		'elementFireResist',
		'elementHolyResist',
		'elementPoisonResist'
	].map(r => [r, {
		level: {
			min: 7
		},
		generator: 'elementResist'
	}])),

	...Object.fromEntries([
		'physicalPercent',
		'spellPercent',
		'elementPercent',
		'elementArcanePercent',
		'elementFrostPercent',
		'elementFirePercent',
		'elementHolyPercent',
		'elementPoisonPercent'
	].map(r => [r, { generator: 'elementDmgPercent' }])),

	...Object.fromEntries([
		'addAttackDamage',
		'addSpellDamage'
	].map(r => [r, { generator: 'addDamage' }])),

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
		slots: []
	},

	blockAttackChance: {
		min: 1,
		max: 10,
		slots: []
	},

	blockSpellChance: {
		min: 1,
		max: 10,
		slots: []
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

	...Object.fromEntries([
		'addCritChance',
		'addAttackCritChance',
		'addSpellCritChance'
	].map(r => [r, { generator: 'addCritChance' }])),

	...Object.fromEntries([
		'addCritMultiplier',
		'addAttackCritMultiplier',
		'addSpellCritMultiplier'
	].map(r => [r, { generator: 'addCritMultiplier' }])),

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
};

module.exports = itemStatBalance;
	
