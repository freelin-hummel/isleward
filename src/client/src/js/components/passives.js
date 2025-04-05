import events from '../system/events';

export default {
	type: 'passives',

	selected: [],
	points: 0,

	init () {
		events.emit('onGetPassives', this.selected);
		events.emit('onGetPassivePoints', this.points);
	},

	extend (blueprint) {
		let rerender = false;

		if (blueprint.tickNodes) {
			blueprint.tickNodes.forEach(function (n) {
				this.selected.push(n);
			}, this);

			rerender = true;
		}

		if (blueprint.untickNodes) {
			blueprint.untickNodes.forEach(function (n) {
				this.selected.spliceWhere(function (s) {
					return (s === n);
				});
			}, this);

			rerender = true;
		}

		if (rerender)
			events.emit('onGetPassives', this.selected);

		if (blueprint.points !== null) {
			this.points = blueprint.points;
			events.emit('onGetPassivePoints', this.points);
		}
	}
};
