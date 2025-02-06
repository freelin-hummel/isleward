module.exports = {
	currencies: {
		'Unstable Idol': {
			quantity: 1,
			quality: 1,
			material: true,
			sprite: [1, 8]
		},
		'Ascendant Idol': {
			quantity: 1,
			quality: 3,
			material: true,
			sprite: [3, 8]
		},
		'Bone Idol': {
			quantity: 1,
			quality: 2,
			material: true,
			sprite: [7, 8]
		},
		'Dragon-Glass Idol': {
			quantity: 1,
			quality: 3,
			material: true,
			sprite: [6, 8]
		},
		'Smoldering Idol': {
			quantity: 1,
			quality: 4,
			material: true,
			sprite: [8, 8]
		},
		'Arcane Idol': {
			quantity: 1,
			quality: 4,
			material: true,
			sprite: [0, 8]
		},
		'Charged Arcane Idol': {
			quantity: 1,
			quality: 4,
			material: true,
			sprite: [2, 7]
		},
		'Arcane Fragment': {
			quantity: 1,
			quality: 4,
			material: true,
			sprite: [1, 7]
		}
	},

	chance: {
		'Unstable Idol': 37,
		'Bone Idol': 12,
		'Ascendant Idol': 6,
		'Dragon-Glass Idol': 5,
		'Arcane Fragment': 2,
		'Smoldering Idol': 1,
		'Arcane Idol': 0
	},

	getCurrencyFromAction: function (action) {
		let currencies = this.currencies;
		let pick = Object.keys(currencies).find(o => (currencies[o].action === action));

		return extend({
			name: pick
		}, currencies[pick]);
	}
};
