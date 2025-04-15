import globals from './system/globals';
import events from './system/events';
import modImages from '@modImages';

let loadedCount = 0;

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

		await Promise.all(fullList.map(r => {
			return new Promise(resolve => {
				const sprite = new Image();

				if (r.includes('server/')) {
					const base64 = modImages[r];
					if (!base64)
						console.error(`❌ Could not find a base64 entry for: ${r}`);
					else
						sprite.src = `data:image/png;base64,${base64}`;
				} else
					sprite.src = `images/${r}.png`;

				sprites[r] = sprite;

				sprite.onload = () => {
					loadedCount++;

					events.emit('loaderProgress', {
						type: 'resources',
						progress: loadedCount / fullList.length
					});

					resolve();
				};

				sprite.onerror = () => {
					console.error(`❌ Failed to load image: ${r}`);
					resolve();
				};
			});
		}));
	}
};

export default resources;
