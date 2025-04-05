import soundManager from '../sound/sound';

export default {
	type: 'sound',

	sound: null,
	volume: 0,

	soundEntry: null,

	init () {
		const {
			sound, volume, music, defaultMusic, loop = true,
			obj: { zoneId, x, y, width, height, area }
		} = this;

		const config = {
			scope: zoneId,
			file: sound,
			volume,
			x,
			y,
			w: width,
			h: height,
			area,
			music,
			defaultMusic,
			loop
		};

		this.soundEntry = soundManager.addSound(config);
	},

	extend (bpt) {
		Object.assign(this, bpt);

		Object.assign(this.soundEntry, bpt);
	},

	destroy () {
		if (this.soundEntry?.sound)
			this.soundEntry?.sound.stop();

		soundManager.destroySoundEntry(this.soundEntry);
	}
};
