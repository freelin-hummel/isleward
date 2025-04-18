import { Particle } from 'pixi.js';

import tileOpacity from '../tileOpacity';
import spritePool from '../spritePool';
import _renderer from '../renderer';

const mRandom = Math.random.bind(Math);

export const buildParticle = (useTile, _x, _y, flipX) => {
	let alpha = tileOpacity.map(useTile);

	const texture = _renderer.getTexture('sprites', useTile);
	const frame = texture.frame;
	const scaleFactor = scale / frame.width;

	let x = _x * scale;
	if (flipX)
		x += scale;

	let particle = new Particle({
		texture,
		x,
		y: _y * scale,
		scaleX: flipX ? -scaleFactor : scaleFactor,
		scaleY: scaleFactor,
		alpha
	});

	return particle;
};
 
const renderMap = renderer => {
	if (renderer.titleScreen)
		return;

	if (renderer.mapRendered)
		return;

	renderer.mapRendered = true;

	const { map, sprites } = renderer;

	const container = renderer.layers.tileSprites;

	for (let i = 0; i < map.length; i++) {
		let mapRow = map[i];
		let spriteRow = sprites[i];

		for (let j = 0; j < mapRow.length; j++) {
			const cell = mapRow[j];
			if (!cell)
				continue;

			const cLen = cell.length;
			if (!cLen)
				return;

			const rendered = spriteRow[j];

			if (!cell.visible)
				cell.visible = true;

			for (let k = 0; k < cLen; k++) {
				let c = cell[k];
				if (c === '0' || c === '')
					continue;

				const isFake = +c < 0;
				if (isFake)
					continue;

				c--;

				let flipped = '';
				if (tileOpacity.canFlip(c)) {
					if (mRandom() < 0.5)
						flipped = 'flip';
				}

				let tile = spritePool.getSprite(flipped + c);
				if (!tile) {
					tile = buildParticle(c, i, j, flipped === 'flip');
					container.addParticle(tile);
					tile.type = c;
					tile.sheetNum = tileOpacity.getSheetNum(c);
				} else {
					tile.x = i * scale;
					tile.y = j * scale;
					if (flipped !== '')
						tile.x += scale;
					container.addParticle(tile);
				}

				tile.z = k;

				rendered.push(tile);
			}
		}
	}

	container.particleChildren.sort((a, b) => a.z - b.z);

	container.update();
};

export default renderMap;
