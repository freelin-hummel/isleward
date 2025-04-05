import client from '../system/client';
import physics from '../misc/physics';
import events from '../system/events';

export default {
	type: 'touchMover',

	lastNode: null,
	nodes: [],

	hoverTile: null,

	minSqrDistance: 1650,

	init () {
		['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'].forEach(e => {
			this.hookEvent(e, this[e].bind(this));
		});

		this.obj.on('onShake', this.onShake.bind(this));
	},

	onTouchStart (e) {
		this.lastNode = e;

		let tileX = ~~(e.worldX / scale);
		let tileY = ~~(e.worldY / scale);

		this.hoverTile = {
			x: tileX,
			y: tileY
		};

		events.emit('onChangeHoverTile', tileX, tileY);
	},

	onTouchMove (e) {
		const lastNode = this.lastNode;

		let sqrDistance = Math.pow(lastNode.x - e.x, 2) + Math.pow(lastNode.y - e.y, 2);
		if (sqrDistance < this.minSqrDistance)
			return;

		let dx = e.x - lastNode.x;
		let dy = e.y - lastNode.y;

		if (e.touches > 1) {
			dx = ~~(dx / Math.abs(dx));
			dy = ~~(dy / Math.abs(dy));
		} else if (Math.abs(dx) > Math.abs(dy)) {
			dx = ~~(dx / Math.abs(dx));
			dy = 0;
		} else {
			dx = 0;
			dy = ~~(dy / Math.abs(dy));
		}

		this.lastNode = e;

		let newX = this.obj.pather.pathPos.x + dx;
		let newY = this.obj.pather.pathPos.y + dy;

		if (physics.isTileBlocking(~~newX, ~~newY)) {
			this.bump(dx, dy);

			return;
		}

		this.obj.pather.add(newX, newY);
	},

	onTouchEnd () {
		this.lastNode = null;
	},

	onTouchCancel () {
		this.lastNode = null;
	},

	onShake () {
		if (!this.obj.pather.path.length)
			return;

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'player',
				method: 'clearQueue',
				data: {}
			}
		});

		window.navigator.vibrate(150);
	},

	bump (dx, dy) {
		if (this.obj.pather.path.length > 0)
			return;

		this.obj.addComponent('bumpAnimation', {
			deltaX: dx,
			deltaY: dy
		});
	},

	destroy () {
		this.unhookEvents();
	}
};
