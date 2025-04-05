import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,
	postRender () {
		if (isMobile) {
			this.el.on('click', this.toggleButtons.bind(this));
			this.find('.btnCollapse').on('click', this.toggleButtons.bind(this));
		}

		this.find('.btnHelp').on('click', this.handler.bind(this, 'onShowHelp'));
		this.find('.btnInventory').on('click', this.handler.bind(this, 'onShowInventory'));
		this.find('.btnEquipment').on('click', this.handler.bind(this, 'onShowEquipment'));
		this.find('.btnOnline').on('click', this.handler.bind(this, 'onShowOnline'));
		this.find('.btnReputation').on('click', this.handler.bind(this, 'onShowReputation'));
		this.find('.btnMainMenu').on('click', this.handler.bind(this, 'onShowMainMenu'));
		this.find('.btnPassives').on('click', this.handler.bind(this, 'onShowPassives'));

		this.onEvent('onGetPassivePoints', this.onGetPassivePoints.bind(this));
	},

	handler (e) {
		if (isMobile)
			this.el.removeClass('active');

		events.emit(e);

		return false;
	},

	onGetPassivePoints (points) {
		let el = this.find('.btnPassives .points');
		el
			.html('')
			.hide();

		if (points > 0) {
			el
				.html(points)
				.show();
		}
	},

	toggleButtons (e) {
		this.el.toggleClass('active');
		e.stopPropagation();
	}
};
