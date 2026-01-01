import events from './events';
import { io } from 'socket.io-client';

const serverUrl = import.meta.env.VITE_SERVER_URL;

let client = {
	doneConnect: false,

	async init () {
		return new Promise(res => {
			const socketArgs = [{
				transports: ['websocket']
			}];

			if (window.location.hostname === 'localhost')
				socketArgs.splice(0, 0, 'http://localhost:5000');
			else if (serverUrl)
				socketArgs.splice(0, 0, serverUrl);

			this.socket = io(...socketArgs);

			this.socket.on('connect', this.onConnected.bind(this, res));
			this.socket.on('handshake', this.onHandshake.bind(this));
			this.socket.on('event', this.onEvent.bind(this));
			this.socket.on('events', this.onEvents.bind(this));
			this.socket.on('dc', this.onDisconnect.bind(this));

			Object.entries(this.processAction).forEach(([k, v]) => {
				this.processAction[k] = v.bind(this);
			});
		});
	},

	onConnected (onReady) {
		if (this.doneConnect)
			this.onDisconnect();
		else
			this.doneConnect = true;

		if (onReady)
			onReady();
	},

	onDisconnect () {
		window.location.reload();
	},

	onHandshake () {
		events.emit('onHandshake');
		this.socket.emit('handshake');
	},

	request (msg) {
		this.socket.emit('request', msg, msg.callback);
	},

	processAction: {
		default (eventName, msgs) {
			msgs.forEach(m => events.emit(eventName, m));
		},

		rezoneStart () {
			events.emit('rezoneStart');

			events.emit('destroyAllObjects');
			events.emit('resetRenderer');
			events.emit('resetPhysics');
			events.emit('clearUis');

			client.request({
				threadModule: 'rezoneManager',
				method: 'clientAck',
				data: {}
			});
		},

		getMap (eventName, msgs) {
			events.emit('onBuildIngameUis');
			events.emit('onGetMap', msgs[0]);
		},

		onGetObject (eventName, msgs) {
			const prepend = msgs.filter(o => o.self);
			_.spliceWhere(msgs, o => prepend.some(p => p === o));
			msgs.unshift.apply(msgs, prepend);

			this.processAction.default(eventName, msgs);
		}
	},

	onEvent ({ event: eventName, data: eventData }) {
		const handler = this.processAction[eventName] || this.processAction.default;

		handler(eventName, [eventData]);
	},

	onEvents (response) {
		for (let eventName in response) {
			const eventMsgs = response[eventName];

			const handler = this.processAction[eventName] || this.processAction.default;

			handler(eventName, eventMsgs);
		}
	}
};

export default client;
