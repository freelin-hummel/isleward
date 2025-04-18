import spritePool from '../spritePool';
import { Container, ParticleContainer } from 'pixi.js';

const resetRenderer = function () {
	let map = this.map;
	let w = this.w = map.length;
	let h = this.h = map[0].length;

	const { app: { stage } } = this;

	stage.removeChild(this.layers.hiders);
	this.layers.hiders = new Container();
	this.layers.hiders.layer = 'hiders';
	stage.addChild(this.layers.hiders);

	let container = this.layers.tileSprites;
	stage.removeChild(container);

	this.layers.tileSprites = container = new ParticleContainer({
		dynamicProperties: {
			position: false
		}
	});

	container.layer = 'tiles';
	stage.addChild(container);

	stage.children.sort((a, b) => {
		if (a.layer === 'hiders')
			return 1;
		else if (b.layer === 'hiders')
			return -1;
		else if (a.layer === 'tiles')
			return -1;
		else if (b.layer === 'tiles')
			return 1;

		return 0;
	});

	spritePool.clean();

	this.sprites = _.get2dArray(w, h, 'array');

	this.map = [];
	this.w = 0;
	this.h = 0;

	delete this.moveTo;
};

export default resetRenderer;
