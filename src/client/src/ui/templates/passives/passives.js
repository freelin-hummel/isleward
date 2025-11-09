let zoom = 1;

import globals from '../../../js/system/globals';
import events from '../../../js/system/events';
import client from '../../../js/system/client';
import tpl from './template.html?raw';
import './styles.css';
import constants from './constants';
import temp from './temp';
import input from './input';

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
			let color = (node.color >= 0) ? (node.color + 1) : -1;
			if ((!node.stats || Object.keys(node.stats).length === 0) && !node.spiritStart)
				color = 0;

			if (node.spiritStart) {
				color = 8;
				node.size = 1;
			}

			this.ctx.fillStyle = ([
				'#69696e',
				'#c0c3cf',
				'#3fa7dd',
				'#4ac441',
				'#d43346',
				'#a24eff',
				'#faac45',
				'#44cb95',
				'#fafcfc'
			])[color];
			let size = ([
				constants.blockSize,
				constants.blockSize * 2,
				constants.blockSize * 3
			])[node.size];
			let x = (node.pos.x * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.x;
			let y = (node.pos.y * constants.gridSize) - ((size - constants.blockSize) / 2) - this.pos.y;

			let linked = this.data.links.some(l => {
				if (l.from.id !== node.id && l.to.id !== node.id)
					return false;

				return this.data.nodes.some(n => {
					return (
						(n.id === l.from.id && n.selected) ||
							(n.id === l.to.id && n.selected)
					);
				});
			});

			if (!linked)
				this.ctx.globalAlpha = 0.25;

			this.ctx.fillRect(x, y, size, size);

			if (linked) {
				this.ctx.strokeStyle = ([
					'#69696e',
					'#69696e',
					'#42548d',
					'#386646',
					'#763b3b',
					'#533399',
					'#d07840',
					'#3f8d6d',
					'#fafcfc'
				])[color];
				this.ctx.strokeRect(x, y, size, size);

				if (node.selected) {
					this.ctx.strokeStyle = '#fafcfc';
					this.ctx.strokeRect(x, y, size, size);
				}
			}

			if (!linked)
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

			if ((!linked) && (!fromNode.selected) && (!toNode.selected))
				this.ctx.globalAlpha = 0.25;

			ctx.strokeStyle = linked ? '#fafcfc' : '#69696e';
			ctx.beginPath();
			ctx.moveTo(fromX, fromY);
			ctx.lineTo(toX, toY);
			ctx.closePath();
			ctx.stroke();

			if (!linked && !fromNode.selected && !toNode.selected)
				this.ctx.globalAlpha = 1;
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

			let cell = {
				x: ~~((this.pos.x + this.mouse.x) / constants.gridSize),
				y: ~~((this.pos.y + this.mouse.y) / constants.gridSize)
			};

			let node = this.hoverNode = this.data.nodes.find(function (n) {
				return (
					(n.pos.x === cell.x) &&
						(n.pos.y === cell.y)
				);
			});

			if (node) {
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

				let text = Object.keys(node.stats)
					.map(function (s) {
						let statName = statTranslations[s];
						let statValue = node.stats[s];
						if (s.indexOf('CritChance') > -1)
							statValue /= 20;
						let negative = ((statValue + '')[0] === '-');
						if (percentageStats.includes(s))
							statValue += '%';

						return ((negative ? '' : '+') + statValue + ' ' + statName);
					})
					.join('<br />');

				if (node.spiritStart === window.player.class)
					text = 'Your starting node';
				else if (node.spiritStart)
					text = 'Starting node for ' + node.spiritStart + ' spirits';

				let tooltipPos = {
					x: (input.mouse.raw.clientX + 15) / zoom,
					y: (input.mouse.raw.clientY) / zoom
				};

				events.emit('onShowTooltip', text, this.el[0], tooltipPos);
				this.tooltipId = node.id;
			} else {
				events.emit('onHideTooltip', this.el[0]);
				this.tooltipId = null;
			}
		},

		onPanStart (e) {
			if (isMobile) {
				let cell = {
					x: ~~((this.pos.x + e.x) / constants.gridSize),
					y: ~~((this.pos.y + e.y) / constants.gridSize)
				};

				let node = this.data.nodes.find(function (n) {
					return (
						(n.pos.x === cell.x) &&
							(n.pos.y === cell.y)
					);
				});

				if (this.hoverNode && node && node.id !== this.hoverNode.id) {
					this.events.onMouseMove.call(this, e);

					return;
				}

				if (!node)
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
			this.find('.points')
				.html('Points Available: ' + points);
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
