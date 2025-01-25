module.exports = {
	objects: {
		default: {

		}
	},
	mobs: {
		default: {
			level: 1,
			walkDistance: 1,

			spells: [{
				type: 'melee'
			}],

			regular: {
				itemPerfection: 0.02,
				hpMult: 2,
				dmgMult: 1,

				drops: {
					chance: 40,
					rolls: 1
				}
			},

			rare: {
				count: 1,
				chance: 0.4,

				itemPerfection: 0.04,
				hpMult: 5,
				dmgMult: 1,

				drops: {
					chance: 100,
					rolls: 2,
					magicFind: 2000
				}
			}
		}
	}
};
