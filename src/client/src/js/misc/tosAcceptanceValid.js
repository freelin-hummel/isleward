import browserStorage from '../system/browserStorage.js';
import globals from '../system/globals.js';

export default () => {
	const acceptedVersion = browserStorage.get('tos_accepted_version');
	const currentVersion = globals.clientConfig.tos.version;

	return (acceptedVersion === currentVersion);
};
