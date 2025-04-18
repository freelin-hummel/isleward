import { Container, Sprite, Graphics } from 'pixi.js';

import events from '../../system/events';
import physics from '../../misc/physics';
import objects from '../../objects/objects';

const createTexture = renderer => {
	const tmp = new Graphics()
		.beginFill(0x2d2136)
		.drawRect(0, 0, 40, 40)
		.endFill();

	const rectTexture = renderer.app.renderer.generateTexture(tmp);

	tmp.destroy();

	return rectTexture;
};

const buildHiddenContainers = renderer => {
	const { hiddenRooms, hiddenContainers, map } = renderer;

	const texture = createTexture(renderer);

	const newHidden = [];

	hiddenRooms.forEach(r => {
		const { x, y, width, height, area } = r;

		if (!area)
			return;

		const container = new Container();
		hiddenContainers.push({
			container,
			room: r
		});

		for (let i = x; i < x + width; i++) {
			const row = map[i];
			for (let j = y; j < y + height; j++) {
				if (!physics.isInPolygon(i, j, area))
					continue;

				const cell = row[j];

				const tile = new Sprite({
					texture,
					x: i * scale,
					y: j * scale,
					width: scale,
					height: scale
				});

				container.addChild(tile);

				newHidden.push({ x: i, y: j });

				const hasFake = cell.some(c => c[0] === '-');
				if (hasFake) {
					for (let k = 0; k < cell.length; k++) {
						let c = cell[k];
						if (c === '0' || c === '' || c[0] !== '-')
							continue;

						c = -c;
						c--;

						const fakeTile = renderer.buildTile(c, i, j);

						container.addChild(fakeTile);
					}
				}
			}
		}

		renderer.layers.hiders.addChild(container);
	});

	events.emit('onTilesVisible', newHidden, false);
};

export const updateHiddenContainers = renderer => {
	if (!window.player)
		return;

	const { player: { x, y } } = window;

	const { hiddenContainers } = renderer;

	const newVisible = [];
	const newHidden = [];

	const addPositionsToArray = (eventType, room) => {
		const { x: rx, y: ry, width, height, area } = room;

		for (let i = rx; i < rx + width; i++) {
			for (let j = ry; j < ry + height; j++) {
				if (!physics.isInPolygon(i, j, area))
					continue;

				if (eventType === 'worldTilesBecameHidden')
					newHidden.push({ x: i, y: j });
				else if (eventType === 'worldTilesBecameVisible')
					newVisible.push({ x: i, y: j });
			}
		}
	};

	let playerInHider = false;
	let playerWasInterior = false;

	hiddenContainers.forEach(h => {
		const {
			room: { x: rx, y: ry, width, height, area, discovered, interior },
			container,
			controlsMask = false
		} = h;

		if (
			!discovered &&
			(
				(x < rx || y < ry || x >= rx + width || y >= ry + height) ||
				!physics.isInPolygon(x, y, area)
			)
		) {
			if (!container.visible) {
				addPositionsToArray('worldTilesBecameHidden', h.room);
				container.visible = true;

				if (interior && controlsMask) {
					h.controlsMask = false;
					renderer.interiorMask.clear();

					playerWasInterior = true;
				}
			}

			return;
		}

		if (container.visible) {
			addPositionsToArray('worldTilesBecameVisible', h.room);
			container.visible = false;

			if (interior) {
				hiddenContainers.forEach(f => {
					if (f.controlsMask)
						f.controlsMask = false;
				});

				h.controlsMask = true;

				renderer.interiorMask.clear();

				const maskG = renderer.interiorMask;

				maskG.clear()
					.poly(
						area
							.map(pt => ({ x: pt[0] * scale, y: pt[1] * scale }))
					)
					.fill({ color: '#ffffff' });

				renderer.app.stage.mask = maskG;
			}

			playerInHider = true;
		}
	});

	const maskActive = hiddenContainers.some(f => f.controlsMask);
	if (maskActive && !renderer.app.stage.mask) 
		renderer.app.stage.mask = renderer.interiorMask;
	else if (!maskActive && renderer.app.stage.mask)
		renderer.app.stage.mask = null;

	if (newVisible.length > 0)
		events.emit('onTilesVisible', newVisible, true);
	if (newHidden.length > 0)
		events.emit('onTilesVisible', newHidden, false);

	//When we exit an iterior, objets will never know that new tiles have become visible
	// unless we immediately enter another hider. Instead of marking each other tile in the
	// world as visible, we just tell it that we have exited an interior so it can check ALL objects
	if (playerWasInterior && !playerInHider)
		objects.recalcVisibility();
};

export default buildHiddenContainers;
