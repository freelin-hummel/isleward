define([
	'js/resources',
	'js/system/events',
	'js/misc/physics',
	'js/rendering/effects',
	'js/rendering/tileOpacity',
	'js/rendering/particles',
	'js/rendering/shaders/outline',
	'js/rendering/spritePool',
	'js/rendering/helpers/updateSprites',
	'js/system/globals',
	'js/rendering/helpers/renderLoginBackground',
	'js/rendering/helpers/resetRenderer'
], function (
	resources,
	events,
	physics,
	effects,
	tileOpacity,
	particles,
	shaderOutline,
	spritePool,
	updateSprites,
	globals,
	renderLoginBackground,
	resetRenderer
) {
	const mRandom = Math.random.bind(Math);

	const particleLayers = ['particlesUnder', 'particles'];
	const particleEngines = {};

	return {
		stage: null,
		layers: {
			particlesUnder: null,
			objects: null,
			mobs: null,
			characters: null,
			attacks: null,
			effects: null,
			particles: null,
			lightPatches: null,
			lightBeams: null,
			tileSprites: null,
			hiders: null
		},

		titleScreen: false,

		width: 0,
		height: 0,

		showTilesW: 0,
		showTilesH: 0,

		pos: {
			x: 0,
			y: 0
		},
		moveTo: null,
		moveSpeed: 0,
		moveSpeedMax: 1.50,
		moveSpeedInc: 0.5,

		lastUpdatePos: {
			x: 0,
			y: 0
		},

		zoneId: null,

		textures: {},
		textureCache: {},

		sprites: [],

		lastTick: null,

		hiddenRooms: null,

		staticCamera: false,

		init: function () {
			PIXI.settings.GC_MODE = PIXI.GC_MODES.AUTO;
			PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
			PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
			PIXI.settings.RESOLUTION = 1;

			events.on('onGetMap', this.onGetMap.bind(this));
			events.on('onToggleFullscreen', this.toggleScreen.bind(this));
			events.on('onMoveSpeedChange', this.adaptCameraMoveSpeed.bind(this));
			events.on('resetRenderer', resetRenderer.bind(this));

			this.width = $('body').width();
			this.height = $('body').height();

			this.showTilesW = Math.ceil((this.width / scale) / 2) + 3;
			this.showTilesH = Math.ceil((this.height / scale) / 2) + 3;

			this.renderer = new PIXI.Renderer({
				width: this.width,
				height: this.height,
				backgroundColor: '0x2d2136'
			});

			window.addEventListener('resize', this.onResize.bind(this));

			$(this.renderer.view).appendTo('.canvas-container');

			this.stage = new PIXI.Container();

			let layers = this.layers;
			Object.keys(layers).forEach(l => {
				layers[l] = new PIXI.Container();
				layers[l].layer = (l === 'tileSprites') ? 'tiles' : l;

				this.stage.addChild(layers[l]);
			});

			const textureList = globals.clientConfig.textureList;
			const sprites = resources.sprites;

			textureList.forEach(t => {
				this.textures[t] = new PIXI.BaseTexture(sprites[t]);
				this.textures[t].scaleMode = PIXI.SCALE_MODES.NEAREST;
			});

			particleLayers.forEach(p => {
				const engine = $.extend({}, particles);
				engine.init({
					r: this,
					renderer: this.renderer,
					stage: this.layers[p]
				});

				particleEngines[p] = engine;
			});

			this.buildSpritesTexture();
		},

		buildSpritesTexture: function () {
			const { clientConfig: { atlasTextureDimensions, atlasTextures } } = globals;

			let container = new PIXI.Container();

			let totalHeight = 0;
			atlasTextures.forEach(t => {
				let texture = this.textures[t];
				let tile = new PIXI.Sprite(new PIXI.Texture(texture));
				tile.width = texture.width;
				tile.height = texture.height;
				tile.x = 0;
				tile.y = totalHeight;

				atlasTextureDimensions[t] = {
					w: texture.width / 8,
					h: texture.height / 8
				};

				container.addChild(tile);

				totalHeight += tile.height;
			});

			let renderTexture = PIXI.RenderTexture.create(this.textures.tiles.width, totalHeight);
			this.renderer.render(container, renderTexture);

			this.textures.sprites = renderTexture;
			this.textures.scaleMult = PIXI.SCALE_MODES.NEAREST;
		},

		toggleScreen: function () {
			let isFullscreen = (window.innerHeight === screen.height);

			if (isFullscreen) {
				let doc = document;
				(doc.cancelFullscreen || doc.msCancelFullscreen || doc.mozCancelFullscreen || doc.webkitCancelFullScreen).call(doc);
				return 'Windowed';
			} 

			let el = $('body')[0];
			(el.requestFullscreen || el.msRequestFullscreen || el.mozRequestFullscreen || el.webkitRequestFullscreen).call(el);
			return 'Fullscreen';
		},

		buildTitleScreen: function () {
			this.titleScreen = true;
			this.staticCamera = false;

			this.layers.tileSprites.removeChildren();

			renderLoginBackground(this);
		},

		onResize: function () {
			if (isMobile)
				return;

			this.width = $('body').width();
			this.height = $('body').height();

			this.showTilesW = Math.ceil((this.width / scale) / 2) + 3;
			this.showTilesH = Math.ceil((this.height / scale) / 2) + 3;

			this.renderer.resize(this.width, this.height);
			if (window.player) {
				this.setPosition({
					pos: {
						x: window.player.x,
						y: window.player.y
					},
					instant: true
				});
			}

			if (this.titleScreen) {
				this.clean();
				this.buildTitleScreen();
			}

			events.emit('onResize');
		},

		getTexture: function (baseTex, cell, size) {
			size = size || 8;
			let textureName = baseTex + '_' + cell;

			let textureCache = this.textureCache;

			let cached = textureCache[textureName];

			if (!cached) {
				let y = ~~(cell / 8);
				let x = cell - (y * 8);
				cached = new PIXI.Texture(this.textures[baseTex], new PIXI.Rectangle(x * size, y * size, size, size));
				textureCache[textureName] = cached;
			}

			return cached;
		},

		clean: function () {
			this.stage.removeChild(this.layers.hiders);
			this.layers.hiders = new PIXI.Container();
			this.layers.hiders.layer = 'hiders';
			this.stage.addChild(this.layers.hiders);

			let container = this.layers.tileSprites;
			this.stage.removeChild(container);

			this.layers.tileSprites = container = new PIXI.Container();
			container.layer = 'tiles';
			this.stage.addChild(container);

			this.stage.children.sort((a, b) => {
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
		},

		buildTile: function (c, i, j) {
			let alpha = tileOpacity.map(c);
			let canFlip = tileOpacity.canFlip(c);

			let tile = new PIXI.Sprite(this.getTexture('sprites', c));

			tile.alpha = alpha;
			tile.position.x = i * scale;
			tile.position.y = j * scale;
			tile.width = scale;
			tile.height = scale;

			if (canFlip && mRandom() < 0.5) {
				tile.position.x += scale;
				tile.scale.x = -scaleMult;
			}

			return tile;
		},

		onGetMap: function (msg) {
			const { zoneId, collisionMap, map, hiddenRooms, clientObjects, rendererConfig } = msg;
			const { staticCamera = false, cameraPosition } = rendererConfig;

			this.map = map;

			this.titleScreen = false;
			physics.init(collisionMap);

			let w = this.w = map.length;
			let h = this.h = map[0].length;

			for (let i = 0; i < w; i++) {
				let row = map[i];
				for (let j = 0; j < h; j++) {
					if (!row[j].split)
						row[j] += '';

					row[j] = row[j].split(',');
				}
			}

			this.clean();
			spritePool.clean();

			this.stage.filters = [new PIXI.filters.AlphaFilter()];
			this.stage.filterArea = new PIXI.Rectangle(0, 0, Math.max(w * scale, this.width), Math.max(h * scale, this.height));

			this.hiddenRooms = hiddenRooms;

			this.sprites = _.get2dArray(w, h, 'array');

			this.stage.children.sort((a, b) => {
				if (a.layer === 'tiles')
					return -1;
				else if (b.layer === 'tiles')
					return 1;
				return 0;
			});

			if (this.zoneId !== null) {
				events.emit('onRezone', {
					oldZoneId: this.zoneId,
					newZoneId: zoneId
				});
			}

			this.zoneId = zoneId;

			clientObjects.forEach(c => {
				c.zoneId = this.zoneId;
				events.emit('onGetObject', c);
			});

			if (staticCamera) {
				this.staticCamera = true;

				this.setPosition({
					pos: {
						x: cameraPosition.x,
						y: cameraPosition.y
					},
					instant: true,
					staticPosition: true
				});
			} else
				this.staticCamera = false;

			//Normally, the mounts mod queues this event when unmounting.
			// If we rezone, our effects are destroyed, so the event is queued,
			// but flushForTarget clears the event right after and the event is never received.
			// We emit it again here to make sure the speed is reset after entering the new zone.
			events.emit('onMoveSpeedChange', 0);
		},

		/*
		pos: { x, y }
			The x and y positions the camera should be centered on (not yet multiplied by scale)
		instant: boolean
			should the camera pan to the location or not
		*/
		setPosition: function ({ pos = { x: 0, y: 0 }, instant, staticPosition }) {
			let { x, y } = pos;

			x = (x - (this.width / (scale * 2))) * scale;
			y = (y - (this.height / (scale * 2))) * scale;

			let player = window.player;
			if (player) {
				let px = player.x;
				let py = player.y;

				let hiddenRooms = this.hiddenRooms || [];
				let hLen = hiddenRooms.length;
				for (let i = 0; i < hLen; i++) {
					let h = hiddenRooms[i];
					if (!h.discoverable)
						continue;
					if (
						px < h.x ||
						px >= h.x + h.width ||
						py < h.y ||
						py >= h.y + h.height ||
						!physics.isInPolygon(px, py, h.area)
					)
						continue;

					h.discovered = true;
				}
			}

			const staticCamera = window.staticCamera ?? this.staticCamera;
			if (staticCamera && staticPosition === undefined) {
				this.updateSprites();
				
				return;
			}

			if (instant) {
				this.moveTo = null;

				this.pos = {
					x,
					y
				};

				this.stage.x = -~~x;
				this.stage.y = -~~y;
			} else {
				this.moveTo = {
					x,
					y
				};
			}

			this.updateSprites();
		},

		isVisible: function (x, y) {
			let stage = this.stage;
			let sx = -stage.x;
			let sy = -stage.y;

			let sw = this.width;
			let sh = this.height;

			return (!(x < sx || y < sy || x >= sx + sw || y >= sy + sh));
		},

		isHidden: function (x, y) {
			let hiddenRooms = this.hiddenRooms;
			let hLen = hiddenRooms.length;
			if (!hLen)
				return false;

			const { player: { x: px, y: py } } = window;

			let foundVisibleLayer = null;
			let foundHiddenLayer = null;

			const fnTileInArea = physics.isInArea.bind(physics, x, y);
			const fnPlayerInArea = physics.isInArea.bind(physics, px, py);

			hiddenRooms.forEach(h => {
				const { discovered, layer, interior } = h;

				const playerInHider = fnPlayerInArea(h);
				const tileInHider = fnTileInArea(h);

				if (playerInHider) {
					if (interior && !tileInHider) {
						foundHiddenLayer = layer;

						return;
					}
				} else if (tileInHider && !discovered) {
					foundHiddenLayer = layer;

					return;
				} else if (tileInHider && discovered) {
					foundVisibleLayer = layer;

					return;
				}

				if (!tileInHider)
					return;

				foundVisibleLayer = layer;
			});

			//We compare hider layers to cater for hiders inside hiders
			return (
				foundHiddenLayer > foundVisibleLayer || 
				(
					foundHiddenLayer === 0 &&
					foundVisibleLayer === null
				)
			);
		},

		updateSprites: function () {
			updateSprites(this);
		},

		update: function () {
			let time = +new Date();

			if (this.moveTo) {
				let deltaX = this.moveTo.x - this.pos.x;
				let deltaY = this.moveTo.y - this.pos.y;

				if (deltaX !== 0 || deltaY !== 0) {
					let distance = Math.max(Math.abs(deltaX), Math.abs(deltaY));

					let moveSpeedMax = this.moveSpeedMax;
					if (this.moveSpeed < moveSpeedMax)
						this.moveSpeed += this.moveSpeedInc;

					let moveSpeed = this.moveSpeed;

					if (moveSpeedMax < 1.6)
						moveSpeed *= 1 + (distance / 200);

					let elapsed = time - this.lastTick;
					moveSpeed *= (elapsed / 15);

					if (moveSpeed > distance)
						moveSpeed = distance;

					deltaX = (deltaX / distance) * moveSpeed;
					deltaY = (deltaY / distance) * moveSpeed;

					this.pos.x = this.pos.x + deltaX;
					this.pos.y = this.pos.y + deltaY;
				} else {
					this.moveSpeed = 0;
					this.moveTo = null;
				}

				const staticCamera = this.staticCamera || window.staticCamera;

				let stage = this.stage;
				if (staticCamera !== true) {
					stage.x = -~~this.pos.x;
					stage.y = -~~this.pos.y;
				}

				let halfScale = scale / 2;
				if (Math.abs(stage.x - this.lastUpdatePos.x) > halfScale || Math.abs(stage.y - this.lastUpdatePos.y) > halfScale)
					this.updateSprites();

				events.emit('onSceneMove');
			}

			this.lastTick = time;
		},

		buildContainer: function (obj) {
			let container = new PIXI.Container();
			this.layers[obj.layerName || obj.sheetName].addChild(container);

			return container;
		},

		buildRectangle: function (obj) {
			let graphics = new PIXI.Graphics();

			let alpha = obj.alpha;
			if (obj.has('alpha'))
				graphics.alpha = alpha;

			let fillAlpha = obj.fillAlpha;
			if (obj.has('fillAlpha'))
				fillAlpha = 1;

			graphics.beginFill(obj.color || '0x48edff', fillAlpha);

			if (obj.strokeColor)
				graphics.lineStyle(scaleMult, obj.strokeColor);

			graphics.drawRect(0, 0, obj.w, obj.h);

			graphics.endFill();

			(obj.parent || this.layers[obj.layerName || obj.sheetName]).addChild(graphics);

			graphics.position.x = obj.x;
			graphics.position.y = obj.y;

			return graphics;
		},

		moveRectangle: function (obj) {
			obj.sprite.position.x = obj.x;
			obj.sprite.position.y = obj.y;
			obj.sprite.width = obj.w;
			obj.sprite.height = obj.h;
		},

		buildObject: function (obj) {
			const { sheetName, parent: container, layerName, visible = true } = obj;

			const sprite = new PIXI.Sprite();

			obj.sprite = sprite;

			this.setSprite(obj);

			sprite.visible = visible;

			const spriteContainer = container || this.layers[layerName || sheetName] || this.layers.objects;
			spriteContainer.addChild(sprite);

			obj.w = sprite.width;
			obj.h = sprite.height;

			return sprite;
		},

		addFilter: function (sprite, config) {
			const filter = new shaderOutline(config);

			if (!sprite.filters)
				sprite.filters = [filter];
			else
				sprite.filters.push(filter);

			return filter;
		},

		removeFilter: function (sprite) {
			if (sprite.filters)
				sprite.filters = null;
		},

		buildText: function (obj) {
			const { text, visible, x, y, parent: spriteParent, layerName } = obj;
			const { fontSize = 14, color = 0xF2F5F5 } = obj;

			const textSprite = new PIXI.Text(text, {
				fontFamily: 'bitty',
				fontSize: fontSize,
				fill: color,
				stroke: 0x2d2136,
				strokeThickness: 4
			});

			if (visible === false)
				textSprite.visible = false;

			textSprite.x = x - (textSprite.width / 2);
			textSprite.y = y;

			const parentSprite = spriteParent ?? this.layers[layerName];
			parentSprite.addChild(textSprite);

			return textSprite;
		},

		buildEmitter: function (config) {
			const { layerName = 'particles' } = config;
			const particleEngine = particleEngines[layerName];

			return particleEngine.buildEmitter(config);
		},

		destroyEmitter: function (emitter) {
			const particleEngine = emitter.particleEngine;

			particleEngine.destroyEmitter(emitter);
		},

		setSprite: function (obj) {
			const { sprite, sheetName, cell } = obj;

			const bigSheets = globals.clientConfig.bigTextures;
			const isBigSheet = bigSheets.includes(sheetName);

			const newSize = isBigSheet ? 24 : 8;

			obj.w = newSize * scaleMult;
			obj.h = obj.w;

			sprite.width = obj.w;
			sprite.height = obj.h;
			sprite.texture = this.getTexture(sheetName, cell, newSize);

			if (newSize !== sprite.size) {
				sprite.size = newSize;
				this.setSpritePosition(obj);
			}
		},

		setSpritePosition: function (obj) {
			const { sprite, x, y, flipX, offsetX = 0, offsetY = 0 } = obj;

			sprite.x = (x * scale) + (flipX ? scale : 0) + offsetX;
			const oldY = sprite.y;
			sprite.y = (y * scale) + offsetY;

			if (sprite.width > scale) {
				if (flipX)
					sprite.x += scale;
				else
					sprite.x -= scale;

				sprite.y -= (scale * 2);
			}

			if (oldY !== sprite.y)
				this.reorder();

			sprite.scale.x = flipX ? -scaleMult : scaleMult;
		},

		reorder: function () {
			this.layers.mobs.children.sort((a, b) => b.y - a.y);
		},

		destroyObject: function (obj) {
			if (obj.sprite.parent)
				obj.sprite.parent.removeChild(obj.sprite);
		},

		//Changes the moveSpeedMax and moveSpeedInc variables
		// moveSpeed changes when mounting and unmounting
		// moveSpeed: 0		|	moveSpeedMax: 1.5		|		moveSpeedInc: 0.5
		// moveSpeed: 200	|	moveSpeedMax: 5.5		|		moveSpeedInc: 0.2
		//  Between these values we should follow an exponential curve for moveSpeedInc since
		//   a higher chance will proc more often, meaning the buildup in distance becomes greater
		adaptCameraMoveSpeed: function (moveSpeed) {
			const factor = Math.sqrt(moveSpeed);
			const maxValue = Math.sqrt(200);

			this.moveSpeedMax = 1.5 + ((moveSpeed / 200) * 3.5);
			this.moveSpeedInc = 0.2 + (((maxValue - factor) / maxValue) * 0.3);
		},

		updateMapAtPosition: function (x, y, mapCellString) {
			const { map, sprites, layers: { tileSprites: container } } = this;

			const row = sprites[x];
			if (!row)
				return;

			const cell = row[y];
			if (!cell)
				return;

			cell.forEach(c => {
				c.visible = false;
				spritePool.store(c);
			});

			cell.length = 0;

			map[x][y] = mapCellString.split(',');

			map[x][y].forEach(m => {
				m--;
				
				let tile = spritePool.getSprite(m);
				if (!tile) {
					tile = this.buildTile(m, x, y);
					container.addChild(tile);
					tile.type = m;
					tile.sheetNum = tileOpacity.getSheetNum(m);
				} else {
					tile.position.x = x * scale;
					tile.position.y = y * scale;
					tile.visible = true;
				}

				cell.push(tile);
				cell.visible = true;
			});
		},

		updateMapRows: function (rows) {
			const { map, sprites, layers: { tileSprites: container } } = this;

			rows.forEach(({ rowNumber: x, cols }) => {
				const row = sprites[x];

				cols.forEach(({ colNumber: y, cells }) => {
					const cellSprites = row[y];

					cellSprites.forEach(c => {
						c.visible = false;
						spritePool.store(c);
					});

					cellSprites.length = 0;

					map[x][y] = cells;

					cells.forEach((m, k) => {
						m--;

						let flipped = '';
						if (tileOpacity.canFlip(m)) {
							if (mRandom() < 0.5)
								flipped = 'flip';
						}

						let tile = spritePool.getSprite(flipped + m);
						if (!tile) {
							tile = this.buildTile(m, x, y);
							container.addChild(tile);
							tile.type = m;
							tile.sheetNum = tileOpacity.getSheetNum(m);
						} else {
							tile.position.x = x * scale;
							tile.position.y = y * scale;
							if (flipped !== '')
								tile.position.x += scale;
							tile.visible = true;
						}

						tile.z = k;

						cellSprites.push(tile);
						cellSprites.visible = true;
					});
				});
			});

			container.children.sort((a, b) => a.z - b.z);
		},

		render: function () {
			if (!this.stage)
				return;

			effects.render();

			particleLayers.forEach(p => particleEngines[p].update());

			this.renderer.render(this.stage);
		}
	};
});
