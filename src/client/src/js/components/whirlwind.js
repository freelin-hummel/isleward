import effects from '../rendering/effects';

export default {
	type: 'whirlwind',

	source: null,

	row: null,
	col: null,
	frames: 4,
	frameDelay: 4,
	spriteSheet: 'attacks',

	delay: 32,
	coordinates: [],

	async init () {

		if (!this.source) {
			this.obj.destroyed = true;

			return;
		}

		this.coordinates.forEach(([x, y], i) => {
			const wait = i * this.delay;

			setTimeout(this.spawnThing.bind(this, x, y), wait);
		});

		effects.register(this);
	},

	spawnThing (x, y) {
		const { frames: frameCount, row, col, spriteSheet, frameDelay } = this;

		this.objects.buildObject({
			x,
			y,
			components: [{
				type: 'attackAnimation',
				row,
				col,
				frames: frameCount,
				spriteSheet,
				frameDelay
			}]
		});
	},

	destroy () {
		effects.unregister(this);
	}
};
