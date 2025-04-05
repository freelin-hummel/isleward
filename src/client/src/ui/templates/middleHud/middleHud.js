import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,

	postRender () {
		this.onEvent('onGetSelfCasting', this.onGetCasting.bind(this));

		if (isMobile) {
			this.onEvent('onGetServerActions', this.onGetServerActions.bind(this));
			this.find('.btnGather').on('click', this.gather.bind(this));
		}

		this.find('.casting').css({
			width: `${scale}px`,
			height: `${scaleMult}px`,
			marginTop: `calc((${scale}px / 2) + ${scaleMult}px)`
		});

		this.find('.btnGather').css({ marginTop: `calc(${scale}px` });
	},

	onGetCasting (casting) {
		let el = this.find('.casting');

		if ((casting === 0) || (casting === 1))
			el.hide();
		else {
			el
				.show()
				.find('.bar')
				.width((casting * 100) + '%');
		}
	},

	gather () {
		let btn = this.find('.btnGather');
		let action = btn.data('action');
		if (action) {
			//Server actions use keyUp
			events.emit('onKeyUp', action.key);
		} else
			events.emit('onKeyDown', 'g');
	},

	onGetServerActions (actions) {
		let btn = this.find('.btnGather').hide().data('action', null);

		let firstAction = actions[0];
		if (!firstAction)
			return;

		btn
			.data('action', firstAction)
			.show();
	}
};
