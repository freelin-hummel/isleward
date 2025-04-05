// Imports
const http = require('http');
const socketIo = require('socket.io');
const express = require('express');

const rest = require('../security/rest');

const {
	port = 5000,
	startupMessage = 'Ready: Server'
} = require('../config/serverConfig');

const onConnection = require('./onConnection');

// Methods
const init = async () => {
	return new Promise(resolve => {
		const app = express();
		const server = http.createServer(app);
		const socketServer = socketIo(server, { transports: ['websocket'] });

		global.cons.sockets = socketServer.sockets;

		rest.init(app);

		socketServer.on('connection', onConnection);

		server.listen(port, () => {
			_.log(startupMessage);
			resolve();
		});
	});
};

// Exports
module.exports = { init };
