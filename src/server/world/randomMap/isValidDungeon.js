module.exports = generator => {
	const { rooms, leafConstraints, endConstraints, templates } = generator;
	const leafRooms = rooms.filter(r => !r.connections.length);

	//Ensure that we have enough leaf rooms
	const { minCount: minLeafRooms, maxCount: maxLeafRooms } = leafConstraints;

	/*console.log({
		leafRooms: leafRooms.length,
		leafConstraints,
		leafRoomsTooFew: (leafRooms.length < minLeafRooms) ? 'xxxxxxxxxxxxxxxxxxxx' : '',
		leafRoomsTooMany: (leafRooms.length > maxLeafRooms) ? 'xxxxxxxxxxxxxxxxxxxx' : '',
		noEndRoom: !rooms.some(r => r.template.properties.end) ? 'xxxxxxxxxxxxxxxxxxxx' : '',
		leafRoomDistance: leafRooms.map(l => l.distance),
		leafRoomDistanceNotOk: leafRooms.some(({ distance: roomDistance }) => {
			return (roomDistance < leafConstraints.minDistance || roomDistance > leafConstraints.maxDistance);
		}) ? 'xxxxxxxxxxxxxxxxxxxx' : ''
	});

	if (rooms.some(r => r.template.properties.end)) {
		console.log({
			endRoomTooClose: (rooms.find(r => r.template.properties.end).distance < endConstraints.minDistance) ? 'xxxxxxxxxxxxxxxxxxxx' : '',
			endRoomTooFar: (rooms.find(r => r.template.properties.end).distance > endConstraints.maxDistance) ? 'xxxxxxxxxxxxxxxxxxxx' : ''
		});
	}*/

	const leafRoomCount = leafRooms.length;
	if (leafRoomCount < minLeafRooms || leafRoomCount > maxLeafRooms)
		return false;

	//Ensure that the end room exists
	const endRoom = rooms.find(r => r.template.properties.end);

	if (!endRoom)
		return false;

	//Ensure that the end room is the correct distance
	const { minDistance: minEndDistance, maxDistance: maxEndDistance } = endConstraints;

	const endDistance = endRoom.distance;
	if (endDistance < minEndDistance || endDistance > maxEndDistance)
		return false;

	//Ensure that leaf rooms are correct distances
	const { minDistance: minLeafDistance, maxDistance: maxLeafDistance } = leafConstraints;

	const leafRoomsDistanceOk = !leafRooms.some(({ distance: roomDistance }) => {
		return (roomDistance < minLeafDistance || roomDistance > maxLeafDistance);
	});

	if (!leafRoomsDistanceOk)
		return false;

	//Ensure that enough minOccur templates have been included
	const minOccurOk = templates.every(t => {
		if (t.properties.mapping)
			return true;

		const minOccur = ~~t.properties.minOccur || 0;
		const occurs = rooms.filter(r => r.template.typeId === t.typeId).length;

		return occurs >= minOccur;
	});

	if (!minOccurOk)
		return false;

	return true;
};
