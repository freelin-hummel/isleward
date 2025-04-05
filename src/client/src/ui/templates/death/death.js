import events from '../../../js/system/events';
import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,

	modal: true,
	centered: true,

	postRender () {
		this.onEvent('onDeath', this.onDeath.bind(this));

		this.find('.btn-logout').on('click', this.onLogout.bind(this));
		this.find('.btn-respawn').on('click', this.performRespawn.bind(this));
	},

	onLogout () {
		$('.uiMainMenu').data('ui').charSelect();
	},

	performRespawn () {
		events.emit('onHideOverlay', this.el);
		this.hide(true);

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'stats',
				method: 'respawn',
				data: {}
			}
		});
	},

	hide (force) {
		if (!force)
			return;

		this.shown = false;
		this.el.hide();
	},

	doShow () {
		this.show();
		events.emit('onShowOverlay', this.el);
	},

	onDeath (eventObj) {
		if (!eventObj.source)
			this.find('.msg').html('You are dead.');
		else
			this.find('.msg').html(`You were killed by [ <div class="inner">${eventObj.source}</div> ].`);

		this.find('.penalty')
			.html('you lost ' + eventObj.xpLoss + ' experience')
			.show();

		if (!eventObj.xpLoss)
			this.find('.penalty').hide();

		this.doShow();
	}
};
