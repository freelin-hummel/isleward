import client from '../../../js/system/client';
import uiFactory from '../../factory';
import template from './template.html?raw';
import './styles.css';
import renderer from '../../../js/rendering/renderer';
import globals from '../../../js/system/globals';

export default {
	tpl: template,
	centered: true,

	beforeRender () {
		const { clientConfig: { logoPath } } = globals;
		if (!logoPath)
			return;

		const tempEl = $(this.tpl);
		tempEl.find('.logo').attr('src', logoPath);

		this.tpl = tempEl.prop('outerHTML');
	},

	postRender () {
		this.onEvent('onHandshake', this.onHandshake.bind(this));

		this.on('.btnLogin', 'click', this.onLoginClick.bind(this));
		this.on('.btnRegister', 'click', this.onRegisterClick.bind(this));

		this.find('.extra, .version')
			.appendTo($('<div class="uiLoginExtra"></div>')
				.appendTo('.ui-container'));

		$('.uiLoginExtra').find('.btn').on('click', this.redirect.bind(this));

		$('.news, .version').on('click', this.redirect.bind(this));

		this.find('input')
			.on('keyup', this.onKeyDown.bind(this))
			.eq(0).focus();

		renderer.buildTitleScreen();
	},

	redirect (e) {
		let currentLocation = $(e.currentTarget).attr('location');
		window.open(currentLocation, '_blank');
	},

	onKeyDown (e) {
		if (e.keyCode === 13)
			this.onLoginClick();
	},
	onHandshake () {
		this.show();
	},

	onLoginClick () {
		if (this.el.hasClass('disabled'))
			return;

		this.find('.details').removeClass('disabled');

		client.request({
			cpn: 'auth',
			method: 'login',
			data: {
				username: this.val('.txtUsername'),
				password: this.val('.txtPassword')
			},
			callback: this.onLogin.bind(this)
		});
	},
	onLogin (res) {
		this.el.removeClass('disabled');

		if (!res) {
			uiFactory.preload();

			$('.uiLoginExtra').remove();
			this.destroy();
		} else {
			this.find('.details').removeClass('disabled');

			this.el.find('.message').html(res);
		}
	},

	onRegisterClick () {
		this.el.addClass('disabled');

		client.request({
			cpn: 'auth',
			method: 'register',
			data: {
				username: this.val('.txtUsername'),
				password: this.val('.txtPassword')
			},
			callback: this.onLogin.bind(this)
		});
	}
};
