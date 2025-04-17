import events from '../system/events';
import renderer from '../rendering/renderer';

const barPadding = scaleMult;
const barHeight = scaleMult;

export default {
	type: 'stats',

	values: null,

	bars: [],

	init () {
		if (this.obj.self)
			events.emit('onGetStats', this.values);

		if (_.has(this.obj, 'serverId'))
			events.emit('onGetPartyStats', this.obj.serverId, this.values);

		let obj = this.obj;

		this.addBar({
			color: 0x802343,
			innerColor: 0xd43346,
			calcPercent: () => (this.values.hp / this.values.hpMax),
			isVisible: () => (this.values.hp < this.values.hpMax) && (!obj.sprite || obj.sprite.visible)
		});

		this.updateBars();
	},

	addBar (config) {
		let obj = this.obj;

		let { color, innerColor, calcPercent, isVisible } = config;

		let sprite = renderer.buildRectangle({
			layerName: 'effects',
			x: obj.x * scale,
			y: obj.y * scale,
			w: 1,
			h: 1,
			color
		});
		let spriteInner = renderer.buildRectangle({
			layerName: 'effects',
			x: obj.x,
			y: obj.y,
			w: 1,
			h: 1,
			color: innerColor
		});

		let bar = {
			sprite,
			spriteInner,
			calcPercent,
			isVisible
		};

		this.bars.push(bar);

		return bar;
	},

	removeBar (bar) {
		this.removeSprites(this.bars.find(b => b === bar));

		_.spliceFirstWhere(this.bars, b => b === bar);
	},

	removeSprites (bar) {
		renderer.destroyObject({
			sprite: bar.sprite,
			layerName: 'effects'
		});

		renderer.destroyObject({
			sprite: bar.spriteInner,
			layerName: 'effects'
		});
	},

	updateBars () {
		const { obj: { x, y, dead, sprite } } = this;

		if (dead)
			return;

		let barIndex = 0;

		this.bars.forEach(bar => {
			const percent = bar.calcPercent();

			//By default, hp sprites are 10px higher than the owner object's sprite. Keeping in
			// mind that bigger sprites always have their 'origin' in the bottom middle tile
			const spriteHeight = sprite ? sprite.height : scale;
			const spriteWidth = sprite ? sprite.width : scale;

			const xOffset = -(spriteWidth - scale) / 2;
			const yOffset = -(spriteHeight - scale) - ((barIndex + 1) * scaleMult * 2);

			const barWidth = spriteWidth - (barPadding * 2);

			const newX = (x * scale) + barPadding + xOffset;
			const newY = (y * scale) + yOffset;

			renderer.moveRectangle({
				sprite: bar.sprite,
				x: newX,
				y: newY,
				w: barWidth,
				h: barHeight
			});

			renderer.moveRectangle({
				sprite: bar.spriteInner,
				x: newX,
				y: newY,
				w: percent * barWidth,
				h: barHeight
			});

			const isVisible = bar.isVisible ? bar.isVisible() : true;

			if (isVisible)
				barIndex++;

			bar.sprite.visible = isVisible;
			bar.spriteInner.visible = isVisible;
		});
	},

	updateBarVisibility (visible) {
		this.bars.forEach(bar => {
			const isVisible = (visible !== undefined) ? visible : bar.isVisible();

			bar.sprite.visible = isVisible;
			bar.spriteInner.visible = isVisible;
		});
	},

	extend (blueprint) {
		let bValues = blueprint.values || {};

		let values = this.values;

		for (let b in bValues)
			values[b] = bValues[b];

		if (this.obj.self)
			events.emit('onGetStats', this.values, blueprint);

		if (_.has(this.obj, 'serverId'))
			events.emit('onGetPartyStats', this.obj.serverId, this.values);

		this.updateBars();
	},

	destroy () {
		this.bars.forEach(bar => {
			this.removeSprites(bar);
		});
	}
};
