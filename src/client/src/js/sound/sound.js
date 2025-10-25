import physics from '../misc/physics';
import events from '../system/events';
import config from '../config';
import globals from '../system/globals';
import { Howler, Howl } from 'howler';

let modAudio;

// Constants
const MASTER_VOLUME = 0.3;
const MIN_DISTANCE = 10;
const FADE_MS = 1800;

// State
let soundVolume = 100;
let musicVolume = 100;
let loadCount = 0;
let totalToLoad = 0;
let promiseResolver = null;

// Helpers
const clamp01 = v => Math.max(0, Math.min(1, v));
const toLinear = pct => clamp01((Number(pct) || 0) / 100);
const mapModPath = file => (file && file.startsWith('server/mods') ? modAudio[file] : file);
const distanceFalloff = d => clamp01(1 - (d * d) / (MIN_DISTANCE * MIN_DISTANCE));

// Master volume
Howler.volume(MASTER_VOLUME);

const soundManager = {
	sounds: [],
	muted: false,

	async init () {
		soundVolume = Number(config.get('soundVolume'));
		if (!Number.isFinite(soundVolume))
			soundVolume = 100;

		musicVolume = Number(config.get('musicVolume'));
		if (!Number.isFinite(musicVolume))
			musicVolume = 100;

		const playAudio = !!config.get('playAudio');
		this.muted = !playAudio;
		Howler.mute(this.muted);

		modAudio = (await import('@modAudio')).default;

		return new Promise(resolve => {
			promiseResolver = resolve;
			this._bindEvents();
			this._preloadConfiguredSounds();
		});
	},

	_bindEvents () {
		events.on('onToggleAudio', this.onToggleAudio.bind(this));
		events.on('onPlaySound', this.playSound.bind(this));
		events.on('onPlaySoundAtPosition', this.onPlaySoundAtPosition.bind(this));
		events.on('onManipulateVolume', this.onManipulateVolume.bind(this));
	},

	_preloadConfiguredSounds () {
		const { clientConfig: { sounds: loadSounds } } = globals;

		Object.values(loadSounds).forEach(list => {
			list.forEach(({ name, file }) => {
				const mapped = mapModPath(file);
				if (!mapped)
					return;

				totalToLoad++;
				this.addSound({
					name,
					scope: 'ui',
					file: mapped,
					autoLoad: true,
					notifyLoadDone: true
				});
			});
		});

		if (totalToLoad === 0)
			promiseResolver();
	},

	notifyLoadDone () {
		loadCount++;
		events.emit('loaderProgress', {
			type: 'sounds',
			progress: totalToLoad ? loadCount / totalToLoad : 1
		});
		if (loadCount === totalToLoad)
			promiseResolver();
	},

	loadSound (file, loop = false, autoplay = false, volume = 1, notifyLoadDone = false) {
		const resolved = mapModPath(file);
		if (!resolved)
			return null;

		const sound = new Howl({
			src: [resolved],
			volume: clamp01(volume),
			loop,
			autoplay,
			html5: loop
		});

		if (notifyLoadDone)
			sound.once('load', () => this.notifyLoadDone());

		return sound;
	},

	addSound ({
		name, scope, file, volume = 1, x, y, w, h, area, music,
		defaultMusic, autoLoad, loop, notifyLoadDone
	}) {
		if (!area && w) {
			area = [
				[x, y],
				[x + w, y],
				[x + w, y + h],
				[x, y + h]
			];
		}

		const entry = {
			name,
			scope,
			file,
			x, y,
			area,
			music: !!music,
			defaultMusic: !!defaultMusic,
			loop: !!loop,
			maxVolume: clamp01(volume),
			sound: null,
			targetVolume: 0
		};

		if (autoLoad)
			entry.sound = this.loadSound(file, loop, false, clamp01(music ? 0 : volume), notifyLoadDone);

		this.sounds.push(entry);

		if (window.player?.x !== undefined)
			this.update(window.player.x, window.player.y);

		return entry;
	},

	onPlaySoundAtPosition ({ position: { x, y }, file, volume }) {
		const mapped = mapModPath(file);
		if (!mapped || !window.player)
			return;

		const { player: { x: px, y: py } } = window;
		const dx = Math.abs(x - px);
		const dy = Math.abs(y - py);
		const distance = Math.max(dx, dy);

		if (distance >= MIN_DISTANCE)
			return;

		const gain = clamp01(toLinear(soundVolume) * distanceFalloff(distance) * (volume ?? 1));
		new Howl({ src: [mapped], volume: gain, autoplay: true });
	},

	playSound (soundName) {
		const entry = this.sounds.find(s => s.name === soundName);
		if (!entry)
			return;

		if (!entry.sound)
			entry.sound = this.loadSound(entry.file, entry.loop, false, 1);

		entry.sound.volume(toLinear(soundVolume));
		entry.sound.play();
	},

	update (x, y) {
		this.updateSounds(x, y);
		this.updateMusic(x, y);
	},

	updateSounds (x, y) {
		for (const s of this.sounds) {
			if (s.music || s.scope === 'ui')
				continue;

			let distance = 0;
			if (!s.area) 
				distance = Math.max(Math.abs(s.x - x), Math.abs(s.y - y));
			else if (!physics.isInPolygon(x, y, s.area)) 
				distance = physics.distanceToPolygon([x, y], s.area);

			if (distance > MIN_DISTANCE) {
				if (s.sound && s.sound.playing()) s.sound.stop();

				continue;
			}

			const falloff = distanceFalloff(distance);
			const gain = clamp01(s.maxVolume * falloff * toLinear(soundVolume));

			if (!s.sound)
				s.sound = this.loadSound(s.file, s.loop);

			s.sound.volume(gain);
			if (!s.sound.playing())
				s.sound.play();
		}
	},

	updateMusic (x, y) {
		const areaMusic = this.sounds.filter(s => s.music && s.area);
		const insideMusic = areaMusic.filter(s => physics.isInPolygon(x, y, s.area));
		const defaults = this.sounds.filter(s => s.defaultMusic);

		// play default only if no area music active
		if (defaults.length) {
			if (insideMusic.length === 0)
				defaults.forEach(m => this.fadeMusic(m, toLinear(musicVolume)));
			else
				defaults.forEach(m => this.fadeMusic(m, 0));
		}

		// handle area music
		const stopMusic = areaMusic.filter(s => s.sound && s.sound.playing() && !insideMusic.includes(s));
		stopMusic.forEach(m => this.fadeMusic(m, 0));

		insideMusic.forEach(m => this.fadeMusic(m, toLinear(musicVolume)));
	},

	fadeMusic (entry, targetVolume) {
		if (!entry.sound)
			entry.sound = this.loadSound(entry.file, entry.loop, false, 0);

		const current = entry.sound.volume();
		if (Math.abs(current - targetVolume) < 0.001)
			return;

		if (!entry.sound.playing() && targetVolume > 0)
			entry.sound.volume(0).play();

		entry.sound.volume(targetVolume);
	},

	onManipulateVolume ({ soundType, volume }) {
		if (soundType === 'sound')
			soundVolume = Math.max(0, Math.min(100, volume));
		else if (soundType === 'music')
			musicVolume = Math.max(0, Math.min(100, volume));

		events.emit('onVolumeChange', {
			soundType,
			volume: soundType === 'sound' ? soundVolume : musicVolume
		});

		if (window.player)
			this.update(window.player.x, window.player.y);
	},

	onToggleAudio (isAudioOn) {
		this.muted = !isAudioOn;
		Howler.mute(this.muted);
		if (window.player)
			this.update(window.player.x, window.player.y);
	},

	destroySoundEntry (entry) {
		if (entry.sound) {
			if (entry.sound.playing())
				entry.sound.stop();

			entry.sound.unload();
		}
		const idx = this.sounds.indexOf(entry);
		if (idx !== -1)
			this.sounds.splice(idx, 1);
	}
};

export default soundManager;
