//Config
const validModPatterns = ['.png', '/ui/', '/clientComponents/', '/audio/', '/clientModules/'];

//Methods
const appRoot = (req, res) => {
	res.sendFile('index.html', {}, err => {
		if (err)
			res.status(500).end(err.message);
	});
};

const appFile = (req, res) => {
	let root = req.url.split('/')[1];
	let file = req.params[0];
	file = file.replace('/' + root + '/', '');

	const validRequest = (
		root !== 'server' ||
		file.startsWith('clientComponents') ||
		(
			file.includes('mods/') &&
			validModPatterns.some(v => file.includes(v))
		)
	);

	if (!validRequest)
		return null;

	res.sendFile(file, {
		root: '../' + root
	}, err => {
		if (err)
			res.status(404).end(err.message);
	});
};

//Exports
module.exports = {
	appRoot,
	appFile
};
