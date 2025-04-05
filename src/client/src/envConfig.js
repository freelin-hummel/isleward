const appMode = import.meta.env.VITE_APP_MODE;

window.envConfig = {
	themeEntry_appMode: {
		theme: 'system',
		key: 'appMode',
		value: appMode
	}
};
