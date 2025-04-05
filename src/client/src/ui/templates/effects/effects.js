import template from './template.html?raw';
import './styles.css';
import templateEffect from './templateEffect.html?raw';

export default {
	tpl: template,

	icons: {},

	postRender () {
		this.onEvent('onGetEffectIcon', this.onGetEffectIcon.bind(this));
		this.onEvent('onRemoveEffectIcon', this.onRemoveEffectIcon.bind(this));
	},

	buildIcon (config) {
		let { icon, url } = config;

		if (!url)
			url = '../../../images/statusIcons.png';

		let imgX = icon[0] * -32;
		let imgY = icon[1] * -32;

		let html = templateEffect;
		let el = $(html).appendTo(this.el)
			.find('.inner')
			.css({ background: `url(${url}) ${imgX}px ${imgY}px` });

		return el.parent();
	},

	onGetEffectIcon (config) {
		let el = this.buildIcon(config);

		this.icons[config.id] = el;
	},

	onRemoveEffectIcon (config) {
		let el = this.icons[config.id];
		if (!el)
			return;

		el.remove();
		delete this.icons[config.id];
	}
};
