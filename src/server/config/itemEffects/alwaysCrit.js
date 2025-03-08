module.exports = {
	events: {
		onGetText: function (item) {
			return 'All your hits are critical hits';
		},

		onBeforeCalculateDamage: function (item, damage, target) {
			damage.crit = true;
		}
	}
};
