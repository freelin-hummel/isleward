import { getState as gs } from '../props';

const onDoWhisper = playerName => {
	gs('setInputVisible', true);
	gs('setInputValue', `@${playerName} `);
};

export default onDoWhisper;
