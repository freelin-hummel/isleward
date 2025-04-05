 

import particleDefaults from './particleDefaults.js';

import { Texture } from 'pixi.js';
import * as particles from '@barvynkoa/particle-emitter';

function transformParticleConfig (oldConfig) {
	const newConfig = {
		lifetime: {
			min: oldConfig.lifetime.min,
			max: oldConfig.lifetime.max
		},
		frequency: oldConfig.frequency,
		spawnChance: oldConfig.chance,
		particlesPerWave: oldConfig.particlesPerWave ?? 5,

		emitterLifetime: oldConfig.emitterLifetime,

		maxParticles: 1000,

		pos: {
			x: oldConfig.pos.x,
			y: oldConfig.pos.y
		},
		addAtBack: oldConfig.addAtBack ?? false,

		behaviors: []
	};

	newConfig.behaviors.push({
		type: 'blendMode',
		config: { blendMode: oldConfig.blendMode }
	});

	newConfig.behaviors.push({
		type: 'alpha',
		config: {
			alpha: {
				list: [
					{
						value: oldConfig.alpha ? oldConfig.alpha.start : oldConfig.opacity.start,
						time: 0
					},
					{
						value: oldConfig.alpha ? oldConfig.alpha.end : oldConfig.opacity.end,
						time: 1
					}
				]
			}
		}
	});

	newConfig.behaviors.push({
		type: 'scale',
		config: {
			scale: {
				list: [
					{
						value: oldConfig.scale.start.min !== undefined ? (oldConfig.scale.start.min + oldConfig.scale.start.max) / 2 : oldConfig.scale.start,
						time: 0
					},
					{
						value: oldConfig.scale.end.min !== undefined ? (oldConfig.scale.end.min + oldConfig.scale.end.max) / 2 : oldConfig.scale.end,
						time: 1
					}
				]
			}
		}
	});

	newConfig.behaviors.push({
		type: 'rotationStatic',
		config: {
			min: 0,
			max: 360
		}
	});

	newConfig.behaviors.push({
		type: 'noRotation',
		config: { rotation: 0 }
	}
	);

	// 3) COLOR
	// oldConfig.color could be { start: ["fc66f7", "a24eff"], end: ["933159", "393268"] } or single strings
	if (oldConfig.color) {
		// We'll just grab the FIRST color if it's an array
		const startColor = Array.isArray(oldConfig.color.start)
			? oldConfig.color.start[0]
			: oldConfig.color.start;
		const endColor = Array.isArray(oldConfig.color.end)
			? oldConfig.color.end[0]
			: oldConfig.color.end;

		if (startColor && endColor) {
			newConfig.behaviors.push({
				type: 'color',
				config: {
					color: {
						list: [
							{
								value: startColor,
								time: 0
							},
							{
								value: endColor,
								time: 1
							}
						]
					}
				}
			});
		}
	}

	newConfig.behaviors.push({
		type: 'moveSpeed',
		config: {
			speed: {
				list: [
					{
						value: (oldConfig.speed.start.min !== undefined ? (oldConfig.speed.start.min + oldConfig.speed.start.max) / 2 : oldConfig.speed.start),
						time: 0
					},
					{
						value: (oldConfig.speed.end.min !== undefined ? (oldConfig.speed.end.min + oldConfig.speed.end.max) / 2 : oldConfig.speed.end),
						time: 1
					}
				]
			},
			minMult: 0.1
		}
	});

	let spawnConfig = oldConfig.spawnCircle;
	if (oldConfig.spawnType === 'rect')
		spawnConfig = oldConfig.spawnRect;
	else if (oldConfig.spawnType === 'ring')
		spawnConfig = oldConfig.spawnRect;

	const spawnShape = {
		type: 'spawnShape',
		config: {
			type: oldConfig.spawnType,
			data: spawnConfig
		}
	};

	if (spawnShape.config.data.r !== undefined) {
		spawnShape.config.data.radius = spawnShape.config.data.r;
		delete spawnShape.config.data.r;
	}

	newConfig.behaviors.push(spawnShape);

	// If the old config had spawnType: "rect" or "circle" etc. (outside behaviors),
	// you could also push a 'spawnShape' behavior based on that.

	return newConfig;
}

export default {
	renderer: null,
	stage: null,

	emitters: [],

	lastTick: null,

	//Will become false when any emitter crashes
	isActive: true,

	init (options) {
		this.r = options.r;
		this.renderer = options.renderer;
		this.stage = options.stage;
		this.lastTick = Date.now();
	},

	buildEmitter (config) {
		if (!this.isActive)
			return {};

		let obj = config.obj;
		delete config.obj;

		let options = $.extend({}, particleDefaults, config);
		options = transformParticleConfig(options);

		options.behaviors.push({
			type: 'textureSingle',
			config: { texture: Texture.WHITE }
		});

		let emitter = new particles.Emitter(this.stage, options);
		emitter.obj = obj;
		emitter.emit = true;
		emitter.particleEngine = this;

		this.emitters.push(emitter);

		return emitter;
	},

	destroyEmitter (emitter) {
		emitter.emit = false;
	},

	update () {
		let renderer = this.r;

		let now = Date.now();

		let emitters = this.emitters;
		let eLen = emitters.length;
		for (let i = 0; i < eLen; i++) {
			let e = emitters[i];
			if (e.broken)
				continue;


			let visible = null;
			let destroy = (
				(!e.emit) &&
					(e.obj.destroyed)
			);

			if (destroy) {
				if (e.particleCount > 0) {
					visible = renderer.isVisible(e.spawnPos.x, e.spawnPos.y);
					if (visible)
						destroy = false;
				}
			}

			if (destroy) {
				emitters.splice(i, 1);
				e.destroy();
				e = null;

				i--;
				eLen--;
				continue;
			}

			if (visible === null)
				visible = renderer.isVisible(e.spawnPos.x, e.spawnPos.y);
			if (!visible)
				continue;

			try {
				e.update((now - this.lastTick) * 0.001);
			} catch (error) {
				e.broken = true;

				console.log({
					message: 'Particle emitter system crashed',
					error,
					emitter: e
				});

				this.isActive = false;
			}
		}

		this.lastTick = now;
	}
};
