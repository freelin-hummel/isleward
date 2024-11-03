//Helpers
const getItemEffect = item => {
	return item.effects.find(e => (e.type === 'scaleDamage'));
};

module.exports = {
	events: {
		onGetText: function (item) {
			const itemEffect = getItemEffect(item);

			const percentage = itemEffect.rolls.percentage;

			if (percentage < 100)
				return `You only deal ${percentage}% damage`;

			return `You deal ${percentage}% damage`;
		},

		onAfterCalculateDamage: function (item, damage, target) {
			const itemEffect = getItemEffect(item);

			damage.amount *= (itemEffect.rolls.percentage / 100); 
		}
	}
};
