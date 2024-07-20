define([
	'js/system/globals'
], function (
	globals
) {
	return {
		init: async function () {
			const { clientConfig: { extraClientModules } } = globals;

			const modules = await Promise.all(
				extraClientModules.map(path => {
					return new Promise(res => {
						require([path], res);
					});
				})
			);

			modules.forEach(m => m.init());
		}
	};
});
