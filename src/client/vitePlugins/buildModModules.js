 

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';

function gatherModAliases (modsRoot) {
	const matchedFolders = fg.sync('**/clientModules/*/', {
		cwd: modsRoot,
		onlyDirectories: true
	});

	const aliases = {};
	for (const folder of matchedFolders) {
		const absolutePath = path.join(modsRoot, folder).replace(/\\/g, '/');

		const newName = folder.split('/').pop();
		aliases[newName + '.js'] = absolutePath;
	}

	return aliases;
}

function buildModModulessFileContent (aliases) {
	const imports = [];
	const objectEntries = [];

	let index = 0;
	for (const aliasName of Object.keys(aliases)) {
		const varName = `mod_${index++}`;
		const absolutePath = aliases[aliasName];

		const fileName = absolutePath.split('/').pop();

		imports.push(`import * as ${varName} from '${absolutePath}/${fileName}.js';`);
		objectEntries.push(`  '${aliasName}': ${varName}`);
	}

	return `
		${imports.join('\n')}

		export default {
		${objectEntries.join(',\n')}
	};`;
}

const plugin = () => {
	const modsRoot = path.resolve(__dirname, '../../server/mods');
	const dynamicAliases = gatherModAliases(modsRoot);

	const tempDir = path.join(__dirname, '.temp');
	fs.mkdirSync(tempDir, { recursive: true });

	const tempFile = path.join(tempDir, 'modModules.js');
	const modUisContent = buildModModulessFileContent(dynamicAliases);
	fs.writeFileSync(tempFile, modUisContent, 'utf-8');

	return {
		tempFile: tempFile.replace(/\\/g, '/'),
		dynamicAliases
	};
};

export default plugin;
