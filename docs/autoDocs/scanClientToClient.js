/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
/* eslint-disable func-style */

const fs = require('fs');
const path = require('path');

function getAllFiles (dir, ignoreDirs = ['node_modules', '.git', 'dist']) {
	let files = [];
	const items = fs.readdirSync(dir);
	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) {
			if (!ignoreDirs.includes(item))
				files = files.concat(getAllFiles(fullPath, ignoreDirs));
		} else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx')))
			files.push(fullPath);
	}

	return files;
}

function parseArgs (str) {
	let args = [];
	let current = '';
	let brace = 0;
	let paren = 0;
	let bracket = 0;
	let inString = false;
	let stringChar = '';
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (!inString) {
			if (char === '"' || char === "'") {
				inString = true;
				stringChar = char;
				current += char;
			} else if (char === ',') {
				if (brace === 0 && paren === 0 && bracket === 0) {
					args.push(current.trim());
					current = '';
				} else
					current += char;
			} else {
				current += char;
				if (char === '{') brace++;
				else if (char === '}') brace--;
				else if (char === '(') paren++;
				else if (char === ')') paren--;
				else if (char === '[') bracket++;
				else if (char === ']') bracket--;
			}
		} else {
			current += char;
			if (char === stringChar && (i === 0 || str[i - 1] !== '\\'))
				inString = false;
		}
	}
	if (current.trim()) args.push(current.trim());

	return args;
}

function dedent (str) {
	const lines = str.split('\n');
	const indents = lines.map(l => l.match(/^(\s*)/)[1].length).filter(len => len > 0);
	if (!indents.length) return str;
	const minIndent = Math.min(...indents);

	return lines.map(l => {
		const indentLen = l.match(/^(\s*)/)[1].length;
		const content = l.slice(Math.min(indentLen, minIndent));

		return content;
	}).join('\n');
}

function extractEmit (content, file) {
	const results = [];
	let i = 0;
	while (i < content.length) {
		const callStart = content.indexOf('.emit(', i);
		if (callStart === -1) break;
		let parenCount = 0;
		let braceCount = 0;
		let bracketCount = 0;
		let inString = false;
		let stringChar = '';
		let end = -1;
		for (let j = callStart; j < content.length; j++) {
			const char = content[j];
			if (!inString) {
				if (char === '"' || char === "'") {
					inString = true;
					stringChar = char;
				} else if (char === '(')
					parenCount++;
				else if (char === ')') {
					parenCount--;
					if (parenCount === 0) {
						end = j + 1;
						break;
					}
				} else if (char === '{')
					braceCount++;
				else if (char === '}')
					braceCount--;
				else if (char === '[')
					bracketCount++;
				else if (char === ']')
					bracketCount--;
			} else if (char === stringChar && (j === 0 || content[j - 1] !== '\\'))
				inString = false;
		}
		if (end !== -1) {
			const call = content.substring(callStart, end);
			const argsStr = call.substring('.emit('.length, call.length - 1);
			const args = parseArgs(argsStr);
			if (args.length >= 1) {
				const first = args[0].replace(/^["']|["']$/g, '');
				const second = args[1] || '';
				results.push({
					first,
					second,
					file
				});
			}
		}
		i = end || (callStart + 1);
	}

	return results;
}

const files = getAllFiles('src/client');
let allResults = [];

console.log(`Processing ${files.length} files...`);

for (const file of files) {
	if (file.includes('scanClientToClient.js')) continue;
	console.log(`Processing ${file}...`);
	const content = fs.readFileSync(file, 'utf8');
	const results = extractEmit(content, file);
	console.log(`Found ${results.length} calls in ${file}`);
	results.forEach(r => allResults.push(r));
}

let events = {};
for (const r of allResults) {
	const key = r.first;
	if (!events[key]) {
		events[key] = {
			second: r.second,
			files: []
		};
	}
	if (!events[key].files.includes(r.file))
		events[key].files.push(r.file);
}

let output = '# Events: Client -> Client\n\n';
for (const eventName in events) {
	const e = events[eventName];
	output += `## Event: ${eventName}\n`;
	output += `${dedent(e.second)}\n\n`;
	output += `* Files\n${e.files.map(f => '  - ' + f).join('\n')}\n`;
	output += '_____________________________________\n\n';
}

fs.writeFileSync('docs/autoDocs/output/clientToClient.txt', output);

console.log('Done. Results in docs/autoDocs/output/clientToClient.txt');
