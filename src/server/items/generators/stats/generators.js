const mult = 1 / 11;
const mult2H = mult * 2;

const generators = {
	elementDmgPercent: (item, level, perfection) => {
		let max = level * 0.25;
		if (item.slot === 'twoHanded')
			max *= 2;

		if (perfection === undefined)
			return random.norm(1, max);

		return max * perfection;
	},

	addCritMultiplier: (item, level, perfection) => {
		const useMult = item.slot === 'twoHanded' ? mult2H : mult;

		const min = (level * 4.3) * useMult;
		const max = (level * 8.6) * useMult;

		if (perfection === undefined)
			return random.norm(1, max);

		return (min + ((max - min) * perfection));
	},

	addCritChance: (item, level, perfection) => {
		const useMult = item.slot === 'twoHanded' ? mult2H : mult;

		const min = level * 13.75 * useMult;
		const max = level * 27.5 * useMult;

		if (perfection === undefined)
			return random.norm(1, max);

		return (min + ((max - min) * perfection));
	},

	vit: (item, level, perfection) => {
		let max = level / 2;

		if (item.slot === 'twoHanded')
			max *= 2;

		if (perfection === undefined)
			return random.norm(1, max);

		return max * perfection;
	},

	mainStat: (item, level, perfection) => {
		const useMult = item.slot === 'twoHanded' ? mult2H : mult;

		let min = (level / 3) * useMult;
		let max = (level * 6) * useMult;

		if (perfection === undefined)
			return random.norm(min, max);

		return (min + ((max - min) * perfection));
	},
	armor: (item, level, perfection) => {
		let min = (level * 20);
		let max = (level * 50);

		if (perfection === undefined)
			return random.norm(min, max);

		return (min + ((max - min) * perfection));
	},
	elementResist: (item, level, perfection) => {
		const useMult = item.slot === 'twoHanded' ? mult2H : mult;

		if (perfection === undefined)
			return random.norm(1, 100) * useMult;

		return (1 + (99 * perfection)) * useMult;
	},
	regenHp: (item, level, perfection) => {
		let max = [
			1, 2, 2, 4, 4, 4, 5, 6, 7, 7,
			7, 10, 11, 11, 11, 12, 13, 13, 13, 14,
			14, 14, 17
		][level - 1];

		if (item.slot === 'twoHanded')
			max *= 2;

		if (perfection === undefined)
			return random.norm(1, max);

		return max * perfection;
	},
	lvlRequire: (item, level, perfection) => {
		let max = level / 2;

		if (perfection === undefined)
			return Math.round(random.norm(1, max));

		return Math.round(max * perfection);
	},
	lifeOnHit: (item, level, perfection) => {
		let max = [
			0.5, 0.5, 1, 5, 5, 5, 5, 8, 8, 8,
			9, 13, 13, 13, 13, 17, 17, 17, 17, 21,
			21, 22, 24
		][level - 1];
		const min = 1;

		if (item.slot === 'twoHanded')
			max *= 2;

		if (perfection === undefined)
			return (min + random.norm(1, max));

		return (min + (max * perfection));
	},

	addDamage: (item, level, perfection) => {
		let max = Math.pow(level / balance.maxLevel, 3) * level * 3;
		if (item.slot === 'twoHanded')
			max *= 1.85;

		if (perfection === undefined)
			return random.norm(1, max);

		return max * perfection;
	}
};

module.exports = generators;
	
