import events from '../system/events';
import client from '../system/client';
import input from '../input';

export default {
	type: 'serverActions',

	actions: [],

	init () {
		this.hookEvent('onKeyUp', this.onKeyUp.bind(this));
	},

	hasAction (actionId) {
		return this.actions.some(a => a.id === actionId);
	},

	onKeyUp (key) {
		if (!input.isKeyAllowed(key))
			return;

		this.actions.forEach(a => {
			if (a.key !== key)
				return;

			client.request({
				cpn: 'player',
				method: 'performAction',
				data: a.action
			});
		});
	},

	extend (blueprint) {
		if (blueprint.addActions) {
			blueprint.addActions.forEach(a => {
				this.actions.spliceWhere(f => f.key === a.key);

				let exists = this.actions.some(ta => {
					return (ta.action.data.targetId === a.action.data.targetId && ta.action.cpn === a.action.cpn && ta.action.method === a.action.method);
				});
				if (exists)
					return;

				this.actions.push(a);
			});

			delete blueprint.addActions;
		}

		if (blueprint.removeActions) {
			blueprint.removeActions.forEach(a => {
				this.actions.spliceWhere(ta => {
					return (ta.action.data.targetId === a.action.data.targetId && ta.action.cpn === a.action.cpn && ta.action.method === a.action.method);
				});
			});

			delete blueprint.removeActions;
		}

		events.emit('onGetServerActions', this.actions);
	},

	destroy () {
		this.unhookEvents();
	}
};
