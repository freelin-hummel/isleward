 

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';

function gatherModAudio (modsRoot) {
	const matchedFiles = fg.sync('**/audio/**/*.{ogg,mp3}', { cwd: modsRoot });
	const aliases = {};

	for (const file of matchedFiles) {
		const absolutePath = path.join(modsRoot, file).replace(/\\/g, '/');

		const gameSrcPath = path.resolve(modsRoot, '../..');
		const relPathFromGameSrc = path
			.relative(gameSrcPath, absolutePath)
			.replace(/\\/g, '/');

		aliases[relPathFromGameSrc] = absolutePath;
	}

	return aliases;
}

function buildModAudioFileContent (aliases) {
	const imports = [];
	const objectEntries = [];

	let index = 0;
	for (const aliasName of Object.keys(aliases)) {
		const absolutePath = aliases[aliasName];

		// We do a default import with ?url, so Vite bundles the file as an asset
		const varName = `soundUrl_${index++}`;

		imports.push(`import ${varName} from '${absolutePath}?url';`);
		// Now store that varName as the value for this "aliasKey"
		// so e.g. "server/mods/iwd-audio/audio/ui/keyPickUp.mp3" => the final built URL
		objectEntries.push(`  '${aliasName}': ${varName}`);
	}

	// Return code that forms a default export object
	return `
${imports.join('\n')}

export default {
${objectEntries.join(',\n')}
};`;
}

const pluginAudio = () => {
	const modsRoot = path.resolve(__dirname, '../../server/mods');
	const dynamicAliases = gatherModAudio(modsRoot);

	const tempDir = path.join(__dirname, '.temp');
	fs.mkdirSync(tempDir, { recursive: true });

	const tempFile = path.join(tempDir, 'modAudio.js');
	const modAudioContent = buildModAudioFileContent(dynamicAliases);
	fs.writeFileSync(tempFile, modAudioContent, 'utf-8');

	return {
		tempFile: tempFile.replace(/\\/g, '/'),
		dynamicAliases
	};
};

export default pluginAudio;
