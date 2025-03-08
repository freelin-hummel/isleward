module.exports = {
	type: 'shield',

	amount: 0,
	maxAmount: 0,

	init: function () {
		this.syncExtend({
			amount: this.amount,
			maxAmount: this.maxAmount
		});
	},

	events: {
		beforeTakeDamage: function (damage, source) {
			if (this.amount > 0) {
				let mitigatedAmount = Math.min(damage.amount, this.amount);

				damage.amount -= mitigatedAmount;
				this.amount -= mitigatedAmount;

				//Sync new values to client
				this.syncExtend({
					amount: this.amount,
					maxAmount: this.maxAmount
				});
			}

			if (this.amount <= 0)
				this.destroyed = true;
		}
	}
};
