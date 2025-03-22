let events = require('../misc/events');

module.exports = {
	init: function () {
		events.emit('onBeforeGetHerbConfig', this);
	},

	Moonbell: {
		sheetName: 'tiles',
		cell: 50,
		itemSprite: [1, 1]
	},
	Skyblossom: {
		sheetName: 'tiles',
		cell: 52,
		itemSprite: [1, 2]
	},
	Emberleaf: {
		sheetName: 'tiles',
		cell: 51,
		itemSprite: [1, 0]
	},
	Stinkcap: {
		sheetName: 'tiles',
		cell: 57,
		itemSprite: [2, 0]
	}
};
