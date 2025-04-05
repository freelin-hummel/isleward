import events from '../system/events';

export default {
	type: 'quests',
	quests: [],

	init () {
		this.quests.forEach(q => events.emit('onObtainQuest', q));
	},

	extend (blueprint) {
		if (blueprint.updateQuests) {
			blueprint.updateQuests.forEach(function (q) {
				events.emit('onUpdateQuest', q);
				let index = this.quests.findIndex(f => f.id === q.id);
				this.quests.splice(index, 1, q);
			}, this);
		}
		if (blueprint.completeQuests) {
			blueprint.completeQuests.forEach(function (q) {
				events.emit('onCompleteQuest', q);
				this.quests.spliceWhere(function (qq) {
					return (qq.id === q);
				});
			}, this);
		}
		if (blueprint.obtainQuests) {
			blueprint.obtainQuests.forEach(function (q) {
				events.emit('onObtainQuest', q);
				this.quests.push(q);
			}, this);
		}
	}
};
