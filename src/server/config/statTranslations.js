// eslint-disable-next-line no-shadow
const { balance } = require('./balance');

const statTranslations = {
	vit: 'Vitality',
	hp: 'Health',
	hpMax: 'Maximum Health',
	regenHp: 'Health Regeneration',
	mana: 'Mana',
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

	addedMeleeRange: 'Increased Melee Range(Tiles)',
	cooldown: 'Cooldown(Ticks)',
	uses: 'Uses',

	passivePoint: 'Passive Skill Point',

	//Rune Stats
	damage: 'Base Damage',
	healing: 'Base Heal',
	freezeDuration: 'Freeze Duration(Ticks)',
	stunDuration: 'Stun Duration(Ticks)',
	regenPercentage: 'Regeneration(Percent)',
	range: 'Range(Tiles)',
	radius: 'Radius(Tiles)',
	duration: 'Effect Duration(Ticks)',
	pushback: 'Pushback Distance(Tiles)',
	delay: 'Appearance Delay(Ticks)',
	dmg: 'Damage(Per Tick)',
	heal: 'Healing(Per Tick)',

	runeStats: {
		whirlwind: {
			range: 'Radius(Tiles)'
		},
		swiftness: {
			chance: 'Sprint Chance Increase'
		},
		innervation: {
			regenPercentage: 'Health Regeneration(Percent)'
		},
		tranquility: {
			regenPercentage: 'Mana Regeneration(Percent)'
		},
		flurry: {
			chance: 'Effect Chance(Percent)'
		}
	}
};

statTranslations.tooltips = {
	vit: `Each point of ${statTranslations.vit} increases your ${statTranslations.hpMax} by ${balance.statScales.vitToHp}.`,
	regenHp: `Amount of ${statTranslations.hp} restored per tick.`,
	hpMax: `Maximum ${statTranslations.hp} capacity. When it runs out, you die.`,
	manaMax: `Maximum ${statTranslations.mana} capacity.`,
	regenMana: `${statTranslations.mana} regenerated per tick.`,
	str: `Increases the damage of ${statTranslations.str}-based weapons and abilities.<br /><br />Each point of ${statTranslations.str} increases your ${statTranslations.armor} by ${balance.statScales.strToArmor}.`,
	int: `Increases the damage of ${statTranslations.int}-based weapons and abilities.<br /><br />Every ${balance.statScales.intNeededPerMana} points of ${statTranslations.int} increase your ${statTranslations.manaMax} by 1.`,
	dex: `Increases the damage of Dexterity-based weapons and abilities.<br /><br />Every ${balance.statScales.dexNeededPerDodge} points of ${statTranslations.dex} increase your ${statTranslations.dodgeAttackChance} by 1%`,
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

	magicFind: 'Increases the rarity of items dropped from enemies.',
	itemQuantity: 'Increases the chance to drop items from enemies.',
	sprintChance: 'Chance to move more than one tile per tick.',
	allAttributes: `Increases ${statTranslations.str}, ${statTranslations.int} and ${statTranslations.dex}.`,
	xpIncrease: 'Increased the experience gained from killing enemies.',
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

	lifeOnHit: `Restores ${statTranslations.hp} whenever you deal physical damage.`,

	stats: 'Unknown item stats used for gambling.',

	weight: 'The weight of the fish.',

	catchChance: 'Increases the chance to catch a fish.',
	catchSpeed: 'Increases the speed of reeling in a fish.',
	fishRarity: 'Increases the rarity of caught fish.',
	fishWeight: 'Increases the weight of caught fish.',
	fishItems: 'Increases the chance of catching items instead of fish.',

	damage: 'Base damage dealt.'
};

module.exports = statTranslations;
