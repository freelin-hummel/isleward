import client from '../system/client';
import events from '../system/events';

export default {
	type: 'dialogue',

	init () {

	},

	talk (target) {
		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'dialogue',
				method: 'talk',
				data: { target: target.id }
			}
		});
	},

	extend (blueprint) {
		events.emit('onGetTalk', blueprint.state);
	}
};
