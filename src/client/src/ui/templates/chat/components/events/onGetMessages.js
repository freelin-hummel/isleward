import { getState as gs } from '../props';

const onGetMessages = ({ messages: incomingMessages }) => {
	if (!window.player) return;

	const messagesToAdd = (Array.isArray(incomingMessages) ? incomingMessages : [incomingMessages])
		.map(msg => {
			let type = msg.type;
			if (!msg.source && !msg.target)
				type = 'info';

			// Add a unique ID
			// Preserve all original properties including class, emojiTag, namePrefix, etc.
			return {
				...msg,
				type,
				id: Date.now() + Math.random()
			};
		});

	if (messagesToAdd.length > 0) {
		// Update tabs with new messages flag
		gs('setTabs', prevTabs => {
			return prevTabs.map(tab => {
				// Check if any of the new messages belong to this tab
				const hasNewMessages = messagesToAdd.some(message => {
					switch (tab.type) {
					case 'type':
						return message.type === tab.value;
					case 'subType':
						return message.subType === tab.value;
					case 'privateConversation':
						return (
							message.subType === 'privateIn' &&
							message.source === tab.value
						) ||
						(
							message.subType === 'privateOut' &&
							message.target === tab.value
						);
					case 'channel':
						return message.subType === 'custom' && message.channel === tab.value;
					case 'chat':
						// For the Global tab, check if this message doesn't match any other tab
						if (tab.value === 'global') {
							// Check if this message matches any other tab
							return !prevTabs.some(otherTab => {
								// Skip the Global tab itself
								if (otherTab.id === 'chat-global') return false;
									
								switch (otherTab.type) {
								case 'type':
									// e.g., 'info'
									return message.type === otherTab.value;
								case 'subType':
									// e.g., 'party'
									return message.subType === otherTab.value;
								case 'privateConversation':
									return (
										message.subType === 'privateIn' &&
										message.source === otherTab.value
									) ||
									(
										message.subType === 'privateOut' &&
										message.target === otherTab.value
									);
								case 'channel':
									// Custom channel match
									return message.subType === 'custom' && message.channel === otherTab.value;
								default:
									return false;
								}
							});
						}
						return false;
					default:
						return false;
					}
				});
				
				// If this tab has new messages, mark it
				if (hasNewMessages) 
					return { ...tab, hasNewMessages: true };
				
				return tab;
			});
		});
		
		gs('setMessages', prevMessages => [...prevMessages, ...messagesToAdd]);
	}
};

export default onGetMessages;
