//Imports
const eventEmitter = require('../misc/events');

const serverBalance = {
	//The maximum level a player can reach
	maxLevel: 23,

	//Rune damage is multiplied by nth entry from this array where n = level - 1
	dmgMults: [
		0.643, 0.554, 0.754, 0.675, 0.655, 0.788, 0.764, 0.768, 0.764, 0.877,
		0.897, 1.010, 1.034, 1.076, 1.219, 1.256, 1.330, 1.379, 1.576, 1.724,
		1.946, 2.167, 2.399
	],

	//Mob HP is multiplied by nth entry from this array where n = level - 1
	// y = 0.1 * ⋅x^1.471
	hpMults: [0.100, 0.277, 0.503, 0.768, 1.067, 1.395, 1.750, 2.130, 2.532, 2.957, 3.402, 3.866, 4.349, 4.850, 5.368, 5.903, 6.453, 7.019, 7.600, 8.195, 8.805, 9.429, 10.066]
};

const initMainThread = () => {
	const emBeforeGetBalance = {
		threadArgs: null,
		isMainThread: true,
		balance: serverBalance
	};

	eventEmitter.emit('beforeGetBalance', emBeforeGetBalance);
};

const initMapThread = threadArgs => {
	const emBeforeGetBalance = {
		threadArgs: threadArgs,
		isMainThread: false,
		balance: serverBalance
	};

	eventEmitter.emit('beforeGetBalance', emBeforeGetBalance);
};

module.exports = {
	initMainThread,
	initMapThread,
	balance: serverBalance
};
