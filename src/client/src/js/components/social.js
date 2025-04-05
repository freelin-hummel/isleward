import events from '../system/events';

export default {
	type: 'social',

	customChannels: null,
	blockedPlayers: null,

	init (blueprint) {
		if (this.customChannels)
			events.emit('onGetCustomChatChannels', this.customChannels);

		if (blueprint.blockedPlayers)
			this.blockedList = blueprint.blockedList;

		if (blueprint.actions) {
			this.actions = blueprint.actions;
			events.emit('onGetSocialActions', this.actions);
		}
	},

	extend (blueprint) {
		if (blueprint.blockedPlayers)
			this.blockedPlayers = blueprint.blockedPlayers;
	},

	isPlayerBlocked (playerName) {
		if (!this.blockedPlayers)
			return false;

		return this.blockedPlayers.includes(playerName);
	}
};
