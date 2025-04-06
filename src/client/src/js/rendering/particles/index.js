import particleDefaults from './particleDefaults';
import migrateParticleConfig from './migrateParticleConfig';

import { Texture } from 'pixi.js';
import * as particles from '@bigbadwaffle/particle-emitter';

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
		options = migrateParticleConfig(options);

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

				console.error({
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
