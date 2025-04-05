import globals from './system/globals.js';
import modImages from '@modImages';

const resources = {
	sprites: {},

	async init () {
		const { sprites } = this;
		const { clientConfig: { resourceList, textureList } } = globals;

		// Combine your two lists into one
		const fullList = [...resourceList, ...textureList];

		Object.keys(modImages).forEach(k => {
			if (!fullList.includes(k))
				fullList.push(k);
		});

		await Promise.all(fullList.map(name => {
			return new Promise(resolve => {
				const sprite = new Image();

				if (name.includes('server/')) {
					// Load from the base64 object
					const base64 = modImages[name];
					if (!base64)
						console.error(`❌ Could not find a base64 entry for: ${name}`);
					else {
						// Prepend "data:image/png;base64,"
						sprite.src = `data:image/png;base64,${base64}`;
					}
				} else {
					// Load from your local images/ folder
					sprite.src = `images/${name}.png`;
				}

				// Store it in the sprites object
				sprites[name] = sprite;

				sprite.onload = resolve;
				sprite.onerror = () => {
					console.error(`❌ Failed to load image: ${name}`);
					resolve();
				};
			});
		}));
	}
};

export default resources;
