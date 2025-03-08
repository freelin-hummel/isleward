let combat = require('../../combat/combat');

module.exports = {
	events: {
		element: null,

		onGetText: function (item) {
			let rolls = item.effects.find(e => (e.type === 'damageSelf')).rolls;

			return `You take ${rolls.percentage}% of the damage you deal`;
		},

		afterDealDamage: function (item, { damage, target }) {
			let effect = item.effects.find(e => (e.type === 'damageSelf'));
			let rolls = effect.rolls;

			let amount = (damage.dealt / 100) * rolls.percentage;

			let newDamage = combat.getDamage({
				source: {
					stats: {
						values: {}
					}
				},
				isAttack: false,
				target: this,
				damage: amount,
				element: effect.properties.element,
				noCrit: true
			});

			this.stats.takeDamage({
				damage: newDamage,
				threatMult: 1,
				source: this,
				target: this,
				effectName: 'damageSelf',
				noEvents: true
			});
		}
	}
};
