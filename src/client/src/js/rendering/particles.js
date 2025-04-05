 

import particleDefaults from './particleDefaults.js';

import { Texture } from 'pixi.js';
import * as particles from '@bigbadwaffle/particle-emitter';

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

	if (oldConfig.scale.start.min) {
		newConfig.behaviors.push({
			type: 'scale',
			config: {
				pickScale: {
					list: [
						{
							value: {
								min: oldConfig.scale.start.min,
								max: oldConfig.scale.start.max
							},
							time: 0
						},
						{
							value: {
								min: oldConfig.scale.end.min,
								max: oldConfig.scale.end.max
							},
							time: 1
						}
					]
				}
			}
		});
	} else {
		newConfig.behaviors.push({
			type: 'scale',
			config: {
				scale: {
					list: [
						{
							value: oldConfig.scale.start,
							time: 0
						},
						{
							value: oldConfig.scale.end,
							time: 1
						}
					]
				}
			}
		});
	}

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

	if (oldConfig.color) {
		if (Array.isArray(oldConfig.color.start)) {
			newConfig.behaviors.push({
				type: 'color',
				config: {
					color: {
						pickList: [
							{
								value: oldConfig.color.start,
								time: 0
							},
							{
								value: oldConfig.color.end,
								time: 1
							}
						]
					}
				}
			})
		} else if (!oldConfig.color.end) {
			newConfig.behaviors.push({
				type: 'colorStatic',
				config: {
					color: oldConfig.color.start
				}
			});
		} else {
			newConfig.behaviors.push({
				type: 'color',
				config: {
					color: {
						list: [
							{
								value: oldConfig.color.start,
								time: 0
							},
							{
								value: oldConfig.color.end ?? oldConfig.color.start,
								time: 1
							}
						]
					}
				}
			});
		}
	}

	if (oldConfig.speed.start.min !== undefined) {
		newConfig.behaviors.push({
			type: 'moveSpeed',
			config: {
				pickSpeed: {
					list: [
						{
							value: {
								min: oldConfig.speed.start.min,
								max: oldConfig.speed.start.max
							},
							time: 0
						},
						{
							value: {
								min: oldConfig.speed.end.min,
								max: oldConfig.speed.end.max
							},
							time: 1
						}
					]
				}
			}
		});
	} else {
		newConfig.behaviors.push({
			type: 'moveSpeed',
			config: {
				speed: {
					list: [
						{
							value: oldConfig.speed.start,
							time: 0
						},
						{
							value: oldConfig.speed.end,
							time: 1
						}
					]
				}
			}
		});
	}

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
					emitter: e,
					behaviors: e._origConfig.behaviors.map(b => ({
						type: b.type,
						config: b.config
					}))
				});

				this.isActive = false;
			}
		}

		this.lastTick = now;
	}
};
