//System
import { useEffect, useRef } from 'react';

//CWD
import events from 'client/js/system/events';

//Components, Helpers and Events
import SettingsOverlay, { toggleSettings, closeSettings } from './SettingsOverlay';

import onKeyDown from './events/onKeyDown';
import onGetMessages from './events/onGetMessages';
import onGetParty from './events/onGetParty';
import onPartyDisband from './events/onPartyDisband';
import onJoinChannel from './events/onJoinChannel';
import onGetPlayer from './events/onGetPlayer';
import onLeaveChannel from './events/onLeaveChannel';
import onDoWhisper from './events/onDoWhisper';
import mouseDown from './events/mouseDown';

import propSpec from './props';

//Events
const eventHandlers = {
	onKeyDown,
	onGetMessages,
	onGetParty,
	onPartyDisband,
	onJoinChannel,
	onLeaveChannel,
	onGetPlayer,
	onDoWhisper,
	mouseDown
};

const onMount = props => {
	[
		'onKeyDown',
		'onGetMessages',
		'onGetParty',
		'onPartyDisband',
		'onJoinChannel',
		'onLeaveChannel',
		'onGetPlayer',
		'onDoWhisper',
		'mouseDown'
	].forEach(e => events.on(e, eventHandlers[e]));
};

//Component
const ChatContainer = window.opusUi.ExternalComponent(({ children, getExternalState, state }) => {
	const {
		isResizing,
		inputVisible,
		chatSettings,
		showSettings,
		setResizeRef
	} = state;

	const resizeRef = useRef(null);

	useEffect(() => {
		setResizeRef(resizeRef);
	}, [resizeRef]);

	useEffect(onMount, []);

	// Apply dynamic styles based on settings
	useEffect(() => {
		// Create a style element for dynamic CSS
		const styleElement = document.createElement('style');
		styleElement.id = 'chat-dynamic-styles';
		
		// Set the CSS content with the current opacity and size values
		styleElement.textContent = `
			.uiChat {
				background-color: rgba(55, 48, 65, ${chatSettings.defaultOpacity});
				pointer-events: ${chatSettings.pointerEventsMode ? 'auto' : 'none'};
				width: ${chatSettings.width}px !important;
				height: ${chatSettings.height}px !important;
			}
			.uiChat.active {
				background-color: rgba(55, 48, 65, ${chatSettings.activeOpacity});
				pointer-events: auto;
			}
			.uiChat:not(.active):hover {
				background-color: rgba(55, 48, 65, ${chatSettings.hoverOpacity});
				pointer-events: auto;
			}
		`;

		// Add the style element to the document head
		document.head.appendChild(styleElement);
		
		// Clean up function to remove the style element when component unmounts
		return () => {
			const existingStyle = document.getElementById('chat-dynamic-styles');
			if (existingStyle) 
				document.head.removeChild(existingStyle);
		};
	}, [chatSettings]);

	return (
		<div 
			ref={resizeRef}
			className={`
				uiChat ${inputVisible ? 'active' : ''}
				${isResizing ? 'resizing' : ''}
				${chatSettings.pointerEventsMode || inputVisible ? 'showSettings' : ''}
			`}
			style={{
				width: `${chatSettings.width}px`,
				height: `${chatSettings.height}px`
			}}
		>
			{children}
			<button 
				className="settings-button" 
				onClick={toggleSettings}
			>
				⚙️
			</button>
			{showSettings && (
				<SettingsOverlay onClose={closeSettings} />
			)}
		</div>
	);
}, { propSpec });

export default ChatContainer;
