const spellCastResultTypes = require('../../components/spellbook/spellCastResultTypes');

const cpnSmokePatch = {
	type: 'smokePatch',

	contents: [],
	ttl: 0,

	applyDamage: function (target, damage) {
		target.stats.takeDamage({
			damage,
			threatMult: 1,
			source: this.caster,
			target: target,
			spellName: 'smokeBomb',
			noEvents: this.noEvents
		});
	},

	collisionEnter: function (o) {
		if (!o.aggro)
			return;

		if (!this.caster.aggro.canAttack(o))
			return;

		this.contents.push(o);
	},

	collisionExit: function (o) {
		let contents = this.contents;
		let cLen = contents.length;
		for (let i = 0; i < cLen; i++) {
			if (contents[i] === o) {
				contents.splice(i, 1);
				return;
			}
		}
	},

	update: function () {
		const { sharedHitCheckArray, isLast } = this;

		this.ttl--;
		if (this.ttl <= 0)
			this.obj.destroyed = true;

		let contents = this.contents;
		for (let i = 0; i < contents.length; i++) {
			let c = contents[i];

			if (sharedHitCheckArray.includes(c))
				continue;

			sharedHitCheckArray.push(c);

			if (c) {
				let damage = this.getDamage(c);
				this.applyDamage(c, damage);
			}
		}

		if (isLast)
			sharedHitCheckArray.length = 0;
	}
};

const particles = {
	scale: {
		start: {
			min: 16,
			max: 30
		},
		end: {
			min: 8,
			max: 14
		}
	},
	opacity: {
		start: 0.02,
		end: 0
	},
	lifetime: {
		min: 1,
		max: 3
	},
	speed: {
		start: 12,
		end: 2
	},
	color: {
		start: ['fcfcfc', '80f643'],
		end: ['c0c3cf', '2b4b3e']
	},
	chance: 0.03,
	randomColor: true,
	randomScale: true,
	blendMode: 'screen'
};

module.exports = {
	type: 'smokeBomb',

	cdMax: 20,
	manaCost: 0,

	damage: 1,
	duration: 10,
	isAttack: true,

	radius: 1,
	targetGround: true,
	targetPlayerPos: true,

	particles: particles,

	update: function () {
		const { obj: { x, y } } = this;

		let selfCast = this.selfCast;

		if (!selfCast)
			return;

		if ((selfCast !== true) && (Math.random() >= selfCast))
			return;

		if (this.getSpellCanCastResult({ x, y }) !== spellCastResultTypes.success)
			return;

		this.cd = this.cdMax;
		this.cast();
	},

	cast: function (action) {
		let obj = this.obj;

		let radius = this.radius;

		let repeat = this.repeat || 1;

		const particleEvent = {
			source: this,
			particleConfig: extend({}, this.particles)
		};
		obj.fireEvent('beforeSpawnParticles', particleEvent);

		for (let r = 0; r < repeat; r++) {
			let x = obj.x;
			let y = obj.y;

			if (this.randomPos) {
				let range = this.range;
				while ((x === obj.x) && (y === obj.y)) {
					x = obj.x + ~~(Math.random() * range * 2) - range;
					y = obj.y + ~~(Math.random() * range * 2) - range;
				}
			}

			let objects = this.obj.instance.objects;
			let patches = [];

			let physics = this.obj.instance.physics;

			//We need to make sure different particles don't hit the same mob in the same tick
			const sharedHitCheckArray = [];

			for (let i = x - radius; i <= x + radius; i++) {
				let dx = Math.abs(x - i);
				for (let j = y - radius; j <= y + radius; j++) {
					let distance = dx + Math.abs(j - y);

					if (distance > radius + 1)
						continue;

					if (!physics.hasLos(x, y, i, j))
						continue;

					const patch = objects.buildObjects([{
						x: i,
						y: j,
						properties: {
							cpnSmokePatch: cpnSmokePatch,
							cpnParticles: {
								simplify: function () {
									return {
										type: 'particles',
										blueprint: this.blueprint
									};
								},
								blueprint: particleEvent.particleConfig
							}
						},
						extraProperties: {
							smokePatch: {
								caster: obj,
								statType: this.statType,
								getDamage: this.getDamage.bind(this),
								ttl: this.duration,
								noEvents: this.noEvents
							}
						} 
					}]);

					patches.push(patch);
				}
			}

			patches.forEach((p, i) => {
				p.smokePatch.sharedHitCheckArray = sharedHitCheckArray;

				if (i === patches.length - 1)
					p.smokePatch.isLast = true;
			});

			if (!this.castEvent) {
				this.sendBump({
					x: x,
					y: y - 1
				});
			}
		}

		return true;
	}
};
