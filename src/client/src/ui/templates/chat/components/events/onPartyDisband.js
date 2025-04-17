import { getState as gs } from '../props';

const onPartyDisband = () => {
	// Make the party tab closable and rename it when the party disbands
	gs('setTabs', prevTabs => {
		return prevTabs.map(tab => {
			if (tab.id === 'subType-party') {
				return {
					...tab,
					closable: true,
					// Custom label override
					label: 'Closed Party', 
					inactive: true
				};
			}
			return tab;
		});
	});
};

export default onPartyDisband;
