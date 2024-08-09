const setupConnection = require('./setupConnection');
const doesCollide = require('./doesCollide');

const buildRoom = (scope, template, connectTo, templateExit, connectToExit, isHallway) => {
	const { rooms, leafConstraints, randInt, randFloat, connectionConstraints, hallwayChance } = scope;

	let room = {
		x: 0,
		y: 0,
		distance: 0,
		isHallway,
		template: extend({}, template),
		connections: []
	};

	if (connectTo) {
		room.x = connectTo.x + connectToExit.x - connectTo.template.x + (template.x - templateExit.x);
		room.y = connectTo.y + connectToExit.y - connectTo.template.y + (template.y - templateExit.y);
		room.distance = connectTo.distance + 1;
		room.parent = connectTo;
	}

	const isOk = (
		scope.allowRoomCollision ||
		!doesCollide(scope, room, connectTo)
	);
	if (!isOk)
		return false;

	if (connectTo)
		connectTo.connections.push(room);

	rooms.push(room);

	scope.updateBounds(room);

	if (room.distance < leafConstraints.maxDistance) {
		const maxExits = room.template.exits.length;
		const minExits = Math.min(maxExits, 2);

		const count = Math.min(randInt(minExits, maxExits + 1), connectionConstraints.maxConnectionsPerRoom);

		for (let i = 0; i < count; i++) {
			let buildHallwayNext = !isHallway;
			if (buildHallwayNext && hallwayChance < 1)
				buildHallwayNext = randFloat(0, 1) < hallwayChance;

			setupConnection(scope, room, buildHallwayNext, buildRoom);
		}
	}

	if ((isHallway) && (room.connections.length === 0)) {
		rooms.spliceWhere(r => r === room);
		room.parent.connections.spliceWhere(c => c === room);
		return false;
	}

	return room;
};

module.exports = buildRoom;
