const events = require('../../misc/events');
const profanities = require('../../misc/profanities');
const canChat = require('./canChat');

const getChatStyles = async obj => {
	const msgEvent = {
		username: obj.account,
		tagPrefix: null,
		tagSuffix: null,
		tags: [],
		emojiTag: null,
		namePrefix: '',
		nameSuffix: '',
		msgStyle: null,
		obj
	};

	await events.emit('onBeforeGetChatStyles', msgEvent);

	return {
		class: msgEvent.msgStyle ?? 'color-grayB',
		emojiTag: msgEvent.emojiTag,
		namePrefix: msgEvent.namePrefix,
		nameSuffix: msgEvent.nameSuffix,
		tagPrefix: msgEvent.tagPrefix,
		tagSuffix: msgEvent.tagSuffix,
		tags: msgEvent.tags
	};
};

const sendRegularMessage = async ({ obj }, msg) => {
	const finalMessage = msg.data.message;

	const item = msg.data.item ? JSON.parse(JSON.stringify(msg.data.item).replace(/(<([^>]+)>)/ig, '')) : undefined;

	const eventMsg = {
		event: 'onGetMessages',
		data: {
			messages: [{
				message: finalMessage,
				item,
				type: 'chat',
				source: obj.name,
				...(await getChatStyles(obj))
			}]
		}
	};

	cons.emit('event', eventMsg);
};

const sendPartyMessage = async ({ party, obj }, msg) => {
	if (!party) {
		obj.socket.emit('events', {
			onGetMessages: [{
				messages: [{
					class: 'color-redA',
					message: 'you are not in a party',
					type: 'info'
				}]
			}]
		});

		return;
	}

	let charname = obj.auth.charname;
	let message = msg.data.message;

	const chatStyles = await getChatStyles(obj);

	party.forEach(p => {
		let player = cons.players.find(c => c.id === p);

		player.socket.emit('events', {
			onGetMessages: [{
				messages: [{
					message,
					type: 'chat',
					subType: 'party',
					source: charname,
					...chatStyles
				}]
			}]
		});
	});
};

const sendCustomChannelMessage = (cpnSocial, msg) => {
	const { obj } = cpnSocial;

	const { data: { message, subType: channel } } = msg;

	if (!channel)
		return;

	if (channel !== 'trade' && !cpnSocial.isInChannel(obj, channel)) {
		obj.socket.emit('events', {
			onGetMessages: [{
				messages: [{
					class: 'color-redA',
					message: 'You are not currently in that channel',
					type: 'info'
				}]
			}]
		});
		return;
	}

	const eventData = {
		onGetMessages: [{
			messages: [{
				class: 'color-grayB',
				message,
				type: 'chat',
				subType: 'custom',
				channel: channel.trim(),
				source: obj.name
			}]
		}]
	};

	cons.players.forEach(p => {
		if (channel !== 'trade' && !cpnSocial.isInChannel(p, channel))
			return;

		p.socket.emit('events', eventData);
	});
};

const sendPrivateMessage = ({ obj: { name: sourceName, socket } }, msg) => {
	const { data: { message, subType: targetName } } = msg;

	if (targetName === sourceName)
		return;

	let target = cons.players.find(p => p.name === targetName);
	if (!target)
		return;

	socket.emit('event', {
		event: 'onGetMessages',
		data: {
			messages: [{
				class: 'color-yellowB',
				message,
				type: 'chat',
				subType: 'privateOut',
				source: sourceName,
				target: targetName
			}]
		}
	});

	target.socket.emit('event', {
		event: 'onGetMessages',
		data: {
			messages: [{
				class: 'color-yellowB',
				message,
				type: 'chat',
				subType: 'privateIn',
				source: sourceName,
				target: targetName
			}]
		}
	});
};

const sendErrorMsg = (cpnSocial, msgString) => {
	cpnSocial.sendMessage(msgString, 'color-redA');
};

module.exports = async (cpnSocial, msg) => {
	const { data: msgData } = msg;

	if (msgData.item)
		msgData.message = msgData.item.name;

	if (!msgData.message && !msgData.item)
		return;

	const { obj, maxChatLength, messageHistory } = cpnSocial;
	const sendError = sendErrorMsg.bind(null, cpnSocial);

	msgData.message = msgData.message
		.split('<')
		.join('&lt;')
		.split('>')
		.join('&gt;');

	if (!msgData.message)
		return;

	if (msgData.message.trim() === '')
		return;

	let messageString = msgData.message;
	if (messageString.length > maxChatLength)
		return;

	let time = +new Date();
	messageHistory.spliceWhere(h => ((time - h.time) > 5000));

	if (messageHistory.length) {
		if (messageHistory[messageHistory.length - 1].msg === messageString) {
			sendError('You have already sent that message');

			return;
		} else if (messageHistory.length >= 3) {
			sendError('You are sending too many messages');

			return;
		}
	}

	cpnSocial.onBeforeChat(msgData);
	if (msgData.ignore)
		return;

	if (!msgData.item && !profanities.isClean(messageString)) {
		sendError('Profanities detected in message. Blocked.');

		return;
	}

	if (!canChat(obj, time)) {
		sendError('Your character needs to be played for at least 3 minutes or be at least level 3 to be able to send messages in chat.');

		return;
	}

	let msgEvent = {
		source: obj.auth.charname,
		sourceObj: obj,
		msg: messageString,
		type: msgData.type,
		subType: msgData.subType,
		ignore: false,
		error: null
	};
	events.emit('onBeforeSendMessage', msgEvent);

	if (msgEvent.ignore) {
		if (msgEvent.error)
			sendError(msgEvent.error);

		return;
	}

	messageHistory.push({
		msg: msgEvent.msg,
		time: time
	});

	const messageHandler = {
		global: sendRegularMessage,
		custom: sendCustomChannelMessage,
		direct: sendPrivateMessage,
		party: sendPartyMessage
	}[msgData.type];

	if (!messageHandler)
		return;

	await messageHandler(cpnSocial, msg);
};
