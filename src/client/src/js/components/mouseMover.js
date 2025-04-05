import events from '../system/events';
import renderer from '../rendering/renderer';
import input from '../input';

export default {
	type: 'mouseMover',

	hoverTile: {
		x: 0,
		y: 0
	},

	path: [],

	pathColor: 'rgba(255, 255, 255, 0.5)',

	mouseDown: false,
	opacityCounter: 0,

	sprite: null,

	init () {
		this.hookEvent('onUiHover', this.onUiHover.bind(this, true));
		this.hookEvent('onUiLeave', this.onUiHover.bind(this, false));

		this.sprite = renderer.buildObject({
			layerName: 'effects',
			x: 0,
			y: 0,
			sheetName: 'ui',
			cell: 7
		});
	},

	onUiHover (dunno, onUiHover) {
		if (this.sprite)
			this.sprite.visible = !onUiHover;
	},

	showPath (e) {
		if ((e.button !== null) && (e.button !== 0))
			return;

		let tileX = ~~(e.x / scale);
		let tileY = ~~(e.y / scale);

		if ((tileX === this.hoverTile.x) && (tileY === this.hoverTile.y))
			return;

		events.emit('onChangeHoverTile', tileX, tileY);

		this.hoverTile.x = ~~(e.x / scale);
		this.hoverTile.y = ~~(e.y / scale);

		this.sprite.x = (this.hoverTile.x * scale);
		this.sprite.y = (this.hoverTile.y * scale);
	},

	update () {
		this.opacityCounter++;
		if (this.sprite)
			this.sprite.alpha = 0.35 + Math.abs(Math.sin(this.opacityCounter / 20) * 0.35);
		this.showPath(input.mouse);
	},

	destroy () {
		renderer.destroyObject({ sprite: this.sprite });

		this.unhookEvents();
	}
};
