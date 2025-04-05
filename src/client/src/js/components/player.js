import renderer from '../rendering/renderer';
import events from '../system/events';
import physics from '../misc/physics';
import sound from '../sound/sound';

export default {
	type: 'player',

	oldPos: {
		x: 0,
		y: 0
	},

	init () {
		const obj = this.obj;

		obj.addComponent('keyboardMover');
		obj.addComponent('mouseMover');

		if (isMobile)
			obj.addComponent('touchMover');

		obj.addComponent('serverActions');
		obj.addComponent('pather');

		this.hookEvent('teleportToPosition', this.teleportToPosition.bind(this));

		events.emit('onGetPortrait', obj.portrait);
	},

	extend (blueprint) {
		const { collisionChanges, mapChanges } = blueprint;
		delete blueprint.collisionChanges;
		delete blueprint.mapChanges;

		if (collisionChanges)
			collisionChanges.forEach(c => physics.setCollision(c));

		if (mapChanges) {
			mapChanges.forEach(({ x, y, mapCellString }) => {
				renderer.updateMapAtPosition(x, y, mapCellString);
			});
		}
	},

	update () {
		const obj = this.obj;
		const x = obj.x;
		const y = obj.y;

		let oldPos = this.oldPos;

		if ((oldPos.x === x) && (oldPos.y === y))
			return;

		oldPos.x = x;
		oldPos.y = y;

		sound.update(x, y);

		this.positionCamera(x, y);
	},

	positionCamera (x, y, instant) {
		renderer.setPosition({
			centerOnObject: this.obj,
			instant
		});
	},

	teleportToPosition ({ x, y }) {
		renderer.setPosition({
			centerOnObject: {
				x,
				y
			},
			instant: true
		});

		sound.update(x, y);
	},

	destroy () {
		this.unhookEvents();
	}
};
