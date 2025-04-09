window.addons = {
	addons: [],
	events: null,

	register (addon) {
		this.addons.push(addon);

		if (this.events)
			addon.init(this.events);
	},

	init (events) {
		this.events = events;

		this.addons.forEach(a => a.init(this.events));
	}
};
