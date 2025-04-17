import { getState as gs } from '../props';

const onGetParty = () => {
	// Create a non-closable party tab when the player joins a party
	const partyTabId = 'subType-party';

	gs('setTabs', prevTabs => {
		// Check if the party tab already exists
		const existingPartyTabIndex = prevTabs.findIndex(tab => tab.id === partyTabId);
		
		if (existingPartyTabIndex !== -1) {
			// If the party tab exists, check if it's marked as inactive (closed)
			const existingPartyTab = prevTabs[existingPartyTabIndex];
			
			if (existingPartyTab.inactive) {
				// Reactivate the party tab
				const updatedTabs = [...prevTabs];
				updatedTabs[existingPartyTabIndex] = {
					...existingPartyTab,
					// Remove custom label
					label: undefined, 
					inactive: false,
					closable: false
				};
				return updatedTabs;
			}
			
			// If it's already active, no changes needed
			return prevTabs;
		}
		
		// Create a new party tab that is not closable
		const partyTab = { 
			id: partyTabId, 
			type: 'subType', 
			value: 'party',
			closable: false
		};
		
		return [...prevTabs, partyTab];
	});
};

export default onGetParty;
