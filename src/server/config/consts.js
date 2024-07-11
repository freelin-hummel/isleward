//Imports
const eventEmitter = require('../misc/events');

//Module
module.exports = {
	//At which interval does each zone tick in ms
	tickTime: 350,

	//How far a player can see objects horizontally
	viewDistanceX: 32,

	//How far a player can see objects vertically
	viewDistanceY: 17,

	//How many milliseconds to wait to kill a thread after it's been empty
	destroyThreadWhenEmptyForMs: 10000,

	init: function (threadArgs) {
		const emBeforeGetConsts = {
			threadArgs,
			constValues: {}
		};

		Object.entries(this).forEach(([k, v]) => {
			if (typeof(v) === 'function')
				return;

			emBeforeGetConsts.constValues[k] = v;
		});

		eventEmitter.emit('beforeGetConsts', emBeforeGetConsts);

		Object.entries(emBeforeGetConsts.constValues).forEach(([k, v]) => {
			this[k] = v;
		});
	}
};
