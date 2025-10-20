// config.js
import globals from './system/globals';
import browserStorage from './system/browserStorage';

let options;
let valueChains;
let meta;

const getKeyName = key => `opt_${key.toLowerCase()}`;

const getNextValue = key => {
	const currentValue = options[key];
	const chain = valueChains[key];
	const currentIndex = chain.indexOf(currentValue);
	return chain[(currentIndex + 1) % chain.length];
};

const save = (key, value) => {
	browserStorage.set(getKeyName(key), value);
	options[key] = value;
};

const config = {
	set: (key, value) => save(key, value),

	toggle: key => {
		if (valueChains[key])
			save(key, getNextValue(key));
		else
			save(key, !options[key]);
	},

	toggleDynamic: key => {
		// find definition in meta array (ignore section entries)
		const def = meta.find(m => m.key === key);
		if (!def) return;

		let newValue = options[key];

		switch (def.type) {
		case 'boolean':
			newValue = !options[key];
			break;
		case 'cycle':
			newValue = getNextValue(key);
			break;
		case 'volume':
			// volume handled separately by buttons
			newValue = options[key];
			break;
		}

		save(key, newValue);
		return newValue;
	},

	get: key => options[key]
};

const loadValue = key => {
	const stored = browserStorage.get(getKeyName(key));
	if (stored === '{unset}')
		return;

	if (stored === 'true' || stored === 'false')
		options[key] = stored === 'true';
	else if (!isNaN(parseFloat(stored)))
		options[key] = parseFloat(stored);
	else
		options[key] = stored;
};

export const init = () => {
	const { clientOptions } = globals.clientConfig;

	options = clientOptions.options;
	valueChains = clientOptions.valueChains;
	meta = clientOptions.meta;

	Object.keys(options).forEach(loadValue);
	Object.assign(config, options);
};

export default config;
