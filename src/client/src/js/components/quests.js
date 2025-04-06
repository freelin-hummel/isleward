import events from '../system/events';

export default {
	type: 'quests',
	quests: [],

	init () {
		this.quests.forEach(q => events.emit('onObtainQuest', q));
	},

	extend (blueprint) {
		if (blueprint.updateQuests) {
			blueprint.updateQuests.forEach(q => {
				events.emit('onUpdateQuest', q);
				let index = this.quests.findIndex(f => f.id === q.id);
				this.quests.splice(index, 1, q);
			});
		}
		if (blueprint.completeQuests) {
			blueprint.completeQuests.forEach(q => {
				events.emit('onCompleteQuest', q);
				_.spliceWhere(this.quests, qq => qq.id === q);
			});
		}
		if (blueprint.obtainQuests) {
			blueprint.obtainQuests.forEach(q => {
				events.emit('onObtainQuest', q);
				this.quests.push(q);
			});
		}
	}
};
