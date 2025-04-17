import { getState as gs } from '../props';

const onJoinChannel = channelName => {
	// Create a tab for the channel when the player joins it
	const channelTabId = `channel-${channelName}`;
	gs('setTabs', prevTabs => {
		// Check if the channel tab already exists
		if (prevTabs.some(tab => tab.id === channelTabId)) 
			return prevTabs;
		
		// Create a new channel tab
		const channelTab = { 
			id: channelTabId, 
			type: 'channel', 
			value: channelName
		};
		
		return [...prevTabs, channelTab];
	});
};

export default onJoinChannel;
