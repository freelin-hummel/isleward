const calculateAugmentMaterials = require('./enchanting/calculateAugmentMaterials');

const reroll = require('./enchanting/craftActions/reroll');
const ascend = require('./enchanting/craftActions/ascend');
const augment = require('./enchanting/craftActions/augment');
const fatedReroll = require('./enchanting/craftActions/fatedReroll');
const reforge = require('./enchanting/craftActions/reforge');
const scour = require('./enchanting/craftActions/scour');
const extract = require('./enchanting/craftActions/extract');
const infuse = require('./enchanting/craftActions/infuse');

module.exports = [{
	name: 'Augment Stats',
	description: 'Adds a random stat to an item. Items can hold a maximum of three augments.',
	materialGenerator: calculateAugmentMaterials,
	craftAction: augment,
	needItems: [{
		info: 'Pick an item to augment',
		withProps: ['slot'],
		withoutProps: ['noAugment'],
		checks: [
			item => (!item.power || item.power < 3)
		]
	}]
}, {
	name: 'Reroll Stats',
	description: 'Rerolls an item\'s implicit and explicit stats. Augmentations and infusions are not affected.',
	materials: [{
		name: 'Unstable Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick an item to reroll',
		withProps: ['slot'],
		withoutProps: ['noAugment'],
		checks: [
			item => item.slot !== 'tool'
		]
	}],
	craftAction: reroll
}, {
	name: 'Fated Reroll Stats',
	description: 'Rerolls a single explicit stat (randomly chosen) on a magic or better item. The reroll has a chance to roll multiple times based on the value of the stat that\'s chosen.',
	materials: [{
		name: 'Dragon-Glass Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick an item to reroll',
		withProps: ['slot'],
		withoutProps: ['noAugment'],
		checks: [
			item => item.quality > 0 && item.slot !== 'tool'
		]
	}],
	craftAction: fatedReroll
}, {
	name: 'Ascend Common Item',
	description: 'Ascends a common item to a magic item, adding an extra stat in the process.',
	materials: [{
		name: 'Ascendant Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick a common item you wish to ascend to magic.',
		withProps: ['slot'],
		withoutProps: ['noAugment', 'effects', 'factions'],
		checks: [
			item => item.quality === 0 && item.slot !== 'tool'
		]
	}],
	craftAction: ascend.bind(null, 0, 1)
}, {
	name: 'Ascend Magic Item',
	description: 'Ascends a magic item to a rare item, adding an extra stat in the process.',
	materials: [{
		name: 'Ascendant Idol',
		quantity: 5
	}],
	needItems: [{
		info: 'Pick a magic item you wish to ascend to rare.',
		withProps: ['slot'],
		withoutProps: ['noAugment', 'effects', 'factions'],
		checks: [
			item => item.quality === 1 && item.slot !== 'tool'
		]
	}],
	craftAction: ascend.bind(null, 1, 2)
}, {
	name: 'Ascend Rare Item',
	description: 'Ascends a rare item to an epic item, adding an extra stat in the process.',
	materials: [{
		name: 'Ascendant Idol',
		quantity: 15
	}],
	needItems: [{
		info: 'Pick a rare item you wish to ascend to epic.',
		withProps: ['slot'],
		withoutProps: ['noAugment', 'effects', 'factions'],
		checks: [
			item => item.quality === 2 && item.slot !== 'tool'
		]
	}],
	craftAction: ascend.bind(null, 2, 3)
}, {
	name: 'Reforge Weapon',
	description: 'Rerolls a weapon\'s damage.',
	materials: [{
		name: 'Bone Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick an item to reforge',
		withProps: ['slot', 'spell'],
		withoutProps: ['noAugment']
	}],
	craftAction: reforge.bind(null, [1, 1])
}, {
	name: 'Blessed Reforge Weapon',
	description: 'Rerolls a weapon\'s damage [20 - 40] times, only keeping the best roll.',
	materials: [{
		name: 'Bone Idol',
		quantity: 20
	}],
	needItems: [{
		info: 'Pick an item to reforge',
		withProps: ['slot', 'spell'],
		withoutProps: ['noAugment']
	}],
	craftAction: reforge.bind(null, [20, 40])
}, {
	name: 'Scour Item',
	description: 'Wipe all augments and infusions from an item.',
	materials: [{
		name: 'Smoldering Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick an item to scour',
		withProps: ['slot', 'power'],
		withoutProps: ['noAugment'],
		checks: [
			item => item.slot !== 'tool'
		]
	}],
	craftAction: scour,
	checks: [
		item => item.power && item.power >= 1 
	]
}, {
	name: 'Create Arcane Idol',
	description: 'Combine Arcane Fragments to create an Arcane Idol.',
	materials: [{
		name: 'Arcane Fragment',
		quantity: 10
	}],
	addCreatedByToDescription: false,
	item: {
		name: 'Arcane Idol',
		quantity: 1,
		quality: 4,
		description: 'Extracts a random stat from items to be applied to another.',
		material: true,
		sprite: [0, 8]
	}
}, {
	name: 'Create Charged Arcane Idol',
	description: 'Extract a random stat from items. These items will be destroyed and you will receive a [Charged Arcane Idol] containing the extracted stat.',
	materials: [{
		name: 'Arcane Idol',
		quantity: 1
	}],
	needItems: [{
		info: 'Pick an epic item that shares at least one stat with 2 others',
		withoutProps: ['eq', 'noDrop', 'noDestroy', 'effects', 'factions'],
		checks: [
			item => item.quality >= 3 && item.stats !== undefined && !item.effects
		]
	}, {
		info: 'Pick an epic item that shares at least one stat with 2 others',
		withoutProps: ['eq', 'noDrop', 'noDestroy', 'effects', 'factions'],
		checks: [
			item => item.quality >= 3 && item.stats !== undefined && !item.effects
		]
	}, {
		info: 'Pick an epic item that shares at least one stat with 2 others',
		withoutProps: ['eq', 'noDrop', 'noDestroy', 'effects', 'factions'],
		checks: [
			item => item.quality >= 3 && item.stats !== undefined && !item.effects
		]
	}],
	craftAction: extract
}, {
	name: 'Infuse Item',
	description: 'Infuses an item with a stat from a Charged Arcane Idol.',
	needMaterials: false,
	needItems: [{
		info: 'Pick an item to infuse',
		checks: [
			item => !item.eq && item.infused !== true && item.slot !== undefined && item.slot !== 'tool'
		]
	}, {
		info: 'Pick a Charged Arcane Idol to apply to the item.',
		checks: [
			item => item.name.indexOf('Charged Arcane Idol') === 0
		]
	}],
	craftAction: infuse
}];
