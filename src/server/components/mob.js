const { updatePatrol } = require('./mob/patrol');
const { canPathHome, teleportHome, queueMovementToLocation, getPathToPosition, replacePath } = require('./mob/helpers');

const abs = Math.abs.bind(Math);
const rnd = Math.random.bind(Math);
const max = Math.max.bind(Math);

module.exports = {
	type: 'mob',

	target: null,

	physics: null,

	originX: 0,
	originY: 0,

	walkDistance: 1,
	maxChaseDistance: 25,
	goHome: false,

	patrol: null,
	patrolTargetNode: 0,

	needLos: null,

	init: function (blueprint) {
		this.physics = this.obj.instance.physics;

		this.originX = this.obj.x;
		this.originY = this.obj.y;

		if (blueprint.patrol)
			this.patrol = blueprint.patrol;

		if (blueprint.maxChaseDistance)
			this.maxChaseDistance = blueprint.maxChaseDistance;
	},

	update: function () {
		const { obj, walkDistance } = this;

		const distanceFromHome = Math.max(abs(this.originX - obj.x), abs(this.originY - obj.y));

		let target;
		if (obj.aggro)
			target = obj.aggro.getHighest();

		//If we're on our way home, check if we're there. If we are, reset the flag
		if (this.goHome) {
			if (!distanceFromHome) {
				this.goHome = false;

				if (obj.spellbook)
					obj.spellbook.resetRotation();
			} else {
				//If goHome was set by an external source, it wouldn't have queued movement for us
				if (obj.moveQueue.length === 0)
					queueMovementToLocation(obj, this, this.originX, this.originY);

				return false;
			}
		}

		//If we're too far from home, set the goHome flag
		if (
			distanceFromHome > this.maxChaseDistance ||
			(
				distanceFromHome > this.walkDistance &&
				!target &&
				!this.patrol
			)
		) {
			this.goHome = true;
			queueMovementToLocation(obj, this, this.originX, this.originY);

			return false;
		}

		if (obj.aggro) {
			//If our target is too far away from our home, ignore it and try to find a new one
			if (target && !obj.follower && !this.canChase(target)) {
				obj.clearQueue();
				obj.aggro.unAggro(target);
				target = obj.aggro.getHighest();
			}

			//If we still have a target, try to attack it
			if (target) {
				//If this.target isn't set, it means we're engaging in combat for the first time. In those cases, we
				// need to initialize the origin location for patrols (the spot where they stopped patrolling).
				if (!this.target && this.patrol) {
					this.originX = obj.x;
					this.originY = obj.y;
				}

				//Finally, try to attack the target
				const didAttack = this.fight(target);

				return didAttack;
			} else if (this.target) {
			//We had a target but no longer. The fight is probably over for some reason (player disconnected / was killed)
				this.target = null;
				obj.clearQueue();
				obj.spellbook.resetRotation();

				if (canPathHome(this)) {
					this.goHome = true;
					queueMovementToLocation(obj, this, this.originX, this.originY);
				} else
					teleportHome(this.physics, obj, this);

				return false;
			}
		}

		//We're not fighting or going home, don't try to wander/patrol if we already have movement queued
		if (obj.moveQueue.length > 0)
			return false;

		//Patrol mobs, when not going home or fighting can just go about their business
		if (this.patrol) {
			updatePatrol(this);

			return false;
		}

		//If we reach this point, we're not going home or fighting, so we can try to wander around
		if (walkDistance > 0 && rnd() > 0.2)
			return false;

		const toX = this.originX + ~~(rnd() * ((walkDistance * 2) + 1)) - walkDistance;
		const toY = this.originY + ~~(rnd() * ((walkDistance * 2) + 1)) - walkDistance;

		//We use goHome to force followers to follow us around but they should never stay in that state
		// since it messes with combat
		if (obj.follower)
			this.goHome = false;

		queueMovementToLocation(obj, this, toX, toY);
	},

	fight: function (target) {
		const { obj } = this;
		const { x, y } = obj;

		if (obj.spellbook.isCasting())
			return true;

		//Swaping to a new target
		if (this.target !== target) {
			obj.clearQueue();
			this.target = target;
		}

		const tx = ~~target.x;
		const ty = ~~target.y;

		const distance = max(abs(x - tx), abs(y - ty));

		//The minimum distance from which we can cast right now
		const furthestAttackRange = obj.spellbook.getFurthestRange(target, true);

		//The minimum distance from which we can cast any spell in the future
		const furthestStayRange = obj.spellbook.closestRange;

		let castSuccess = false;
		const collidesWithMobOrPlayer = this.physics.mobsCollide(x, y, obj, target);

		const tryToCast = (
			distance <= furthestAttackRange &&
			(
				this.needLos === false ||
				this.physics.hasLos(x, y, tx, ty)
			)
		);

		if (tryToCast) {
			const spell = obj.spellbook.getSpellToCast(target);
			//If it's an auto-attack, only cast it if the target has changed
			if (spell && (!spell.autoActive || spell.autoActive.target !== target)) {
				castSuccess = obj.spellbook.cast({
					spell: spell.id,
					target
				});
			}

			if (castSuccess && !collidesWithMobOrPlayer)
				return true;
		}

		if (castSuccess)
			return true;

		const shouldMove = (
			collidesWithMobOrPlayer ||
			distance > furthestStayRange ||
			!this.physics.hasLos(x, y, tx, ty)
		);

		if (!shouldMove)
			return false;

		const moveToPos = this.physics.getClosestPos(x, y, tx, ty, target, obj);
		let newDistance;
		if (moveToPos)
			newDistance = max(abs(moveToPos.x - tx), abs(moveToPos.y - ty));

		//The closest open position needs to be close enough for us to actually attack in the future
		const canGetCloseEnough = (
			moveToPos &&
			(
				(
					collidesWithMobOrPlayer &&
					newDistance <= furthestStayRange
				) ||
				(
					!collidesWithMobOrPlayer &&
					newDistance <= distance &&
					newDistance <= furthestStayRange
				)
			)
		);

		let path;
		if (canGetCloseEnough)
			path = getPathToPosition(obj, this, moveToPos.x, moveToPos.y);

		//Maybe the closest open position is close enough, but we can't path there
		if (!canGetCloseEnough || path.length === 0) {
			obj.clearQueue();
			obj.aggro.ignore(target);

			target = obj.aggro.getHighest();

			if (target)
				return this.fight(target);

			//Nobody left to attack so reset our aggro table
			obj.aggro.die();
			this.goHome = true;

			return false;
		}

		replacePath(obj, path);

		return false;
	},

	canChase: function (obj) {
		//Patrol mobs can always chase if they don't have a target yet (since they don't have a home yet)
		if (this.patrol && !this.target && !this.goHome)
			return true;

		let distanceFromHome = Math.max(abs(this.originX - obj.x), abs(this.originY - obj.y));
		return ((!this.goHome) && (distanceFromHome <= this.maxChaseDistance));
	},

	events: {
		beforeTakeDamage: function ({ damage }) {
			if (this.goHome)
				damage.failed = true;
		}
	}
};
