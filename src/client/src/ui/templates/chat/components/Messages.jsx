/* eslint-disable max-lines-per-function */

import events from 'client/js/system/events';

import { useEffect, useState, useRef } from 'react';

import resources from 'client/js/resources';

import { getState as gs } from './props';
import { handleContextMenu } from './ContextMenu';

const getFilteredMessages = () => {
	const { tabs, activeTab } = gs();

	// Find the active tab's filter criteria
	const activeFilter = tabs.find(tab => tab.id === activeTab);
	if (!activeFilter)
		return [];

	// Special case for Global tab - show all messages that don't match any other tab
	if (activeFilter.type === 'chat' && activeFilter.value === 'global') {
		return gs('messages').filter(message => {
			// Check if this message matches any other tab
			return !tabs.some(tab => {
				// Skip the Global tab itself
				if (tab.id === 'chat-global') return false;
				
				switch (tab.type) {
				case 'type':
					// e.g., 'info'
					return message.type === tab.value;
				case 'subType':
					// e.g., 'party'
					return message.subType === tab.value; 
				case 'privateConversation':
					return (
						message.subType === 'privateIn' &&
						message.source === tab.value
					) ||
					(
						message.subType === 'privateOut' &&
						message.target === tab.value
					);
				case 'channel':
					// Custom channel match
					return message.subType === 'custom' && message.channel === tab.value; 
				default:
					return false;
				}
			});
		});
	}

	// For other tabs, filter messages based on the active tab's criteria
	return gs('messages').filter(message => {
		switch (activeFilter.type) {
		case 'type':
			// e.g., 'info'
			return message.type === activeFilter.value; 
		case 'subType':
			// e.g., 'global', 'party'
			return message.subType === activeFilter.value; 
		case 'privateConversation':
			return (
				message.subType === 'privateIn' &&
				message.source === activeFilter.value
			) ||
			(
				message.subType === 'privateOut' &&
				message.target === activeFilter.value
			);
		case 'channel':
			// Custom channel match
			return message.subType === 'custom' && message.channel === activeFilter.value;
		default:
			return false;
		}
	});
};

const Messages = () => {
	const filteredMessages = getFilteredMessages();
	const [currentTooltip, setCurrentTooltip] = useState(null);
	const messagesEndRef = useRef(null);

	const { activeTab, messages } = gs();

	useEffect(() => {
		if (messagesEndRef.current) 
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
	}, [messages, messagesEndRef]);

	useEffect(() => {
		gs('setMessagesEndRef', messagesEndRef);
	}, [messagesEndRef]);

	// Add event listeners for shift key press/release
	useEffect(() => {
		const handleShiftKey = e => {
			// Only proceed if a tooltip is currently being shown
			if (currentTooltip && e.key === 'Shift') {
				// Re-emit the same event with the same arguments
				events.emit('onShowItemTooltip', 
					currentTooltip.item, 
					$.extend({}, currentTooltip.ttPos), 
					true, 
					currentTooltip.bottomAlign
				);
			}
		};

		// Add event listeners for both keydown and keyup
		window.addEventListener('keydown', handleShiftKey);
		window.addEventListener('keyup', handleShiftKey);

		// Clean up event listeners on component unmount
		return () => {
			window.removeEventListener('keydown', handleShiftKey);
			window.removeEventListener('keyup', handleShiftKey);
		};
	}, [currentTooltip]);

	const renderEmojiTag = emojiTag => {
		if (!emojiTag) return null;
		
		const imgX = (-emojiTag.sprite[0] * emojiTag.spriteSize);
		const imgY = (-emojiTag.sprite[1] * emojiTag.spriteSize);
		const backgroundPosition = `${imgX}px ${imgY}px`;

		let spritesheet = emojiTag.spritesheet;
		if (spritesheet.indexOf('server/mods') === 0)
			spritesheet = resources.sprites[spritesheet]?.src;
		
		return (
			<div 
				className="message-emoji-tag" 
				style={{
					background: `url("${spritesheet}") no-repeat scroll ${backgroundPosition} / auto`
				}}
			></div>
		);
	};

	const renderMessageContent = message => {
		// Determine if the message is in a tab
		const isInTab = activeTab !== 'chat-global';
		
		// Determine message type prefix [MT]
		let messageTypePrefix = '';
		let contextType = '';
		let contextValue = '';
		let messageSource = message.source;
		
		if (!isInTab) {
			if (message.subType === 'privateIn') {
				messageTypePrefix = `PM from ${message.source}`;
				messageSource = '';
			} else if (message.subType === 'privateOut') {
				messageTypePrefix = `PM to ${message.target}`;
				messageSource = '';
			} else if (message.subType === 'global') {
				messageTypePrefix = 'Global';
				contextType = 'subType';
				contextValue = 'global';
			} else if (message.subType === 'party') {
				messageTypePrefix = 'Party';
				contextType = 'subType';
				contextValue = 'party';
			} else if (message.subType === 'custom') {
				messageTypePrefix = message.channel;
				contextType = 'channel';
				contextValue = message.channel;
			} else if (message.type === 'info') {
				messageTypePrefix = 'Info';
				contextType = 'type';
				contextValue = 'info';
			}
		}
		
		// Create style object for color
		const style = {};
		if (message.class !== undefined) {
			const colorName = message.class
				.replace('chat-style-', '')
				.replace('color-', '');
			style.color = `var(--${colorName})`;
		}
		
		// Handle info messages differently
		if (message.type === 'info') {
			return (
				<>
					{!isInTab && messageTypePrefix && (
						<span
							className="message-prefix info"
							style={style}
							onContextMenu={e => handleContextMenu(e, message, 'type', 'info')}
						>
							[{messageTypePrefix}]
						</span>
					)}
					{!isInTab && messageTypePrefix && <>{'\u00A0'}</>}
					<span
						className="message-content info"
						style={style}
						onContextMenu={e => handleContextMenu(e, message, 'type', 'info')}
					>
						{message.message}
					</span>
				</>
			);
		}
		
		// For private messages, handle special context menu
		let standardContextMenu = null;
		let privateContextMenu = null;
		if (message.subType === 'privateIn' || message.subType === 'privateOut') {
			const isIncoming = message.subType === 'privateIn';
			const targetName = isIncoming ? message.source : message.target;
			privateContextMenu = e => handleContextMenu(e, message, 'privateConversation', targetName);
		} else if (message.type !== 'chat' || message.subType !== undefined)
			standardContextMenu = e => handleContextMenu(e, message, contextType, contextValue);

		// Render the message according to the format: [MT] ET TP T TS NP N NS: MC MI
		return (
			<>
				{/* [MT] - Message Type */}
				{!isInTab && messageTypePrefix && (
					<>
						<span
							className={`message-prefix ${message.subType || message.type}`}
							style={style}
							onContextMenu={standardContextMenu ?? privateContextMenu}
						>
							[{messageTypePrefix}]
							{messageSource ? '' : ':'}
						</span>
						{'\u00A0'}
					</>
				)}
				
				{/* ET - Emoji Tag */}
				{message.emojiTag && (
					<>
						{renderEmojiTag(message.emojiTag)}
						{'\u00A0'}
					</>
				)}
				<span className="message-body">
					{/* TP T TS - Tag Prefix, Tags, Tag Suffix */}
					{message.tags && message.tags.length > 0 && (
						<>
							<span className="message-tags" style={style}>
								{message.tagPrefix || ''}
								{message.tags.join(', ')}
								{message.tagSuffix || ''}
							</span>
							{'\u00A0'}
						</>
					)}
					
					{/* NP N NS: - Name Prefix, Name, Name Suffix */}
					{messageSource && (
						<>
							<span 
								className="message-source" 
								style={style}
								onContextMenu={standardContextMenu ?? privateContextMenu}
							>
								{message.namePrefix || ''}
								{messageSource}
								{message.nameSuffix || ''}:
							</span>
							{'\u00A0'}
						</>
					)}
					{/* MC - Message Content */}
					{!message.item && (
						<span className="message-content">
							{message.message}
						</span>
					)}
					{/* MI - Message Item */}
					{message.item && (
						<span
							className={`message-item q${message.item.quality}`}
							onMouseOver={e => {
								const ttPos = {
									x: ~~(e.clientX + 32),
									y: ~~(e.clientY)
								};

								const bottomAlign = !isMobile;

								// Store the current tooltip info in state for shift key handling
								setCurrentTooltip({
									item: message.item,
									ttPos,
									bottomAlign
								});

								events.emit('onShowItemTooltip', message.item, $.extend({}, ttPos), true, bottomAlign);
							}}
							onMouseLeave={e => {
								events.emit('onHideItemTooltip', message.item);
								// Clear the tooltip state when mouse leaves
								setCurrentTooltip(null);
							}}
						>
							{`{${message.item.name}}`}
						</span>
					)}
				</span>
			</>
		);
	};

	return (
		<div className="chat-messages">
			{filteredMessages.map(message => (
				<div 
					key={message.id} 
					className={`message message-${message.type} message-subtype-${message.subType || 'none'}`}
				>
					{renderMessageContent(message)}
				</div>
			))}
			<div ref={messagesEndRef} />
		</div>
	);
};

export default Messages;
