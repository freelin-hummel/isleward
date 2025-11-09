import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,

	modal: true,
	hasClose: true,

	isFlex: true,

	hotkeyToOpen: 'h',

	postRender () {
		this.onEvent('onShowHelp', this.toggle.bind(this));

		this.on('.toslink', 'click', this.redirect.bind(this));
	},

	redirect (e) {
		let currentLocation = $(e.currentTarget).attr('location');
		window.open(currentLocation, '_blank');
	}
};
