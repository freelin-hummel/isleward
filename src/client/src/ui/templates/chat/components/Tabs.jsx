import { useEffect } from 'react';

import { getState as gs } from './props';

import { closeContextMenu } from './ContextMenu';

export const setActiveTabHandler = tabId => {
	const { setTabs, setActiveTab } = gs();

	// Clear the hasNewMessages flag for the tab being activated
	setTabs(prevTabs => 
		prevTabs.map(tab => 
			tab.id === tabId ? { ...tab, hasNewMessages: false } : tab
		)
	);
	
	// Set the active tab
	setActiveTab(tabId);
};

export const moveToTab = (targetType, targetValue) => {
	const { tabs, activeTab } = gs();

	const currentTab = tabs.find(t => t.id === activeTab);
	currentTab.hasNewMessages = false;

	const newTabs = [...tabs];

	const tabId = `${targetType}-${targetValue}`;
	if (!tabs.some(tab => tab.id === tabId)) {
		const newTab = { id: tabId, type: targetType, value: targetValue };
		newTabs.push(newTab);
	}

	gs('setTabs', newTabs);

	closeContextMenu();
};

export const closeTabHandler = tabIndex => {
	const { tabs, setTabs } = gs();

	// Add explicit check for tabs state before calling setTabs
	if (!tabs) {
		console.error("closeTabHandler: 'tabs' state is undefined or null before calling setTabs.");
		return;
	}

	// Check if the tab is closable
	const tab = tabs[tabIndex];
	if (tab && tab.closable === false) 
		return;

	setTabs(prevTabs => {
		// Check validity within the functional update (using prevTabs)
		if (!prevTabs || tabIndex < 0 || tabIndex >= prevTabs.length) {
			console.error('Error closing tab inside setTabs: Invalid prevTabs or tabIndex.', { tabIndex, prevTabs });
			return prevTabs;
		}

		const nextTabs = prevTabs.filter((_, index) => index !== tabIndex);

		return nextTabs;
	});
};

const getTabLabel = tab => {
	// If the tab has a custom label, use it
	if (tab.label) 
		return tab.label;
	
	// Otherwise, use the default label based on type
	switch (tab.type) {
	case 'type':
		return 'Info';
	case 'subType':
		return tab.value.charAt(0).toUpperCase() + tab.value.slice(1); 
	case 'privateConversation':
		return `PM: ${tab.value}`;
	case 'channel':
		return tab.value.charAt(0).toUpperCase() + tab.value.slice(1);
	default:
		return tab.value.charAt(0).toUpperCase() + tab.value.slice(1);
	}
};

//If activeTab is closed, default back to showing global chat
const modifyActiveTab = () => {
	const { activeTab, tabs, setActiveTab } = gs();

	if (!tabs.some(t => t.id === activeTab))
		setActiveTab('chat-global');
};

const Tabs = () => {
	const { tabs, setActiveTab, activeTab } = gs();

	useEffect(modifyActiveTab, [tabs.length]);

	if (!(tabs.length > 0 || activeTab !== 'subType-global'))
		return null;

	const handlerSwapTab = newTabId => {
		const oldTab = tabs.find(t => t.id === activeTab);
		if (oldTab?.hasNewMessages) {
			oldTab.hasNewMessages = false;

			gs('setTabs', [...tabs]);
		}

		closeContextMenu();
		setActiveTab(newTabId);
	};

	return (
		<div className="chat-tabs">
			{tabs.map((tab, index) => {
				// Determine if the tab is inactive (e.g., closed party)
				const isInactive = tab.inactive === true;
				// Determine if the tab is closable (default to true if not specified)
				const isClosable = tab.closable !== false;
				
				// Determine if the tab has new messages
				const hasNewMessages = tab.hasNewMessages === true;

				const isActiveTab = activeTab === tab.id;

				const className = `tab ${isActiveTab ? 'active' : ''} ${isInactive ? 'inactive' : ''} ${hasNewMessages && !isActiveTab ? 'has-new-messages' : ''}`;
				
				return (
					<div
						key={tab.id}
						className={className}
						onClick={handlerSwapTab.bind(null, tab.id)}
					>
						{getTabLabel(tab)}
						{isClosable && (
							<span
								className="tab-close"
								onClick={e => {
									e.stopPropagation();
									closeTabHandler(index);
								}}
							>
								×
							</span>
						)}
					</div>
				);
			})}
		</div>
	);
};

export default Tabs;
