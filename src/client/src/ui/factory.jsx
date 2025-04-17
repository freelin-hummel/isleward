import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import uiBase from './uiBase';
import events from '../js/system/events';
import client from '../js/system/client';
import globals from '../js/system/globals';
import tosAcceptanceValid from '../js/misc/tosAcceptanceValid';

import * as opusUi from '@intenda/opus-ui';

window.opusUi = opusUi;

let modUis;

//Some UIs are strings. In these cases, the path should default to the client/ui/templates folder
const setUiTypes = list => {
	list.forEach((l, i) => {
		if (typeof(l) === 'string') {
			list[i] = {
				type: l,
				path: `ui/templates/${l}`,
				autoLoadOnPlay: true
			};
		} else if (l.type === undefined)
			l.type = l.path.split('/').pop();
		else if (l.path === undefined)
			l.path = `ui/templates/${l.type}`;
	});
};

const Factory = ({ setComponentSetter }) => {
	const [components, setComponents] = useState([]);

	useEffect(() => setComponentSetter(setComponents), []);

	return (
		<>
			{components.map(({ Component, type }) => {
				return (
					<Component key={type} />
				);
			})}
		</>
	);
};

export default {
	ingameUisBuilt: false,

	uis: [],
	reactUis: [],

	reactRoot: null,
	setComponents: null,

	async preInit () {
		return new Promise(res => {
			this.reactRoot = createRoot(document.getElementById('react-root'));

			this.reactRoot.render(
				<Factory setComponentSetter={setter => {
					this.setComponents = setter;

					res();
				}} />
			);
		});
	},

	async init () {
		modUis = (await import('@modUis')).default;

		events.on('onBuildIngameUis', this.onBuildIngameUis.bind(this));
		events.on('onUiKeyDown', this.onUiKeyDown.bind(this));
		events.on('onResize', this.onResize.bind(this));

		setUiTypes(globals.clientConfig.uiLoginList);
		setUiTypes(globals.clientConfig.uiList);

		globals.clientConfig.uiLoginList.forEach(u => this.buildFromConfig(u));
	},

	async onBuildIngameUis () {
		if (!this.ingameUisBuilt) {
			events.clearQueue();

			await Promise.all(
				globals.clientConfig.uiList
					.filter(u => u.autoLoadOnPlay !== false && u.type !== 'tutorial')
					.map(u => {
						return new Promise(res => {
							const doneCheck = () => {
								const isDone = this.uis.some(ui => ui.type === u.type);
								if (isDone) {
									res();

									return;
								}

								setTimeout(doneCheck, 10);
							};

							this.buildFromConfig(u);

							doneCheck();
						});
					})
			);

			this.ingameUisBuilt = true;
		}

		client.request({
			threadModule: 'instancer',
			method: 'clientAck',
			data: {}
		});
	},

	build (type) {
		const config = globals.clientConfig.uiList.find(u => u.type === type);

		this.buildFromConfig(config);
	},

	async buildFromConfig (config) {
		const { type, path } = config;

		const className = `ui${type[0].toUpperCase()}${type.substr(1)}`;
		const el = $('.' + className);
		if (el.length > 0)
			return;

		const fullPath = `${path}/${type}`;

		try {
			let template = config.template;

			if (!template) {
				if (path.indexOf('server/') === 0)
					template = modUis[type].default;
				else {
					const importedModule = await import(`./templates/${type}/${type}.js`);
					template = importedModule.default;
				}
			}

			//React/Opus components are functions. Legacy ones are objects
			if (typeof(template) === 'function') {
				const Component = template;

				this.reactUis.push({
					type,
					Component
				});

				this.setComponents([...this.reactUis]);

				this.uis.push({
					type
				});

				return;
			}

			const ui = $.extend(true, { type }, uiBase, template);

			requestAnimationFrame(this.renderUi.bind(this, ui));
		} catch (e) {
			console.error(`Failed to load UI: ${fullPath}`, e);
		}
	},

	renderUi (ui) {
		ui.render();
		ui.el.data('ui', ui);

		this.uis.push(ui);
	},

	onResize () {
		this.uis.forEach(function (ui) {
			if (ui.centered)
				ui.center();
			else if ((ui.centeredX) || (ui.centeredY))
				ui.center(ui.centeredX, ui.centeredY);
		}, this);
	},

	onUiKeyDown (keyEvent) {
		if (keyEvent.key === 'esc') {
			this.uis.forEach(u => {
				if (!u.modal || !u.shown)
					return;

				keyEvent.consumed = true;
				u.toggle();
			});

			$('.uiOverlay').hide();
			events.emit('onHideContextMenu');
		} else if (['o', 'j', 'h', 'i'].indexOf(keyEvent.key) > -1)
			$('.uiOverlay').hide();
	},

	async preload () {
		const modules = [
			'death',
			'dialogue',
			'equipment',
			'events',
			'hud',
			'inventory',
			'overlay',
			'passives',
			'quests',
			'reputation',
			'stash'
		];

		await Promise.all(modules.map(async m => {
			try {
				// Dynamic import for ES modules
				await import(`./templates/${m}/${m}.js`);
			} catch (e) {
				console.error(`Failed to preload module: ${m}`, e);
			}
		}));

		this.afterPreload();
	},

	afterPreload () {
		if (!globals.clientConfig.tos.required || tosAcceptanceValid()) {
			const uiCharactersConfig = globals.clientConfig.uiList.find(f => f.type === 'characters');

			this.buildFromConfig(uiCharactersConfig);

			return;
		}

		this.build('terms');
	},

	update () {
		let uis = this.uis;
		let uLen = uis.length;
		for (let i = 0; i < uLen; i++) {
			let u = uis[i];
			if (u.update)
				u.update();
		}
	},

	exitGame () {
		$('[class^="ui"]:not(.ui-container)').toArray().forEach(el => {
			let ui = $(el).data('ui');
			if (ui && ui.destroy)
				ui.destroy();
		});

		this.ingameUisBuilt = false;

		this.reactUis.length = 0;
		this.setComponents([...this.reactUis]);
	},

	getUi (type) {
		return this.uis.find(u => u.type === type);
	}
};
