import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,

	focusEl: null,
	lastZIndex: 0,

	postRender () {
		events.on('onShowOverlay', this.onShowOverlay.bind(this));
		events.on('onHideOverlay', this.onHideOverlay.bind(this));
	},

	onShowOverlay (focusEl) {
		this.focusEl = focusEl;
		this.lastZIndex = focusEl.css('z-index');
		focusEl.css('z-index', ~~this.el.css('z-index') + 1);
		this.show();
	},

	onHideOverlay (focusEl) {
		if (!this.focusEl)
			return;

		if (focusEl[0] !== this.focusEl[0])
			return;

		this.focusEl.css('z-index', this.lastZIndex);
		this.hide();
	}
};
