window.addons = {
	addons: [],

	ready: false,

	addonProps: {
		clientRequest: null,
		events: null,
		isKeyDown: null,
		objects: null,
		rendererLayers: null
	},

	register (addon) {
		const entry = {
			addon,
			ready: false
		};

		this.addons.push(entry);

		if (this.ready)
			this.initAddon(entry);
	},

	init (props) {
		Object.keys(this.addonProps).forEach(k => {
			this.addonProps[k] = props[k];
		});

		this.ready = true;

		this.addons.forEach(a => {
			if (a.ready)
				return;

			this.initAddon(a);
		});
	},

	initAddon (addon) {
		try {
			addon.addon.init({ ...this.addonProps });

			addon.ready = true;
		} catch (e) {
			console.error('Failed to initialize addon', e);
		}
	}
};
