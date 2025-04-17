import { getState as gs } from '../props';

import input from 'client/js/input';

const onKeyDown = key => {
	if (key === 'enter') {
		gs('setInputVisible', true);

		input.fakeKeyUp('enter');
	}
};

export default onKeyDown;
