const { queueMovementToLocation } = require('./helpers');

const performPatrolAction = ({ obj }, node) => {
	const { action } = node;

	const { chatter, syncer, instance: { scheduler } } = obj;

	if (action === 'chat') {
		if (!chatter)
			obj.addComponent('chatter');

		syncer.set(false, 'chatter', 'msg', node.msg);

		return true;
	} else if (action === 'wait') {
		if (node.cron) {
			const isActive = scheduler.isActive(node);

			return isActive;
		} else if (node.ttl === undefined) {
			node.ttl = node.duration;

			return false;
		}

		node.ttl--;

		if (!node.ttl) {
			delete node.ttl;
			return true;
		}
	}

	return false;
};

const updatePatrol = mob => {
	const { patrol, obj: { x, y } } = mob;

	let toX, toY;

	do {
		const toNode = patrol[mob.patrolTargetNode];
		if (toNode.action) {
			const nodeDone = performPatrolAction(mob, toNode);
			if (!nodeDone)
				return;

			mob.patrolTargetNode++;
			if (mob.patrolTargetNode >= patrol.length)
				mob.patrolTargetNode = 0;

			continue;
		}

		toX = toNode[0];
		toY = toNode[1];

		if (toX - x === 0 && toY - y === 0) {
			mob.patrolTargetNode++;
			if (mob.patrolTargetNode >= patrol.length)
				mob.patrolTargetNode = 0;
		} else
			break;
	} while (toX - x !== 0 || toY - y !== 0);

	queueMovementToLocation(mob.obj, mob, toX, toY);
};

module.exports = {
	updatePatrol
};
