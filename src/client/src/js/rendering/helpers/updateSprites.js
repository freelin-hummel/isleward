import { Particle } from 'pixi.js';

import events from '../../system/events';
import tileOpacity from '../tileOpacity';
import spritePool from '../spritePool';
import _renderer from '../renderer';

const mRandom = Math.random.bind(Math);

const buildParticle = (useTile, _x, _y, flipX) => {
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

/* eslint-disable-next-line max-lines-per-function */
const updateSprites = renderer => {
	if (renderer.titleScreen)
		return;

	const player = window.player;
	if (!player)
		return;

	const { w, h, width, height, app: { stage }, map, sprites } = renderer;

	const x = ~~((-stage.x / scale) + (width / (scale * 2)));
	const y = ~~((-stage.y / scale) + (height / (scale * 2)));

	renderer.lastUpdatePos.x = stage.x;
	renderer.lastUpdatePos.y = stage.y;

	const container = renderer.layers.tileSprites;

	const sw = renderer.showTilesW;
	const sh = renderer.showTilesH;

	let lowX = Math.max(0, x - sw + 1);
	let lowY = Math.max(0, y - sh + 2);
	let highX = Math.min(w, x + sw - 2);
	let highY = Math.min(h, y + sh - 2);

	let addedSprite = false;

	const checkHidden = renderer.isHidden.bind(renderer);

	const newVisible = [];
	const newHidden = [];

	for (let i = lowX; i < highX; i++) {
		let mapRow = map[i];
		let spriteRow = sprites[i];

		for (let j = lowY; j < highY; j++) {
			const cell = mapRow[j];
			if (!cell)
				continue;

			const cLen = cell.length;
			if (!cLen)
				return;

			const rendered = spriteRow[j];
			const isHidden = checkHidden(i, j);

			if (isHidden) {
				const nonFakeRendered = rendered.filter(r => !r.isFake);

				const rLen = nonFakeRendered.length;
				for (let k = 0; k < rLen; k++) {
					const sprite = nonFakeRendered[k];

					sprite.visible = false;
					spritePool.store(sprite);
					_.spliceWhere(rendered, s => s === sprite);
				}

				if (cell.visible) {
					cell.visible = false;
					newHidden.push({
						x: i,
						y: j
					});
				}

				const hasFake = cell.some(c => c[0] === '-');
				if (hasFake) {
					const isFakeRendered = rendered.some(r => r.isFake);
					if (isFakeRendered)
						continue;
				} else
					continue;
			} else {
				const fakeRendered = rendered.filter(r => r.isFake);

				const rLen = fakeRendered.length;
				for (let k = 0; k < rLen; k++) {
					const sprite = fakeRendered[k];

					sprite.visible = false;
					spritePool.store(sprite);
					_.spliceWhere(rendered, s => s === sprite);
				}

				if (!cell.visible) {
					cell.visible = true;
					newVisible.push({
						x: i,
						y: j
					});
				}

				const hasNonFake = cell.some(c => c[0] !== '-');
				if (hasNonFake) {
					const isNonFakeRendered = rendered.some(r => !r.isFake);
					if (isNonFakeRendered)
						continue;
				} else
					continue;
			}

			for (let k = 0; k < cLen; k++) {
				let c = cell[k];
				if (c === '0' || c === '')
					continue;

				const isFake = +c < 0;
				if (isFake && !isHidden)
					continue;
				else if (!isFake && isHidden)
					continue;

				if (isFake)
					c = -c;

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
					addedSprite = true;
				} else {
					tile.x = i * scale;
					tile.y = j * scale;
					if (flipped !== '')
						tile.x += scale;
					tile.visible = true;
				}

				if (isFake)
					tile.isFake = isFake;

				tile.z = k;

				rendered.push(tile);
			}
		}
	}

	lowX = Math.max(0, lowX - 10);
	lowY = Math.max(0, lowY - 10);
	highX = Math.min(w - 1, highX + 10);
	highY = Math.min(h - 1, highY + 10);

	for (let i = lowX; i < highX; i++) {
		const mapRow = map[i];
		let spriteRow = sprites[i];
		let outside = ((i >= x - sw) && (i < x + sw));
		for (let j = lowY; j < highY; j++) {
			if ((outside) && (j >= y - sh) && (j < y + sh))
				continue;

			const cell = mapRow[j];

			if (cell.visible) {
				cell.visible = false;
				newHidden.push({
					x: i,
					y: j
				});
			}

			let list = spriteRow[j];
			let lLen = list.length;
			for (let k = 0; k < lLen; k++) {
				let sprite = list[k];
				sprite.visible = false;
				spritePool.store(sprite);
			}
			spriteRow[j] = [];
		}
	}

	events.emit('onTilesVisible', newVisible, true);
	events.emit('onTilesVisible', newHidden, false);

	if (addedSprite)
		container.children.sort((a, b) => a.z - b.z);
};

export default updateSprites;
