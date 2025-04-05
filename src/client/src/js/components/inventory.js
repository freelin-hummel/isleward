import events from '../system/events';

export default {
	type: 'inventory',

	items: [],
	inventorySize: 50,

	init () {
		events.emit('onGetItems', this.items);
		events.emit('onGetInventorySize', this.inventorySize);
	},

	extend ({ destroyItems, getItems, inventorySize }) {
		const { items } = this;

		let rerenderNeeded = false;

		if (inventorySize) {
			this.inventorySize = inventorySize;

			events.emit('onGetInventorySize', this.inventorySize);
		}

		if (destroyItems) {
			rerenderNeeded = true;
			events.emit('onDestroyItems', destroyItems, this.items);
		}

		if (getItems) {
			getItems.forEach(g => {
				const findItem = items.find(i => i.id === g.id);

				if (!findItem) {
					rerenderNeeded = true;

					const clonedItem = $.extend({}, g);
					clonedItem.isNew = true;

					items.push(clonedItem);

					return;
				}

				if (!rerenderNeeded) {
					rerenderNeeded = (
						findItem.pos !== g.pos ||
							findItem.eq !== g.eq ||
							findItem.active !== g.active ||
							findItem.quickSlot !== g.quickSlot ||
							findItem.quantity !== g.quantity
					);
				}

				Object.getOwnPropertyNames(findItem).forEach(p => {
					delete findItem[p];
				});

				$.extend(findItem, g);
			});

			events.emit('onGetItems', this.items, rerenderNeeded, getItems);
		}
	},

	equipItemErrors (item) {
		const { obj: { reputation, stats: { values: statValues } } } = this;

		const errors = [];

		if (item.level > statValues.level)
			errors.push('level');

		if (item.requires && item.requires[0] && statValues[item.requires[0].stat] < item.requires[0].value)
			errors.push('stats');

		if (item.factions?.some(f => reputation.getTier(f.id) < f.tier))
			errors.push('faction');

		return errors;
	},

	canEquipItem (item) {
		return (this.equipItemErrors(item).length === 0);
	}
};
