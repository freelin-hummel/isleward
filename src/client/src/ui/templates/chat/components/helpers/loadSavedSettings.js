import browserStorage from 'client/js/system/browserStorage';

const defaultSettings = {
	pointerEventsMode: false,
	defaultOpacity: 0.1,
	activeOpacity: 0.9,
	hoverOpacity: 0.4,
	width: 520,
	height: 320,
	allowResize: true
};

const loadSavedSettings = () => {
	try {
		const savedSettings = browserStorage.get('chatSettings');
		if (savedSettings && savedSettings !== '{unset}') 
			return $.extend(defaultSettings, JSON.parse(savedSettings));
	} catch (error) {
		console.error('Error loading chat settings:', error);
	}
	return defaultSettings;
};

export default loadSavedSettings;
