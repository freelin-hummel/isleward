//Imports
const eventEmitter = require('../misc/events');

const serverBalance = {
	//The maximum level a player can reach
	maxLevel: 23,

	//Rune damage is multiplied by nth entry from this array where n = level - 1
	dmgMults: [
		0.23, 0.335, 0.48, 0.45, 0.445, 0.53, 0.63, 0.525, 0.615, 0.695,
		0.8, 0.705, 0.805, 0.9, 1.02, 0.95, 1.1, 1.22, 1.4, 1.39,
		1.6, 1.85, 2.23
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
