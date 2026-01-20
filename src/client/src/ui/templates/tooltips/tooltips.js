import './styles.css';

// Template HTML as string literals
const template = `<div class="uiTooltips">
	<div class="tooltip hasBorderShadow"></div>
</div>`;

export default {
	tpl: template,
	type: 'tooltips',

	tooltip: null,
	el: null,

	hoverEl: null,

	postRender: function () {
		this.tooltip = this.el.find('.tooltip');

		this.onEvent('onShowTooltip', this.onShowTooltip.bind(this));
		this.onEvent('onHideTooltip', this.onHideTooltip.bind(this));
	},

	onHideTooltip: function (el, force = false) {
		if (!force && this.hoverEl !== el)
			return;

		this.hoverEl = null;
		this.tooltip.hide();
	},

	onShowTooltip: function (text, el, pos, width, bottomAlign, rightAlign, zIndex) {
		this.hoverEl = el;

		this.tooltip
			.html(text)
			.attr('class', 'tooltip hasBorderShadow');

		this.tooltip
			.show();

		if (width)
			this.tooltip.width(width);

		if (pos) {
			if (bottomAlign)
				pos.y -= this.tooltip.height();
			if (rightAlign)
				pos.x -= this.tooltip.width();

			this.tooltip.css({
				left: pos.x,
				top: pos.y
			});
		}

		if ((zIndex) && (zIndex !== 'auto'))
			this.tooltip.css('z-index', zIndex);
		else
			this.tooltip.css('z-index', '');
	}
};
