const defaultConfig = [{
	name: 'Iron Bar',
	sprite: [0, 0],
	quality: 0,
	chance: 100
}, {
	name: 'Cloth Scrap',
	sprite: [0, 1],
	quality: 0,
	chance: 100
}, {
	name: 'Leather Scrap',
	sprite: [0, 7],
	quality: 0,
	chance: 100
}, {
	name: 'Common Essence',
	sprite: [0, 2],
	quality: 0,
	chance: 35
}, {
	name: 'Magic Essence',
	sprite: [0, 3],
	quality: 1,
	chance: 25
}, {
	name: 'Rare Essence',
	sprite: [0, 4],
	quality: 2,
	chance: 15
}, {
	name: 'Epic Essence',
	sprite: [0, 5],
	quality: 3,
	chance: 5
}, {
	name: 'Legendary Essence',
	sprite: [0, 6],
	quality: 4,
	chance: 1
}, {
	name: 'Cerulean Pearl',
	sprite: [11, 9],
	quality: 3,
	chance: 1
}];

const buildPool = config => {
	const pool = [];

	config.forEach(c => {
		for (let i = 0; i < c.chance; i++) 
			pool.push(c.name);
	});

	return pool;
};

const defaultPool = buildPool(defaultConfig);

module.exports = (itemCount, useConfig) => {
	const config = useConfig || defaultConfig;
	const pool = useConfig ? buildPool(useConfig) : defaultPool;

	const items = [];
		
	for (let i = 0; i < itemCount; i++) {
		let pickName = pool[~~(Math.random() * pool.length)];
		const pick = config.find(f => f.name === pickName);

		let item = items.find(f => f.name === pickName);
		if (!item) {
			items.push({
				name: pick.name,
				material: true,
				quality: pick.quality,
				sprite: pick.sprite,
				quantity: pick.quantity || 1
			});
		} else
			item.quantity += (pick.quantity || 1);
	}

	items.sort((a, b) => {
		const ai = config.findIndex(c => c.name === a.name);
		const bi = config.findIndex(c => c.name === b.name);

		//If something isn't in config for some reason, push it to the end
		if (ai === -1 && bi === -1)
			return 0;
		if (ai === -1)
			return 1;
		if (bi === -1)
			return -1;

		return ai - bi;
	});

	return items;
};

