import events from '../system/events';

export default {
	type: 'trade',

	itemList: null,
	action: 'buy',

	init () {

	},

	extend (blueprint) {
		let redraw = false;

		if (blueprint.buyList) {
			this.itemList = blueprint.buyList;
			redraw = true;
			this.action = 'buy';
			if (blueprint.buyList.buyback)
				this.action = 'buyback';

			delete blueprint.buyList;
		} else if (blueprint.sellList) {
			this.itemList = blueprint.sellList;
			redraw = true;
			this.action = 'sell';
			delete blueprint.sellList;
		}

		if (blueprint.removeItems) {
			_.spliceWhere(this.itemList.items, b => blueprint.removeItems.indexOf(b.id) > -1);
			redraw = true;
			delete blueprint.removeItems;
		}

		if (blueprint.redraw)
			redraw = true;

		for (let p in blueprint)
			this[p] = blueprint[p];

		if (redraw)
			events.emit('onGetTradeList', this.itemList, this.action);

		if (blueprint.closeTrade)
			events.emit('onCloseTrade');
	}
};
