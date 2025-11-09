// eslint-disable-next-line no-shadow
const { balance } = require('./balance');

const statTranslations = {
	vit: 'Vitality',
	regenHp: 'Health Regeneration',
	manaMax: 'Maximum Mana',
	regenMana: 'Mana Regeneration',
	str: 'Strength',
	int: 'Intellect',
	dex: 'Dexterity',
	armor: 'Armor',

	blockAttackChance: 'Chance to Block Attacks',
	blockSpellChance: 'Chance to Block Spells',

	dodgeAttackChance: 'Chance to Dodge Attacks',
	dodgeSpellChance: 'Chance to Dodge Spells',

	addCritChance: 'Global Crit Chance',
	addCritMultiplier: 'Global Crit Multiplier',
	addAttackCritChance: 'Attack Crit Chance',
	addAttackCritMultiplier: 'Attack Crit Multiplier',
	addSpellCritChance: 'Spell Crit Chance',
	addSpellCritMultiplier: 'Spell Crit Multiplier',

	magicFind: 'Increased Item Quality',
	itemQuantity: 'Increased Item Quantity',
	sprintChance: 'Sprint Chance',
	allAttributes: 'All Attributes',
	xpIncrease: 'Additional Experience per Kill',
	lvlRequire: 'Level Requirement Reduction',

	elementArcanePercent: 'Increased Arcane Damage',
	elementFrostPercent: 'Increased Frost Damage',
	elementFirePercent: 'Increased Fire Damage',
	elementHolyPercent: 'Increased Holy Damage',
	elementPoisonPercent: 'Increased Poison Damage',
	physicalPercent: 'Increased Physical Damage',

	elementPercent: 'Increased Elemental Damage',
	spellPercent: 'Increased Spell Damage',

	elementAllResist: 'All Resistances',
	elementArcaneResist: 'Arcane Resistance',
	elementFrostResist: 'Frost Resistance',
	elementFireResist: 'Fire Resistance',
	elementHolyResist: 'Holy Resistance',
	elementPoisonResist: 'Poison Resistance',

	attackSpeed: 'Attack Speed',
	castSpeed: 'Cast Speed',

	addAttackDamage: 'Added Attack Damage',
	addSpellDamage: 'Added Spell Damage',

	lifeOnHit: 'Life Gained on Dealing Physical Damage',

	auraReserveMultiplier: 'Aura Mana Reservation Multiplier',

	stats: 'Stats',

	weight: 'lb',

	catchChance: 'Extra Catch Chance',
	catchSpeed: 'Faster Catch Speed',
	fishRarity: 'Higher Fish Rarity',
	fishWeight: 'Increased Fish Weight',
	fishItems: 'Extra Chance to Hook Items',

	damage: 'Damage',

	tooltips: {
		vit: `Each point of Vitality increases your maximum health by ${balance.statScales.vitToHp}.`,
		regenHp: 'Amount of health restored per second.',
		manaMax: 'Maximum mana capacity.',
		regenMana: 'Mana regenerated per second.',
		str: 'Improves physical abilities and certain skill scaling.',
		int: 'Improves spellcasting abilities and certain skill scaling.',
		dex: 'Improves accuracy, evasion, and certain skill scaling.',
		armor: 'Reduces incoming physical damage.',

		blockAttackChance: 'Chance to completely block a physical attack.',
		blockSpellChance: 'Chance to completely block a spell.',

		dodgeAttackChance: 'Chance to evade a physical attack.',
		dodgeSpellChance: 'Chance to evade a spell.',

		addCritChance: 'Chance for any hit to critically strike.',
		addCritMultiplier: 'Extra damage dealt by any critical strike.',
		addAttackCritChance: 'Chance for attacks to critically strike.',
		addAttackCritMultiplier: 'Extra damage from attack critical strikes.',
		addSpellCritChance: 'Chance for spells to critically strike.',
		addSpellCritMultiplier: 'Extra damage from spell critical strikes.',

		magicFind: 'Increases the rarity/quality of items dropped.',
		itemQuantity: 'Increases the number of items dropped.',
		sprintChance: 'Chance to move more than one tile per tick.',
		allAttributes: 'Adds to Strength, Intellect, and Dexterity.',
		xpIncrease: 'Extra experience gained from killing enemies.',
		lvlRequire: 'Reduces the level required to equip items.',

		elementArcanePercent: 'Increases arcane damage dealt.',
		elementFrostPercent: 'Increases frost damage dealt.',
		elementFirePercent: 'Increases fire damage dealt.',
		elementHolyPercent: 'Increases holy damage dealt.',
		elementPoisonPercent: 'Increases poison damage dealt.',
		physicalPercent: 'Increases physical damage dealt.',

		elementPercent: 'Increases all elemental damage types.',
		spellPercent: 'Increases damage dealt by spells.',

		elementAllResist: 'Provides resistance to all elemental types.',
		elementArcaneResist: 'Reduces arcane damage taken.',
		elementFrostResist: 'Reduces frost damage taken.',
		elementFireResist: 'Reduces fire damage taken.',
		elementHolyResist: 'Reduces holy damage taken.',
		elementPoisonResist: 'Reduces poison damage taken.',

		attackSpeed: 'Increases the speed of basic attacks.',
		castSpeed: 'Increases the speed of spell casts.',

		addAttackDamage: 'Adds flat damage to attacks.',
		addSpellDamage: 'Adds flat damage to spells.',

		lifeOnHit: 'Restores life whenever you deal physical damage.',

		auraReserveMultiplier: 'Changes how much mana your auras reserve.',

		stats: 'Unknown item stats used for gambling.',

		weight: 'Indicates the weight of a fish.',

		catchChance: 'Increases the chance to hook a fish.',
		catchSpeed: 'Reduces the time it takes to catch a fish.',
		fishRarity: 'Increases the chance of catching rare fish.',
		fishWeight: 'Increases average fish weight.',
		fishItems: 'Increases the chance to catch items instead of fish.',

		damage: 'Base damage dealt.'
	}
};

module.exports = statTranslations;
