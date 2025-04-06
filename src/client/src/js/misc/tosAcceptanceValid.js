import browserStorage from '../system/browserStorage';
import globals from '../system/globals';

export default () => {
	const acceptedVersion = browserStorage.get('tos_accepted_version');
	const currentVersion = globals.clientConfig.tos.version;

	return (acceptedVersion === currentVersion);
};
