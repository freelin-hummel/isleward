import spritePool from '../spritePool';

const resetRenderer = function () {
	let map = this.map;
	let w = this.w = map.length;
	let h = this.h = map[0].length;

	this.layers.hiders.removeChildren();
	this.hiddenContainers.length = 0;

	this.layers.tileSprites.removeParticles(0, this.layers.tileSprites.particleChildren.length);

	spritePool.clean();

	this.sprites = _.get2dArray(w, h, 'array');

	this.map = [];
	this.w = 0;
	this.h = 0;

	this.interiorMask.clear();

	delete this.moveTo;
};

export default resetRenderer;
