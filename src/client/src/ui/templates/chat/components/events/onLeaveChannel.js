import { getState as gs } from '../props';

const onLeaveChannel = channelName => {
	// Remove the tab for the channel when the player leaves it
	const channelTabId = `channel-${channelName}`;
	gs('setTabs', prevTabs => {
		// Filter out the channel tab
		return prevTabs.filter(tab => tab.id !== channelTabId);
	});
};

export default onLeaveChannel;
