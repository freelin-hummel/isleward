define([
	'ui/uiBase',
	'js/system/events',
	'js/system/client',
	'js/system/globals',
	'js/misc/tosAcceptanceValid'
], function (
	uiBase,
	events,
	client,
	globals,
	tosAcceptanceValid
) {
	//Some UIs are strings. In these cases, the path should default to the client/ui/templates folder
	const setUiTypes = list => {
		console.log(list);
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

	return {
		uis: [],
		ingameUisBuilt: false,

		init: function () {
			events.on('onBuildIngameUis', this.onBuildIngameUis.bind(this));
			events.on('onUiKeyDown', this.onUiKeyDown.bind(this));
			events.on('onResize', this.onResize.bind(this));

			console.log('building login list');
			setUiTypes(globals.clientConfig.uiLoginList);
			console.log('login list is', globals.clientConfig.uiLoginList);
			setUiTypes(globals.clientConfig.uiList);

			globals.clientConfig.uiLoginList.forEach(u => {
				console.log('ok so', u);
				this.buildFromConfig(u);
			});
		},

		onBuildIngameUis: async function () {
			if (!this.ingameUisBuilt) {
				events.clearQueue();

				await Promise.all(
					globals.clientConfig.uiList
						.filter(u => u.autoLoadOnPlay !== false)
						.map(u => {
							return new Promise(res => {
								const doneCheck = () => {
									const isDone = this.uis.some(ui => ui.type === u.type);
									if (isDone) {
										res();

										return;
									}

									setTimeout(doneCheck, 100);
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

		build: function (type) {
			const config = globals.clientConfig.uiList.find(u => u.type === type);

			this.buildFromConfig(config);
		},

		buildFromConfig: async function (config) {
			const { type, path } = config;

			let className = 'ui' + type[0].toUpperCase() + type.substr(1);
			let el = $('.' + className);
			if (el.length > 0)
				return;

			const fullPath = `${path}/${type}`;

			const template = await new Promise(res => {
				require([fullPath], res);
			});

			let ui = $.extend(true, { type }, uiBase, template);
		
			requestAnimationFrame(this.renderUi.bind(this, ui));
		},

		renderUi: function (ui) {
			ui.render();
			ui.el.data('ui', ui);

			this.uis.push(ui);
		},

		onResize: function () {
			this.uis.forEach(function (ui) {
				if (ui.centered)
					ui.center();
				else if ((ui.centeredX) || (ui.centeredY))
					ui.center(ui.centeredX, ui.centeredY);
			}, this);
		},

		onUiKeyDown: function (keyEvent) {
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

		preload: function () {
			require([
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
			].map(m => 'ui/templates/' + m + '/' + m), this.afterPreload.bind(this));
		},

		afterPreload: function () {
			if (!globals.clientConfig.tos.required || tosAcceptanceValid()) {
				const uiCharactersConfig = globals.clientConfig.uiList.find(f => f.type === 'characters');

				this.buildFromConfig(uiCharactersConfig);

				return;
			}

			this.build('terms');
		},

		update: function () {
			let uis = this.uis;
			let uLen = uis.length;
			for (let i = 0; i < uLen; i++) {
				let u = uis[i];
				if (u.update)
					u.update();
			}
		},

		exitGame: function () {
			$('[class^="ui"]:not(.ui-container)').toArray().forEach(el => {
				let ui = $(el).data('ui');
				if (ui && ui.destroy)
					ui.destroy();
			});

			this.ingameUisBuilt = false;
		},

		getUi: function (type) {
			return this.uis.find(u => u.type === type);
		}
	};
});
