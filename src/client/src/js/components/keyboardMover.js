import input from '../input';
import client from '../system/client';
import physics from '../misc/physics';
import events from '../system/events';

export default {
	type: 'keyboardMover',

	moveCd: 0,
	moveCdMax: 8,

	init () {
		this.hookEvent('onCanvasKeyDown', this.onCanvasKeyDown.bind(this));
		this.hookEvent('onMoveSpeedChange', this.onMoveSpeedChange.bind(this));
	},

	update () {
		if (this.obj.dead)
			return;

		if (this.moveCd > 0) {
			this.moveCd--;

			return;
		}

		this.keyMove();
	},

	//Changes the moveCdMax variable
	// moveSpeed is affected when mounting and unmounting
	// moveSpeed: 0		|	moveCdMax: 8
	// moveSpeed: 200	|	moveCdMax: 4
	onMoveSpeedChange (moveSpeed) {
		this.moveCdMax = Math.ceil(4 + (((200 - moveSpeed) / 200) * 4));
	},

	onCanvasKeyDown (keyEvent) {
		if (keyEvent.key === 'esc') {
			client.request({
				cpn: 'player',
				method: 'performAction',
				data: {
					cpn: 'player',
					method: 'clearQueue',
					data: {}
				}
			});
		}
	},

	bump (dx, dy) {
		if (this.obj.pather.path.length > 0)
			return;

		if (this.obj.bumpAnimation)
			return;

		events.emit('onObjCollideBump', this.obj);

		this.obj.addComponent('bumpAnimation', {
			deltaX: dx,
			deltaY: dy
		});
	},

	keyMove () {
		let delta = {
			x: input.getAxis('horizontal'),
			y: input.getAxis('vertical')
		};

		if ((!delta.x) && (!delta.y))
			return;

		let newX = this.obj.pather.pathPos.x + delta.x;
		let newY = this.obj.pather.pathPos.y + delta.y;

		if (physics.isTileBlocking(~~newX, ~~newY)) {
			this.bump(delta.x, delta.y);

			return;
		}

		this.moveCd = this.moveCdMax;

		this.obj.pather.add(newX, newY);
	},

	destroy () {
		this.unhookEvents();
	}
};
