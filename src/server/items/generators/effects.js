const rollValues = (rollsDefinition, result, blueprint) => {
	for (let p in rollsDefinition) {
		const entry = rollsDefinition[p];

		if (typeof(entry) === 'object' && entry !== null && !Array.isArray(entry) ) {
			const newResult = {};

			result[p] = newResult;

			rollValues(entry, newResult, blueprint);

			continue;
		}

		const range = entry;
		const isInt = (p.indexOf('i_') === 0);
		const fieldName = p.replace('i_', '');

		//Keys that start with s_ indicate that they shouldn't be rolled
		// We use this to allow arrays inside rolls to be hardcoded
		if (!Array.isArray(entry) || p.indexOf('s_') === 0) {
			if (p.indexOf('s_') === 0)
				result[p.substr(2)] = range;
			else
				result[fieldName] = range;

			continue;
		}

		let value;
		if (blueprint.spellPerfection !== undefined)
			value = range[0] + (blueprint.spellPerfection * (range[1] - range[0]));
		else
			value = range[0] + (Math.random() * (range[1] - range[0]));

		if (isInt)
			value = ~~value;

		result[fieldName] = value;
	}
};

module.exports = {
	generate: function (item, blueprint) {
		if (!blueprint.effects)
			return;

		item.effects = blueprint.effects.map(e => {
			let rolls = e.rolls;
			let newRolls = {};

			rollValues(rolls, newRolls, blueprint);

			return {
				type: e.type,
				properties: e.properties,
				rolls: newRolls
			};
		});
	}
};
