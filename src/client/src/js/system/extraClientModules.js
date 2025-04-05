import globals from './globals.js';
import modModules from '@modModules';

export default {
	async init () {
		const { clientConfig: { extraClientModules } } = globals;

		extraClientModules.forEach(path => {
			const clientModule = modModules[path.split('/').pop()];

			clientModule.default.init();
		});
	}
};
