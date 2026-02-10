module.exports = {
	id: 'anglers',
	name: 'The Anglers',
	description: 'A guild of fishermen that have mastered the arts of angling, lurecrafting and baiting. Many Anglers have taken it upon themselves to help others grow their fishing skills.',

	uniqueStat: {
		chance: {
			min: 2,
			max: 7
		},

		generate: function (item) {
			let chance = this.chance;
			let chanceRoll = ~~(random.expNorm(chance.min, chance.max));

			let result = null;
			if (item.effects)
				result = item.effects.find(e => (e.factionId === 'anglers'));

			if (!result) {
				if (!item.effects)
					item.effects = [];

				result = {
					factionId: 'anglers',
					properties: {
						chance: chanceRoll
					},
					text: chanceRoll + '% chance to multi-catch items.',
					events: {}
				};

				item.effects.push(result);
			}

			if (!result.events)
				result.events = {};

			for (let e in this.events) 
				result.events[e] = this.events[e];

			return result;
		},

		events: {
			beforeGetGatherResults: function (item, { obj, items }) {
				const effect = item.effects.find(e => (e.factionId === 'anglers'));

				const chance = effect.properties.chance / items.length;

				const roll = Math.random() * 100;
				if (roll >= chance)
					return;

				const pickItem = items[~~(Math.random() * items.length)];
				const cloned = extend({}, pickItem);
				delete cloned.id;

				items.push(cloned);
			}
		}
	},

	rewards: {

	}
};
