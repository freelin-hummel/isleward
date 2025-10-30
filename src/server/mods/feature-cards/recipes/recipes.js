const rune = require('./craftActions/rune');
const weapon = require('./craftActions/weapon');
const armor = require('./craftActions/armor');
const idol = require('./craftActions/idol');

const itemConfig = require('../../../config/itemConfig');

module.exports = [{
	name: 'Level 10 Rune',
	description: '',
	materials: [{
		name: 'Runecrafter\'s Toil',
		quantity: 3
	}],
	craftAction: rune.bind(null, { 
		level: 10,
		magicFind: 900
	})
}, {
	name: 'Level 17 Rune',
	description: '',
	materials: [{
		name: 'Runecrafter\'s Toil',
		quantity: 10
	}],
	craftAction: rune.bind(null, {
		level: 17,
		magicFind: 1400
	})
}, {
	name: 'Level 23 Rune',
	description: '',
	materials: [{
		name: 'Runecrafter\'s Toil',
		quantity: 30
	}],
	craftAction: rune.bind(null, {
		level: 23,
		magicFind: 1900
	})
}, {
	name: 'Legendary Level 18 Weapon',
	description: '',
	materials: [{
		name: 'Godly Promise',
		quantity: 6
	}],
	craftAction: weapon.bind(null, {
		level: 18,
		quality: 4
	})
}, {
	name: 'Perfect Level 10 Ring',
	description: '',
	materials: [{
		name: 'The Other Heirloom',
		quantity: 3
	}],
	craftAction: armor.bind(null, {
		level: 10,
		slot: 'finger',
		perfection: 1,
		quality: 1
	})
}, {
	name: '5 Random Idols',
	description: '',
	materials: [{
		name: 'Tradesman\'s Pride',
		quantity: 10
	}],
	craftAction: idol.bind(null, {
		rolls: 5
	})
}, {
	name: 'Princess Morgawsa\'s Trident',
	description: '',
	materials: [{
		name: 'Benthic Incantation',
		quantity: 12
	}],
	craftAction: weapon.bind(null, itemConfig.get('princessMorgawsasTrident'))
}, {
	name: 'Steelclaw\'s Bite',
	description: '',
	materials: [{
		name: 'Fangs of Fury',
		quantity: 20
	}],
	craftAction: weapon.bind(null, itemConfig.get('steelclawsBite'))
}];
