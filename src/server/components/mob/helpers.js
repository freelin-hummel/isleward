const canPathHome = cpnMob => {
	const { originX, originY, obj: { x, y, instance: { physics } } } = cpnMob;

	const path = physics.getPath({ x, y }, { x: originX, y: originY });
	if (!path.length) 
		return (x === originX && y === originY);

	const { x: px, y: py } = path[path.length - 1];
	const canReachHome = (px === originX && py === originY);

	return canReachHome;
};

const teleportHome = (physics, obj, mob) => {
	const { syncer, aggro } = obj;

	physics.removeObject(obj, obj.x, obj.y);
	obj.x = mob.originX;
	obj.y = mob.originY;

	syncer.o.x = obj.x;
	syncer.o.y = obj.y;

	physics.addObject(obj, obj.x, obj.y);

	aggro.clearIgnoreList();
	aggro.move();
};

const getPathToPosition = (obj, mob, toX, toY) => {
	const dx = Math.abs(obj.x - toX);
	const dy = Math.abs(obj.y - toY);

	if (dx + dy === 0)
		return [];

	if (dx <= 1 && dy <= 1) {
		return [{
			action: 'move',
			data: {
				x: toX,
				y: toY
			}
		}];
	}

	const calculatedPath = mob.physics.getPath({
		x: obj.x,
		y: obj.y
	}, {
		x: toX,
		y: toY
	}, false);

	const path = calculatedPath.map(({ x, y }) => {
		return {
			action: 'move',
			data: {
				x,
				y
			}
		};
	});

	return path;
};

const replacePath = (obj, path) => {
	obj.moveQueue.length = 0;
	obj.moveQueue.push(...path);
};

const queueMovementToLocation = (obj, mob, toX, toY) => {
	const path = getPathToPosition(obj, mob, toX, toY);

	path.forEach(p => {
		obj.queue(p);
	});
};

module.exports = {
	canPathHome,
	teleportHome,
	replacePath,
	getPathToPosition,
	queueMovementToLocation
};
