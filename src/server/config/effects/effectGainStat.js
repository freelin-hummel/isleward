module.exports = {
	type: 'gainStat',

	amount: 1,
	statName: null,

	init: function () {
		this.obj.stats.addStat(this.statName, this.amount);
	},

	shouldStack: function (config) {
		return config.source === this.source;
	},

	incrementStack: function (config) {
		if (config.ttl)
			this.ttl += config.ttl;

		this.syncExtend({
			ttl: this.ttl
		});
	},

	destroy: function () {
		this.obj.stats.addStat(this.statName, -this.amount);
	},

	update: function () {

	},

	events: {

	}
};
