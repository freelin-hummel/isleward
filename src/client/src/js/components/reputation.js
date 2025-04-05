import events from '../system/events';

export default {
	type: 'reputation',

	list: [],
	factions: [],

	init () {
		events.emit('onGetReputations', this.list);
	},

	extend (blueprint) {
		if (blueprint.modifyRep) {
			blueprint.modifyRep.forEach(function (m) {
				let exists = this.list.find(l => (l.id === m.id));
				if (!exists)
					this.list.push(m);
				else {
					for (let p in m)
						exists[p] = m[p];
				}
			}, this);

			delete blueprint.modifyRep;

			events.emit('onGetReputations', this.list);
		}
	},

	getTier (factionId) {
		return this.list.find(f => f.id === factionId)?.tier ?? 3;
	}
};
