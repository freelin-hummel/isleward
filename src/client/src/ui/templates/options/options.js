// options.js
import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';
import globals from '../../../js/system/globals';
import config from '../../../js/config';

export default {
	tpl: template,
	centered: true,
	modal: true,
	hasClose: true,
	isFlex: true,

	postRender () {
		this.onEvent('onOpenOptions', this.show.bind(this));
		this.onEvent('onUiKeyDown', this.onUiKeyDown.bind(this));

		const { clientOptions } = globals.clientConfig;
		const { options, meta } = clientOptions;

		const container = this.find('.options-list');
		container.empty();

		for (const def of meta) {
			// Render section heading
			if (def.section) {
				const heading = $(`<div class="heading">${def.section}</div>`);
				container.append(heading);
				continue;
			}

			const { key, label, type } = def;
			const value = options[key];
			if (value === undefined) continue;

			const display = this.formatValue(value);
			let item;

			if (type === 'volume') {
				item = $(`
			<div class="item ${key} volume">
				<div class="name">${label}</div>
				<div class="controls">
					<div class="btn decrease">-</div>
					<div class="value">${display}</div>
					<div class="btn increase">+</div>
				</div>
			</div>
		`);
				item.find('.btn.increase').on('click', () => this.adjustVolume(key, 10, def));
				item.find('.btn.decrease').on('click', () => this.adjustVolume(key, -10, def));
			} else {
				item = $(`
			<div class="item ${key}">
				<div class="name">${label}</div>
				<div class="value">${display}</div>
			</div>
		`);
				item.on('click', () => this.toggleOption(key, def));
			}

			container.append(item);
		}
	},

	formatValue (value) {
		if (typeof value === 'boolean')
			return value ? 'On' : 'Off';
		if (typeof value === 'string')
			return value[0].toUpperCase() + value.slice(1);
		return value;
	},

	toggleOption (key, def) {
		const newValue = config.toggleDynamic(key);
		this.refreshValue(key);

		// Dispatch one or more events
		if (def.events && Array.isArray(def.events)) {
			for (const e of def.events)
				events.emit(e, newValue);
		} else if (def.event) 
			events.emit(def.event, newValue);
	},

	refreshValue (key) {
		const val = this.formatValue(config.get(key));
		this.find(`.item.${key} .value`).html(val);
	},

	adjustVolume (key, delta, def) {
		const newVolume = Math.max(0, Math.min(100, config.get(key) + delta));
		config.set(key, newVolume);
		this.find(`.item.${key} .value`).html(newVolume);

		if (def.events && Array.isArray(def.events)) {
			for (const e of def.events)
				events.emit(e, { soundType: key.includes('music') ? 'music' : 'sound', volume: newVolume });
		} else if (def.event) 
			events.emit(def.event, { soundType: key.includes('music') ? 'music' : 'sound', volume: newVolume });
	},

	onAfterShow () {
		this.build();
	},

	build () {
		const { options } = globals.clientConfig.clientOptions;
		for (const key in options) {
			const val = this.formatValue(options[key]);
			this.find(`.item.${key} .value`).html(val);
		}
	},

	afterHide () {
		events.emit('onCloseOptions');
	},

	onUiKeyDown (keyEvent) {
		const { key } = keyEvent;

		if (key === 'v') {
			config.toggle('showNames');

			events.emit('onToggleNameplates', config.get('showNames'));
		}
	}

};
