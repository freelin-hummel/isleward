import buildTooltip from './buildTooltip/buildTooltip';
import './styles.css';
import template from './template.html?raw';
import events from '../../../js/system/events';

export default {
	tpl: template,
	type: 'tooltipItem',

	tooltip: null,
	item: null,

	postRender () {
		this.tooltip = this.el.find('.tooltip');

		this.onEvent('onShowItemTooltip', this.onShowItemTooltip.bind(this));
		this.onEvent('onHideItemTooltip', this.onHideItemTooltip.bind(this));
	},

	showWorth (canAfford) {
		this.tooltip.find('.worth').show();

		if (!canAfford)
			this.tooltip.find('.worth').addClass('no-afford');
	},

	onShowItemTooltip (item, pos, canCompare, bottomAlign) {
		this.removeButton();

		const emBeforeBuildItemTooltip = {
			item,
			pos,
			canCompare,
			bottomAlign,
			customLineBuilders: {}
		};
		events.emit('beforeBuildItemTooltip', emBeforeBuildItemTooltip);

		const html = buildTooltip(this, emBeforeBuildItemTooltip);

		this.item = item;

		const el = this.tooltip;
		el.html(html);
		el.css({ display: 'flex' });

		if (pos) {
			if (bottomAlign)
				pos.y -= el.height();

			//correct tooltips that are appearing offscreen
			// arbitrary constant -30 is there to stop resize code
			// completely squishing the popup
			if ((pos.x + el.width()) > window.innerWidth)
				pos.x = window.innerWidth - el.width() - 30;

			if ((pos.y + el.height()) > window.innerHeight)
				pos.y = window.innerHeight - el.height() - 30;

			el.css({
				left: pos.x,
				top: pos.y
			});
		}

		events.emit('onBuiltItemTooltip', this.tooltip);
	},

	onHideItemTooltip (item) {
		if (
			(!this.item) ||
				(
					(this.item !== item) &&
					(this.item.refItem) &&
					(this.item.refItem !== item)
				)
		)
			return;

		this.item = null;
		this.tooltip.hide();

		this.removeButton();
	},

	addButton (label, cb) {
		let tt = this.tooltip;
		let pos = tt.offset();
		let width = tt.outerWidth();
		let height = tt.outerHeight();

		$(`<div class='btn'>${label}</div>`)
			.appendTo(this.el)
			.on('click', cb)
			.css({
				width,
				left: pos.left,
				top: pos.top + height
			});
	},

	beforeHide () {
		this.removeButton();
	},

	removeButton () {
		this.find('.btn').remove();
	}
};
