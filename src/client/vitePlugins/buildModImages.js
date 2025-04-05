 

import path from 'path';
import fs from 'fs';
import fg from 'fast-glob';

function gatherModImages (modsRoot) {
	const matchedFiles = fg.sync('**/images/*.png', { cwd: modsRoot });
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

function buildModImagesFileContent (aliases) {
	const objectEntries = [];

	for (const aliasKey of Object.keys(aliases)) {
		const absolutePath = aliases[aliasKey];
		const fileContent = fs.readFileSync(absolutePath);
		const base64 = fileContent.toString('base64');

		objectEntries.push(`  "${aliasKey}": "${base64}"`);
	}

	return `
		export default {
		${objectEntries.join(',\n')}
		};
	`;
}

const pluginImages = () => {
	const modsRoot = path.resolve(__dirname, '../../server/mods');
	const dynamicAliases = gatherModImages(modsRoot);

	const tempDir = path.join(__dirname, '.temp');
	fs.mkdirSync(tempDir, { recursive: true });

	const tempFile = path.join(tempDir, 'modImages.js');
	const modImagesContent = buildModImagesFileContent(dynamicAliases);
	fs.writeFileSync(tempFile, modImagesContent, 'utf-8');

	return {
		tempFile: tempFile.replace(/\\/g, '/'),
		dynamicAliases
	};
};

export default pluginImages;
