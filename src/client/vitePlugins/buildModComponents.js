 

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';

function gatherModAliases (modsRoot) {
	const matchedFiles = fg.sync('**/clientComponents/*.js', { cwd: modsRoot });

	const aliases = {};
	for (const folder of matchedFiles) {
		const absolutePath = path.join(modsRoot, folder).replace(/\\/g, '/');

		const newName = folder.split('/').pop();
		aliases[newName] = absolutePath;
	}

	return aliases;
}

function buildModUisFileContent (aliases) {
	const imports = [];
	const objectEntries = [];

	let index = 0;
	for (const aliasName of Object.keys(aliases)) {
		const varName = `mod_${index++}`;
		const absolutePath = aliases[aliasName];

		imports.push(`import * as ${varName} from '${absolutePath}';`);
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

	const tempFile = path.join(tempDir, 'modComponents.js');
	const modComponentsContent = buildModUisFileContent(dynamicAliases);
	fs.writeFileSync(tempFile, modComponentsContent, 'utf-8');

	return {
		tempFile: tempFile.replace(/\\/g, '/'),
		dynamicAliases
	};
};

export default plugin;
