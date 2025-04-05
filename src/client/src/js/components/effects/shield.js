const shieldEffect = {
	bar: null,
	visible: true,

	amount: 1,
	maxAmount: 1,

	init () {
		if (this.obj.stats) {
			this.bar = this.obj.stats.addBar({
				color: 0x533399,
				innerColor: 0xa24eff,
				calcPercent: () => this.amount / this.maxAmount,
				isVisible: () => this.visible
			});

			this.obj.stats.updateBars();
		}
	},

	extend (data) {
		this.amount = data.amount;
		this.maxAmount = data.maxAmount;

		if (this.obj.stats)
			this.obj.stats.updateBars();
	},

	destroy () {
		if (this.bar && this.obj.stats)
			this.obj.stats.removeBar(this.bar);
	},

	setVisible (visible) {
		this.visible = visible;

		if (this.obj.stats)
			this.obj.stats.updateBars();
	}
};

export default { templates: { shield: shieldEffect } };
