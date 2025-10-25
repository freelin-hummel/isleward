import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';
import renderer from '../../../js/rendering/renderer';
import factory from '../../factory';
import client from '../../../js/system/client';
import sound from '../../../js/sound/sound';

export default {
	tpl: template,

	modal: true,

	hasClose: true,

	postRender () {
		this.onEvent('onCloseOptions', this.show.bind(this));
		this.onEvent('onShowMainMenu', this.show.bind(this));

		this.el.find('.btnOptions').on('click', this.openOptions.bind(this));
		this.el.find('.btnCharSelect').on('click', this.charSelect.bind(this));
		this.el.find('.btnLogOut').on('click', this.logOut.bind(this));
		this.el.find('.btnPatreon').on('click', this.patreon.bind(this));

		this.onEvent('onResize', this.onResize.bind(this));
	},

	openOptions () {
		if (isMobile)
			this.el.removeClass('active');

		events.emit('onOpenOptions');
	},

	patreon () {
		window.open('https://patreon.com/bigbadwaffle', '_blank');
	},

	charSelect () {
		this.el.addClass('disabled');

		client.request({
			module: 'cons',
			method: 'unzone',
			callback: this.onCharSelect.bind(this)
		});
	},

	onCharSelect () {
		events.emit('destroyAllObjects');
		events.emit('resetRenderer');
		events.emit('resetPhysics');

		renderer.buildTitleScreen();

		events.emit('onShowCharacterSelect');

		factory.exitGame();

		factory.build('characters', {});
	},

	onResize () {
		let isFullscreen = (window.innerHeight === screen.height);
		if (isFullscreen)
			this.el.find('.btnScreen').html('Windowed');
		else
			this.el.find('.btnScreen').html('Fullscreen');
	},

	onAfterShow () {
		this.onResize();
	},

	beforeHide () {
		this.onResize();
	},

	logOut () {
		window.location.reload();
	},

	onKeyDown (key) {
		if (key === 'esc')
			this.toggle();
	}
};
