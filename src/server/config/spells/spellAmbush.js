const particlePatch = {
	type: 'particlePatch',

	ttl: 0,

	update: function () {
		this.ttl--;
		if (this.ttl <= 0)
			this.obj.destroyed = true;
	}
};

module.exports = {
	type: 'ambush',

	cdMax: 40,
	manaCost: 10,
	range: 9,

	damage: 1,
	speed: 70,
	isAttack: true,

	stunDuration: 20,
	needLos: true,

	tickParticles: {
		ttl: 5,
		blueprint: { color: {
			start: ['a24eff', '7a3ad3'],
			end: ['533399', '393268']
		},
		scale: {
			start: {
				min: 2,
				max: 12
			},
			end: {
				min: 0,
				max: 6
			}
		},
		lifetime: {
			min: 1,
			max: 2
		},
		alpha: {
			start: 0.8,
			end: 0
		},
		spawnType: 'rect',
		spawnRect: {
			x: -12,
			y: -12,
			w: 24,
			h: 24
		},
		randomScale: true,
		randomColor: true,
		frequency: 0.25 }
	},

	cast: function (action) {
		let obj = this.obj;
		let target = action.target;

		const targetPos = target.getFurthestNonBlockingPositionFrom(obj);

		const selfEffect = this.obj.effects.addEffect({
			type: 'stunned',
			silent: true,
			force: true
		});

		const targetEffect = target.effects.addEffect({
			type: 'stunned',
			ttl: this.stunDuration
		});

		if (targetEffect) {
			this.obj.instance.syncer.queue('onGetDamage', {
				id: target.id,
				event: true,
				text: 'stunned'
			}, -1);
		}

		if (this.animation) {
			this.obj.instance.syncer.queue('onGetObject', {
				id: this.obj.id,
				components: [{
					type: 'animation',
					template: this.animation
				}]
			}, -1);
		}

		obj.instance.physics.removeObject(obj, obj.x, obj.y, targetPos.x, targetPos.y);
		obj.instance.physics.addObject(obj, targetPos.x, targetPos.y, obj.x, obj.y);

		this.reachDestination(target, targetPos, selfEffect);

		return true;
	},

	onCastTick: function (particleFrequency) {
		const { obj, tickParticles } = this;
		const { x, y, instance: { objects } } = obj;

		const particleBlueprint = extend({}, tickParticles.blueprint, {
			frequency: particleFrequency
		});

		objects.buildObjects([{
			x,
			y,
			properties: {
				cpnParticlePatch: particlePatch,
				cpnParticles: {
					simplify: function () {
						return {
							type: 'particles',
							blueprint: particleBlueprint
						};
					},
					blueprint: this.particles
				}
			},
			extraProperties: {
				particlePatch: {
					ttl: tickParticles.ttl
				}
			} 
		}]);
	},

	reachDestination: function (target, targetPos, selfEffect) {
		const { obj, threatMult, noEvents } = this;

		if (obj.destroyed)
			return;

		obj.effects.removeEffect(selfEffect.id);

		obj.x = targetPos.x;
		obj.y = targetPos.y;

		let syncer = obj.syncer;
		syncer.o.x = targetPos.x;
		syncer.o.y = targetPos.y;

		this.onCastTick(0.01);

		obj.aggro.move();

		let damage = this.getDamage(target);
		target.stats.takeDamage({
			damage,
			threatMult,
			source: obj,
			target,
			spellName: 'ambush',
			noEvents
		});
	},

	isTileValid: function (physics, fromX, fromY, toX, toY) {
		if (physics.isTileBlocking(toX, toY))
			return false;
		return physics.hasLos(fromX, fromY, toX, toY);
	}
};
