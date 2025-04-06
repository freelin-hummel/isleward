const serializeProps = [
	'sound',
	'defaultMusic',
	'volume',
	'music'
];

module.exports = {
	type: 'sound',

	simplified: null,

	buildSimplified () {
		const s = Object.fromEntries(
			serializeProps
				.map(p => {
					if (!this.has(p))
						return null;

					return [p, this[p]];
				})
				.filter(p => !!p)
		);

		s.type = 'sound';

		let file = s.sound;
		if (!file.includes('server'))
			file = 'audio/' + file;
		s.sound = file;

		this.simplified = s;
	},

	simplify () {
		if (!this.simplified)
			this.buildSimplified();

		return this.simplified;
	}
};
