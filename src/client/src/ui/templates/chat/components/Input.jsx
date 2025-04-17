import { useEffect, useRef } from 'react';

import { getState as gs } from './props';

import handleKeyPress from './events/handleKeyPress';

import globals from 'client/js/system/globals';

const setMentionPopupHelper = () => {
	const { inputVisible, inputValue } = gs();

	if (inputVisible && inputValue) {
		const atIndex = inputValue.lastIndexOf('@');
		
		if (atIndex !== -1) {
			const searchText = inputValue.slice(atIndex + 1).toLowerCase();
			
			const filteredPlayers = globals.onlineList
				.filter(({ name: playerName }) => 
					playerName.toLowerCase().includes(searchText) &&
					playerName !== window.player.name
				)
				.map(({ name: playerName }) => playerName);
			
			if (filteredPlayers.length > 0) {
				gs('setMentionPopup', {
					visible: true,
					players: filteredPlayers,
					selectedIndex: 0,
					searchText
				});
			} else 
				gs('setMentionPopup', prev => ({ ...prev, visible: false }));
		} else 
			gs('setMentionPopup', prev => ({ ...prev, visible: false }));
	} else 
		gs('setMentionPopup', prev => ({ ...prev, visible: false }));
};

const MentionPopupComponent = () => {
	const mentionPopupRef = useRef(null);
	
	const { inputValue, inputVisible, mentionPopup, setMentionPopup, inputRef } = gs();

	useEffect(() => {
		gs('setMentionPopupRef', mentionPopupRef);
	}, [mentionPopupRef]);

	useEffect(setMentionPopupHelper, [inputValue, inputVisible, setMentionPopup]);

	if (!mentionPopup?.visible)
		return null;
	
	return (
		<div ref={mentionPopupRef} className="mention-popup">
			{mentionPopup.players.map((player, index) => (
				<div 
					key={player}
					className={`mention-item ${index === mentionPopup.selectedIndex ? 'selected' : ''}`}
					onClick={() => {
						const atIndex = inputValue.lastIndexOf('@');
						const newInputValue = inputValue.substring(0, atIndex + 1) + player + ' ';
						gs('setInputValue', newInputValue);
						setMentionPopup(prev => ({ ...prev, visible: false }));
						inputRef.current.focus();
					}}
					onMouseEnter={() => {
						setMentionPopup(prev => ({ ...prev, selectedIndex: index }));
					}}
				>
					{player}
				</div>
			))}
		</div>
	);
};

const Input = () => {
	const { inputVisible } = gs();

	const inputRef = useRef(null);

	useEffect(() => {
		gs('setInputRef', inputRef);
	}, [inputRef]);

	useEffect(() => {
		if (inputVisible && inputRef.current) 
			inputRef.current.focus();
	}, [inputVisible, inputRef]);

	if (!inputVisible)
		return null;

	const inputValue = gs('inputValue') ?? '';
	
	return (
		<div className="chat-input">
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={e => gs('setInputValue', e.target.value)}
				onKeyDown={handleKeyPress}
				onBlur={() => gs('setInputVisible', false)}
				placeholder="Type your message... (Use @ to mention players)"
				className="chat-input-with-settings"
			/>
			
			<MentionPopupComponent />
		</div>
	);
};

export default Input;
