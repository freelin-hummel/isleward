/* eslint-disable max-lines-per-function */

import client from 'client/js/system/client';

import { getState as gs } from '../props';

const handleKeyPress = e => {
	const { tabs, inputValue, mentionPopup, setMentionPopup, setActiveTab, activeTab, inputRef } = gs();

	// Handle Escape key to blur input and hide it
	if (e.key === 'Escape') {
		if (mentionPopup.visible) 
			setMentionPopup(prev => ({ ...prev, visible: false }));
		else if (gs('inputVisible')) {
			gs('setInputVisible', false);
			gs('setInputValue', '');
			if (inputRef.current) 
				inputRef.current.blur();
		}
		return;
	}

	// Handle Tab key to cycle through tabs while keeping input focused
	if (e.key === 'Tab' && gs('inputVisible')) {
		e.preventDefault();
		
		// Get all tab IDs from the tabs array
		const allTabIds = tabs.map(tab => tab.id);
		
		// Find the current active tab index
		const currentIndex = allTabIds.indexOf(activeTab);
		
		// Calculate the next tab index (cycle back to 0 if at the end)
		const nextIndex = (currentIndex + 1) % allTabIds.length;

		const oldTab = tabs[currentIndex];
		if (oldTab.hasNewMessages) {
			oldTab.hasNewMessages = false;
			gs('setTabs', [...tabs]);
		}
		
		// Set the next tab as active
		setActiveTab(allTabIds[nextIndex]);
		
		// Keep the input focused
		setTimeout(() => {
			if (inputRef.current) 
				inputRef.current.focus();
		}, 0);
		
		return;
	}

	if (mentionPopup.visible) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setMentionPopup(prev => {
				const newIndex = prev.selectedIndex < prev.players.length - 1 
					? prev.selectedIndex + 1 
					: 0;
				return {
					...prev,
					selectedIndex: newIndex
				};
			});
			return;
		}
		
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			setMentionPopup(prev => {
				const newIndex = prev.selectedIndex > 0 
					? prev.selectedIndex - 1 
					: prev.players.length - 1;
				return {
					...prev,
					selectedIndex: newIndex
				};
			});
			return;
		}
		
		if (e.key === 'Enter' && mentionPopup.players.length > 0) {
			e.preventDefault();
			const selectedPlayer = mentionPopup.players[mentionPopup.selectedIndex];
			
			const atIndex = inputValue.lastIndexOf('@');
			const newInputValue = inputValue.substring(0, atIndex + 1) + selectedPlayer + ' ';
			
			gs('setInputValue', newInputValue);
			setMentionPopup(prev => ({ ...prev, visible: false }));
			return;
		}
	}
	
	if (e.key === 'Enter') {
		if (!gs('inputVisible')) 
			gs('setInputVisible', true);
		else if (inputValue.trim()) {
			// Check if the active tab is inactive (e.g., closed party)
			const activeTabObj = tabs.find(tab => tab.id === activeTab);
			if (activeTabObj && activeTabObj.inactive) {
				// Don't allow sending messages in inactive tabs
				return;
			}
			
			// Check for @playername and capture name + message
			const privateMessageMatch = inputValue.match(/^@(\w+)\s+(.*)/); 

			let requestData;
			if (privateMessageMatch) {
				// It's a direct message
				const targetName = privateMessageMatch[1];
				const messageContent = privateMessageMatch[2];
				requestData = {
					message: messageContent,
					type: 'direct',
					subType: targetName
				};
			} else if (activeTabObj) {
				if (activeTabObj.id === 'subType-party') {
					// It's a party message
					requestData = {
						message: inputValue,
						type: 'party'
					};
				} else if (activeTabObj.type === 'privateConversation') {
					// It's a whisper message
					const targetName = activeTabObj.value;
					requestData = {
						message: inputValue,
						type: 'direct',
						subType: targetName
					};
				} else if (activeTabObj.id === 'type-info') {
					// Messages sent in Info tab should go to type 'global'
					requestData = {
						message: inputValue,
						type: 'global'
					};
				} else if (activeTabObj.type === 'channel') {
					// Messages sent in custom channels should go to type 'custom' and subType as the channel name
					requestData = {
						message: inputValue,
						type: 'custom',
						subType: activeTabObj.value
					};
				} else if (activeTabObj.id === 'chat-global') {
					// Messages sent in Global tab should be sent with type 'chat'
					requestData = {
						message: inputValue,
						type: 'global'
					};
				} else {
					// Default for other tabs
					requestData = {
						message: inputValue,
						type: 'global'
					};
				}
			} else {
				// Fallback to global message
				requestData = {
					message: inputValue,
					type: 'global'
				};
			}

			client.request({
				cpn: 'social',
				method: 'chat',
				data: requestData
			});

			gs('setInputValue', '');
			gs('setInputVisible', false);
			setMentionPopup(prev => ({ ...prev, visible: false }));
		}
	}
};

export default handleKeyPress;
