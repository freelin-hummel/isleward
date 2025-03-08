//Imports
const animations = require('../config/animations');
const itemGenerator = require('../items/generator');

//Mobs will be given random items to equip for these slots
const generateSlots = [
	'head',
	'chest',
	'neck',
	'hands',
	'waist',
	'legs',
	'feet',
	'finger',
	'finger',
	'trinket',
	'twoHanded'
];

const generateTypes = {
	twoHanded: 'Axe',
	head: 'Helmet',
	chest: 'Breastplate',
	hands: 'Gauntlets',
	waist: 'Belt',
	legs: 'Legplates',
	feet: 'Steel Boots',
	neck: 'Pendant',
	finger: 'Viridian Band',
	trinket: 'Dragon Fang'
};

//These stat values are synced to players
const syncStats = ['hp', 'hpMax', 'mana', 'manaMax', 'level'];

//Component generators
const buildCpnMob = (mob, blueprint, typeDefinition) => {
	const { walkDistance, grantRep, deathRep, patrol, needLos } = blueprint;

	const cpnMob = mob.addComponent('mob');
	extend(cpnMob, {
		walkDistance,
		grantRep,
		deathRep,
		needLos
	});

	if (patrol !== undefined)
		cpnMob.patrol = blueprint.patrol;

	if (cpnMob.patrol)
		cpnMob.walkDistance = 1;
};

const buildCpnStats = (mob, blueprint, typeDefinition) => {
	const {
		level,
		hpMult: baseHpMult = typeDefinition.hpMult
	} = blueprint;

	const hpMax = ~~(level * 40 * balance.hpMults[level - 1] * baseHpMult);

	mob.addComponent('stats', {
		values: {
			level,
			hpMax
		}
	});
};

const ignoreStatsHigh = ['addAttackDamage', 'addSpellDamage'];
const ignoreStatsLow = ['regenHp', 'lifeOnHit', 'addAttackDamage', 'addSpellDamage'];

const buildCpnInventory = (
	mob,
	blueprint,
	{
		drops,
		hasNoItems = false,
		itemQuality = 4,
		itemPerfection = 0.2,
		itemStats = ['str', 'str', 'str', 'str', 'str'],
		spellPerfection
	},
	preferStat
) => {
	const { level } = blueprint;

	const cpnInventory = mob.addComponent('inventory', drops);

	cpnInventory.inventorySize = -1;
	cpnInventory.dailyDrops = blueprint.dailyDrops;

	if (hasNoItems !== true) {
		generateSlots.forEach(slot => {
			const item = itemGenerator.generate({
				noSpell: true,
				level,
				slot,
				type: generateTypes[slot],
				quality: itemQuality,
				stats: itemStats,
				perfection: itemPerfection,
				spellPerfection,
				forceStats: [preferStat],
				ignoreStats: level > 3 ? ignoreStatsHigh : ignoreStatsLow
			});
			delete item.spell;
			item.eq = true;
			const implicitArmor = item.implicitStats.find(s => s.stat === 'armor');
			if (implicitArmor !== undefined)
				implicitArmor.value = 0;

			cpnInventory.getItem(item);
		});
	}
};

const buildCpnSpells = (mob, blueprint, typeDefinition, preferStat) => {
	const spells = extend([], blueprint.spells);
	spells.forEach(s => {
		if (!s.animation && mob.sheetName === 'mobs' && animations.mobs[mob.cell])
			s.animation = 'basic';
	});

	mob.addComponent('spellbook', { spells });

	let spellCount = 0;
	if (mob.isRare)
		spellCount = 1;

	for (let i = 0; i < spellCount; i++) {
		const rune = itemGenerator.generate({ spell: true });
		rune.eq = true;

		mob.inventory.getItem(rune);
	}

	let dmgMult = balance.dmgMults[blueprint.level - 1];
	if (typeDefinition.dmgMult !== undefined)
		dmgMult *= typeDefinition.dmgMult;

	mob.spellbook.spells.forEach((s, i) => {
		if (i === 0)
			s.cdMax = 2;

		if (s.healing === undefined)
			s.damage *= dmgMult;

		s.statType = preferStat;
		s.manaCost = 0;
	});
};

const fnComponentGenerators = [
	buildCpnMob, buildCpnStats, buildCpnInventory, buildCpnSpells
];

//Main Generator
/*
	mob = the mob object
	blueprint = mob blueprint (normally from the zoneFile)
	type = regular,rare
	zoneName = the name of the zone
*/
const build = (mob, blueprint, type, zoneName) => {
	mob.instance.eventEmitter.emit('beforeBuildMob', {
		mob,
		blueprint,
		type,
		zoneName
	});
	//Deprecated
	mob.instance.eventEmitter.emit('onBeforeBuildMob', zoneName, mob.name.toLowerCase(), blueprint);

	const typeDefinition = blueprint[type] || blueprint;

	if (blueprint.nonSelectable)
		mob.nonSelectable = true;

	mob.addComponent('effects');
	if (type === 'rare') {
		mob.effects.addEffect({	type: 'rare' });
		mob.isRare = true;

		mob.baseName = mob.name;
		mob.name = typeDefinition.name ?? mob.name;
	}

	if (typeDefinition.sheetName)
		mob.sheetName = typeDefinition.sheetName;

	if (typeDefinition.has('cell'))
		mob.cell = typeDefinition.cell;

	mob.addComponent('equipment');

	const preferStat = 'str';

	fnComponentGenerators.forEach(fn => fn(mob, blueprint, typeDefinition, preferStat));

	if (blueprint.attackable !== false) {
		mob.addComponent('aggro', { faction: blueprint.faction });

		mob.aggro.calcThreatCeiling(type);
	}

	const zoneConfig = instancer.instances[0].map.zoneConfig;

	const chats = zoneConfig?.chats?.[mob.name.toLowerCase()];
	if (chats) {
		mob.addComponent('chatter', {
			chats,
			chance: blueprint?.properties?.cpnChatter?.chance
		});
	}

	const dialogues = zoneConfig?.dialogues?.[mob.name.toLowerCase()];
	if (dialogues)
		mob.addComponent('dialogue', { config: dialogues });

	if (blueprint?.properties?.cpnTrade)
		mob.addComponent('trade', blueprint.properties.cpnTrade);

	mob.instance.eventEmitter.emit('onAfterBuildMob', {
		zoneName,
		mob
	});

	const statValues = mob.stats.values;
	statValues.hp = statValues.hpMax;

	syncStats.forEach(s => mob.syncer.setObject(false, 'stats', 'values', s, statValues[s]));
};

module.exports = { build };
