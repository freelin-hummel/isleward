import events from '../system/events';

export default {
	type: 'events',
	list: [],

	init () {
		this.list.forEach(function (q) {
			events.emit('onObtainEvent', q);
		});
	},

	extend (blueprint) {
		if (blueprint.updateList) {
			blueprint.updateList.forEach(function (q) {
				events.emit('onObtainEvent', q);
				_.spliceWhere(this.list, l => l.id === q.id);
				this.list.push(q);
			}, this);
		}

		if (blueprint.removeList) {
			blueprint.removeList.forEach(function (q) {
				events.emit('onRemoveEvent', q.id);
				_.spliceWhere(this.list, l => l.id === q.id);
			}, this);
		}
	}
};
