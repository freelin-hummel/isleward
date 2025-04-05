import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,

	modal: true,
	hasClose: true,

	isFlex: true,

	postRender () {
		this.onEvent('onKeyDown', this.onKeyDown.bind(this));
		this.onEvent('onShowHelp', this.toggle.bind(this));

		this.on('.toslink', 'click', this.redirect.bind(this));
	},

	onKeyDown (key) {
		if (key === 'h')
			this.toggle();
	},

	redirect (e) {
		let currentLocation = $(e.currentTarget).attr('location');
		window.open(currentLocation, '_blank');
	}
};
