/* eslint-disable max-lines-per-function */
 
let zoom = 1;

import globals from '../../../js/system/globals';
import events from '../../../js/system/events';
import client from '../../../js/system/client';
import resources from '../../../js/resources';
import tpl from './template.html?raw';
import './styles.css';
import constants from './constants';
import temp from './temp';
import input from './input';

const nodeTypes = [
	{ type: 'addAttackCritChance', index: 8 },
	{ type: 'addAttackCritMultiplier', index: 9 },
	{ type: 'addSpellCritChance', index: 10 },
	{ type: 'addSpellCritMultiplier', index: 11 },
	{ type: 'armor', index: 12 },
	{ type: 'attackSpeed', index: 13 },
	{ type: 'blockAttackChance', index: 14 },
	{ type: 'blockSpellChance', index: 15 },
	{ type: 'castSpeed', index: 16 },
	{ type: 'dex', index: 17 },
	{ type: 'dodgeAttackChance', index: 18 },
	{ type: 'elementAllResist', index: 19 },
	{ type: 'elementArcanePercent', index: 20 },
	{ type: 'elementFirePercent', index: 21 },
	{ type: 'elementFrostPercent', index: 22 },
	{ type: 'elementHolyPercent', index: 23 },
	{ type: 'elementPoisonPercent', index: 24 },
	{ type: 'int', index: 25 },
	{ type: 'dex+int', index: 26 },
	{ type: 'manaMax', index: 27 },
	{ type: 'physicalPercent', index: 28 },
	{ type: 'regenHp', index: 29 },
	{ type: 'regenMana', index: 30 },
	{ type: 'sprintChance', index: 31 },
	{ type: 'spellPercent', index: 32 },
	{ type: 'str', index: 33 },
	{ type: 'dex+str', index: 34 },
	{ type: 'int+str', index: 35 },
	{ type: 'vit', index: 36 }
];

const spiritStarts = [
	{ spirit: 'lynx', index: 0 },
	{ spirit: 'bear', index: 1 },
	{ spirit: 'owl', index: 2 }
];

export default {
	tpl,

	modal: true,
	hasClose: true,

	canvas: null,
	size: {},
	ctx: null,

	hotkeyToOpen: 'p',

	mouse: {
		x: 0,
		y: 0
	},

	currentZoom: 1,
	pos: {
		x: 0,
		y: 0
	},
	oldPos: null,

	panOrigin: null,

	data: {
		nodes: null,
		links: null
	},

	pointsAvailable: 0,

	hoverNode: null,

	handlerResize: null,

	postRender () {
		input.init(this.el, zoom);

		this.data.nodes = temp.nodes;
		this.data.links = temp.links.map(l => {
			return {
				from: { id: l.from },
				to: { id: l.to }
			};
		});

		//We need to be able to determine the size of elements
		this.el.css({
			visibility: 'hidden',
			display: 'block'
		});

		this.handlerResize = this.onResize.bind(this);
		window.addEventListener('resize', this.handlerResize);

		this.canvas = this.find('.canvas')[0];
		this.size.w = this.canvas.width = this.find('.bottom').width() * zoom;
		this.size.h = this.canvas.height = this.find('.bottom').height() * zoom;
		this.ctx = this.canvas.getContext('2d');

		//Reset styles after determining size
		this.el.css({
			visibility: 'visible',
			display: 'none'
		});

		this.ctx.lineWidth = constants.lineWidth;

		$(this.canvas)
			.on('contextmenu', function () {
				return false;
			});

		this.find('.btnReset').on('click', this.events.onReset.bind(this));

		this.onEvent('uiMouseUp', this.events.onPanEnd.bind(this));
		this.onEvent('onGetPassives', this.events.onGetPassives.bind(this));
		this.onEvent('onGetPassivePoints', this.events.onGetPassivePoints.bind(this));
		this.onEvent('onShowPassives', this.toggle.bind(this));

		if (isMobile) {
			this.onEvent('uiTouchEnd', this.events.onPanEnd.bind(this));
			this.onEvent('uiTouchStart', this.events.onPanStart.bind(this));
			this.onEvent('uiTouchMove', this.events.onPan.bind(this));
		} else {
			this.onEvent('uiMouseMove', this.events.onPan.bind(this));
			this.onEvent('uiMouseDown', this.events.onPanStart.bind(this));
		}
	},

	beforeDestroy () {
		window.removeEventListener('resize', this.handlerResize);
	},

	onResize () {
		if (isMobile || !this.shown)
			return;

		this.size.w = this.canvas.width = this.find('.bottom').width() * zoom;
		this.size.h = this.canvas.height = this.find('.bottom').height() * zoom;

		this.ctx.lineWidth = constants.lineWidth;

		this.renderNodes();
	},

	renderNodes () {
		if (!this.shown)
			return;

		this.renderers.clear.call(this);

		let links = this.data.links;
		let nodes = this.data.nodes;

		links.forEach(l => {
			let linked = (
				nodes.find(n => n.id === l.from.id).selected &&
					nodes.find(n => n.id === l.to.id).selected
			);
			this.renderers.line.call(this, l.from, l.to, linked);
		});

		nodes.forEach(n => this.renderers.node.call(this, n, n.pos.x, n.pos.y));
	},

	onAfterShow () {
		//Calculate midpoint
		let start = this.data.nodes.find(n => n.spiritStart === window.player.class);

		this.pos.x = start.pos.x * constants.gridSize;
		this.pos.y = start.pos.y * constants.gridSize;

		this.pos.x -= ~~(this.canvas.width / 2);
		this.pos.y -= ~~(this.canvas.height / 2);

		this.onResize();
		this.renderNodes();

		events.emit('onHideTooltip', this.el[0]);
		this.tooltipId = null;
	},

	beforeHide () {
		events.emit('onHideTooltip', this.el[0]);
		this.tooltipId = null;
	},

	renderers: {
		clear () {
			this.ctx.clearRect(0, 0, this.size.w, this.size.h);

			delete this.oldPos;
		},

		node (node) {
			const sheetObj = resources.sprites.passiveNodes;
			const sheet = sheetObj.element || sheetObj;

			if (!sheet || !sheet.complete)
				return;

			const size = 64;

			const x = (node.pos.x * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.x;
			const y = (node.pos.y * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.y;

			let spriteIndex = 0;

			if (node.spiritStart) {
				const spiritDef = spiritStarts.find(s => s.spirit === node.spiritStart);
				spriteIndex = spiritDef ? spiritDef.index : 0;
			} else if (node.nodeType) {
				const typeDef = nodeTypes.find(t => t.type === node.nodeType);
				spriteIndex = typeDef ? typeDef.index : 0;
			}

			const cols = 8;
			const sx = (spriteIndex % cols) * 64;
			const sy = Math.floor(spriteIndex / cols) * 64;

			const linked = this.data.links.some(l => {
				if (l.from.id !== node.id && l.to.id !== node.id)
					return false;

				return this.data.nodes.some(n => {
					return (
						(n.id === l.from.id && n.selected) ||
					(n.id === l.to.id && n.selected)
					);
				});
			});

			// Draw background rect
			if (node.selected && !node.spiritStart) {
				const padding = 4;
				const lineLength = 64;
				const lineWidth = 4;

				// Dark framed box
				this.ctx.fillStyle = '#373041';
				this.ctx.fillRect(
					x - padding,
					y - padding,
					size + padding * 2,
					size + padding * 2
				);

				this.ctx.fillStyle = '#fcfcfc';

				const drawCorner = (xHor, yHor, xVer, yVer) => {
					this.ctx.fillRect(
						xHor,
						yHor,
						lineLength,
						lineWidth
					);

					this.ctx.fillRect(
						xVer,
						yVer,
						lineWidth,
						lineWidth
					);
				};

				//Top Left
				/*drawCorner(
					x - padding,
					y - padding,
					x - padding,
					y - padding + lineWidth
				);*/

				//Top Right
				/*drawCorner(
					x + size + padding - lineLength,
					y - padding,
					x + size + padding - lineWidth,
					y - padding + lineWidth
				);*/

				//Bottom Left
				drawCorner(
					x - padding,
					y + size + padding - lineWidth,
					x - padding,
					y + size + padding - (lineWidth * 2) 
				);

				//Bottom Right
				drawCorner(
					x + size + padding - lineLength,
					y + size + padding - lineWidth,
					x + size + padding - lineWidth,
					y + size + padding - (lineWidth * 2) 
				);
			} else {
				this.ctx.fillStyle = '#373041';
				this.ctx.fillRect(x, y, size, size);
			}

			let alpha = 0.25;
			if (node.selected || linked) 
				alpha = 1;
			
			this.ctx.globalAlpha = alpha;

			this.ctx.drawImage(
				sheet,
				sx + 0.5, sy + 0.5, 64 - 0.5, 64 - 0.5,
				x, y, size, size
			);

			this.ctx.globalAlpha = 1;
		},

		line (fromNode, toNode, linked) {
			let ctx = this.ctx;
			let halfSize = constants.blockSize / 2;

			fromNode = this.data.nodes.find(n => n.id === fromNode.id);

			toNode = this.data.nodes.find(n => n.id === toNode.id);

			let fromX = (fromNode.pos.x * constants.gridSize) + halfSize - this.pos.x;
			let fromY = (fromNode.pos.y * constants.gridSize) + halfSize - this.pos.y;

			let toX = (toNode.pos.x * constants.gridSize) + halfSize - this.pos.x;
			let toY = (toNode.pos.y * constants.gridSize) + halfSize - this.pos.y;

			let lineColor = '#3c3f4c';
			if (fromNode.selected && toNode.selected)
				lineColor = '#fcfcfc';
			else if (fromNode.selected || toNode.selected)
				lineColor = '#69696e';

			ctx.strokeStyle = lineColor;
			ctx.beginPath();
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			ctx.closePath();
			ctx.stroke();
		}
	},

	events: {
		onMouseMove (pos) {
			const { clientConfig: { statTranslations } } = globals;

			if (this.mouse.x === pos.x && this.mouse.y === pos.y)
				return;

			this.mouse = {
				x: pos.x,
				y: pos.y
			};

			let hoverNode = null;
			const size = 64;
			this.data.nodes.forEach(n => {
				const x = (n.pos.x * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.x;
				const y = (n.pos.y * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.y;
				if (this.mouse.x >= x && this.mouse.x < x + size && this.mouse.y >= y && this.mouse.y < y + size) 
					hoverNode = n;
			});
			this.hoverNode = hoverNode;

			if (hoverNode) {
				let text;
				if (hoverNode.spiritStart) 
					text = hoverNode.spiritStart === window.player.class ? 'Your starting node' : 'Starting node for ' + hoverNode.spiritStart + ' spirits';
				else {
					let percentageStats = [
						'addAttackCritChance',
						'addAttackCritMultiplier',
						'addCritChance',
						'addCritMultiplier',
						'addSpellCritChance',
						'addSpellCritMultiplier',
						'addSpellDamage',
						'attackSpeed',
						'blockAttackChance',
						'blockSpellChance',
						'castSpeed',
						'catchChance',
						'catchSpeed',
						'dodgeAttackChance',
						'dodgeSpellChance',
						'elementArcanePercent',
						'elementFirePercent',
						'elementFrostPercent',
						'elementHolyPercent',
						'elementPoisonPercent',
						'fishItems',
						'fishRarity',
						'fishWeight',
						'itemQuantity',
						'magicFind',
						'physicalPercent',
						'sprintChance',
						'xpIncrease'
					];

					const statArray = Object.keys(hoverNode.stats);
					text = statArray
						.map((s, i) => {
							const statName = statTranslations[s];
							const statInfo = statTranslations.tooltips[s];

							let statValue = hoverNode.stats[s];
							const negative = ((statValue + '')[0] === '-');

							if (s.indexOf('CritChance') > -1)
								statValue /= 20;
							if (percentageStats.includes(s))
								statValue += '%';

							let res = `
								${negative ? '' : '+'}${statValue} ${statName}
								<br />
								<span style="color: var(--grayC)">
									${statInfo}
								</span>
							`;

							if (i < statArray.length)
								res += '<br />';

							return res;
						}).join('<br />');
				}

				let tooltipPos = {
					x: (input.mouse.raw.clientX + 15) / zoom,
					y: (input.mouse.raw.clientY) / zoom
				};

				events.emit('onShowTooltip', text, this.el[0], tooltipPos);
				this.tooltipId = hoverNode.id;
			} else {
				events.emit('onHideTooltip', this.el[0]);
				this.tooltipId = null;
			}
		},

		onPanStart (e) {
			if (isMobile) {
				let hoverNode = null;
				const size = 64;
				this.data.nodes.forEach(n => {
					const x = (n.pos.x * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.x;
					const y = (n.pos.y * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.y;
					if (e.x >= x && e.x < x + size && e.y >= y && e.y < y + size) 
						hoverNode = n;
				});

				if (this.hoverNode && hoverNode && hoverNode.id !== this.hoverNode.id) {
					this.events.onMouseMove.call(this, e);

					return;
				}

				if (!hoverNode)
					this.hoverNode = null;
			}

			if (this.hoverNode) {
				this.events.onTryClickNode.call(this, this.hoverNode);

				return;
			}

			this.events.onMouseMove.call(this, e);

			this.panOrigin = {
				x: e.raw.clientX * zoom,
				y: e.raw.clientY * zoom
			};
		},

		onPan (e) {
			if (!this.panOrigin) {
				this.events.onMouseMove.call(this, e);

				return;
			}

			if (!this.oldPos) {
				this.oldPos = {
					x: this.pos.x,
					y: this.pos.y
				};
			}

			let zoomPanMultiplier = this.currentZoom;
			let scrollSpeed = constants.scrollSpeed / zoomPanMultiplier;

			const rawX = e.raw.clientX * zoom;
			const rawY = e.raw.clientY * zoom;

			this.pos.x += (this.panOrigin.x - rawX) * scrollSpeed;
			this.pos.y += (this.panOrigin.y - rawY) * scrollSpeed;

			this.panOrigin = {
				x: rawX,
				y: rawY
			};

			this.renderNodes();
		},

		onPanEnd () {
			this.panOrigin = null;
		},

		onTryClickNode (node) {
			if ((node.spiritStart) || (node.selected))
				return;
			else if (isMobile && this.tooltipId !== node.id)
				return;

			const canReachNode = this.data.links.some(l => {
				return (
					(
						l.to.id === node.id ||
							l.from.id === node.id
					) &&
						this.data.nodes.some(n => {
							return (
								(n.id === l.from.id && n.selected) ||
								(n.id === l.to.id && n.selected)
							);
						})
				);
			});

			if (!canReachNode)
				return;

			events.emit('onTryTickPassiveNode', { tick: !node.selected });

			client.request({
				cpn: 'player',
				method: 'performAction',
				data: {
					cpn: 'passives',
					method: node.selected ? 'untickNode' : 'tickNode',
					data: { nodeId: node.id }
				}
			});
		},

		onGetPassives (selected) {
			this.data.nodes.forEach(n => {
				n.selected = selected.some(s => s === n.id);
			});

			this.renderNodes();
		},

		onGetPassivePoints (points) {
			this.pointsAvailable = points;

			this.find('.points-available')
				.html(`(Points available: ${points})`);
		},

		onReset () {
			client.request({
				cpn: 'player',
				method: 'performAction',
				data: {
					cpn: 'passives',
					method: 'untickNode',
					data: {}
				}
			});
		}
	}
};
