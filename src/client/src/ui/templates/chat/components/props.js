import browserStorage from 'client/js/system/browserStorage';

import loadSavedSettings from './helpers/loadSavedSettings';

const stateManager = window.opusUi.stateManager;

const gs = stateManager.getWgtState.bind(null, 'uiChat');
const ss = stateManager.setWgtState.bind(null, 'uiChat');

const setStateHelper = _key => {
	//This function is called onMount for a component as well as when we want to physically set a state
	//Due to this we need to get creative with the arguments
	const res = (key, valueOrFn) => {
		if (valueOrFn?.id === 'uiChat' || valueOrFn === undefined)
			return res.bind(null, key);

		const { [key]: _oldValue } = gs() ?? {};

		let newValue = valueOrFn;

		const type = typeof(valueOrFn);
		if (type === 'function')
			newValue = valueOrFn(_oldValue);

		ss({ [key]: newValue });
	};

	return res.bind(null, _key);
};

const props = {
	messages: { dft: [] },
	setMessages: {
		dft: () => valueOrFn => {
			if (valueOrFn === undefined)
				return;

			const { messages } = gs();

			const type = typeof(valueOrFn);

			if (type !== 'function') {
				if (Array.isArray(valueOrFn))
					messages.push(...valueOrFn);
				else
					messages.push(valueOrFn);

				ss({ messages });

				return;
			}

			ss({ messages: valueOrFn(messages) });
		}
	},

	inputValue: { dft: '' },
	setInputValue: { dft: setStateHelper('inputValue') },

	inputVisible: { dft: false },
	setInputVisible: { dft: setStateHelper('inputVisible') },

	showSettings: { dft: false },
	setShowSettings: { dft: setStateHelper('showSettings') },

	chatSettings: { dft: () => loadSavedSettings() },
	setChatSettings: {
		dft: () => valueOrFn => {
			if (valueOrFn === undefined)
				return;

			const { chatSettings: _chatSettings } = gs();

			let chatSettings = valueOrFn;

			const type = typeof(valueOrFn);
			if (type === 'function')
				chatSettings = valueOrFn(_chatSettings);

			ss({ chatSettings });

			browserStorage.set('chatSettings', JSON.stringify(chatSettings));
		}
	},

	activeTab: { dft: 'chat-global' },
	setActiveTab: { dft: setStateHelper('activeTab') },

	tabs: {
		dft: [
			{ id: 'chat-global', type: 'chat', value: 'global', closable: false },
			{ id: 'type-info', type: 'type', value: 'info' },
			{ id: 'channel-trade', type: 'channel', value: 'trade', closable: false }
		]
	},
	setTabs: { dft: setStateHelper('tabs') },

	contextMenu: {
		dft: {
			visible: false,
			x: 0,
			y: 0,
			messageId: null,
			targetType: null,
			targetValue: null
		}
	},
	setContextMenu: { dft: setStateHelper('contextMenu') },

	mentionPopup: {
		dft: {
			visible: false,
			players: [],
			selectedIndex: 0,
			searchText: ''
		}
	},
	setMentionPopup: { dft: setStateHelper('mentionPopup') },

	isResizing: { dft: false },
	setIsResizing: { dft: setStateHelper('isResizing') },

	resizeType: { dft: null },
	setResizeType: { dft: setStateHelper('resizeType') },

	inputRef: { dft: null },
	setInputRef: { dft: setStateHelper('inputRef') },

	mentionPopupRef: { dft: null },
	setMentionPopupRef: { dft: setStateHelper('mentionPopupRef') },

	messagesEndRef: { dft: null },
	setMessagesEndRef: { dft: setStateHelper('messagesEndRef') },

	resizeRef: { dft: null },
	setResizeRef: { dft: setStateHelper('resizeRef') }
};

export const getState = (key, cb) => {
	const state = stateManager.getWgtState('uiChat');

	if (!key)
		return state;

	const { [key]: res } = state;

	if (typeof(res) === 'function')
		return res(cb);

	return res;
};

export default props;
