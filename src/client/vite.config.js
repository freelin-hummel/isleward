import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import pluginBuildModUis from './vitePlugins/buildModUis';
import pluginModAudio from './vitePlugins/buildModAudio';
import pluginModComponents from './vitePlugins/buildModComponents';
import pluginModImages from './vitePlugins/buildModImages';
import pluginModModules from './vitePlugins/buildModModules';

export default defineConfig(() => {
	const { tempFile: modAudio } = pluginModAudio();
	const { tempFile: modComponents } = pluginModComponents();
	const { tempFile: modImages } = pluginModImages();
	const { tempFile: modModules } = pluginModModules();
	const { tempFile: modUis } = pluginBuildModUis();

	return {
		plugins: [
			react()
		],
		resolve: {
			alias: {
				client: '/src',
				'@modAudio': modAudio,
				'@modComponents': modComponents,
				'@modImages': modImages,
				'@modModules': modModules,
				'@modUis': modUis
			}
		},
		server: { fs: { allow: ['..'] } },
		build: {
			assetsInlineLimit: 65000,
			rollupOptions: { external: [] }
		}
	};
});
