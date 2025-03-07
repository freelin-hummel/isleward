let combat = require('../../combat/combat');

module.exports = {
	type: 'lifeDrain',

	amount: 0,

	scaleDamage: {
		isAttack: false,
		damage: 1,
		element: undefined,
		noScale: false,
		noMitigate: false,
		noCrit: false
	},

	init: function () {
		this.ttlMax = this.ttl;
	},

	events: {
		afterTick: function () {
			const { isAttack, damage, element, noScale, noMitigate, noCrit } = this.scaleDamage;

			const damageEvent = combat.getDamage({
				source: this.caster,
				target: this.obj,
				isAttack,
				damage,
				element,
				noScale,
				noMitigate,
				noCrit,
				duration: this.ttlMax
			});
				
			this.obj.stats.takeDamage({
				damage: damageEvent,
				threatMult: 1,
				source: this.caster,
				target: this.obj,
				effectName: 'lifeDrain'
			});
		}
	}
};
