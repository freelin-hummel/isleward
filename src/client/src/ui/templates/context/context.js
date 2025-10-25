import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';
import templateItem from './templateItem.html?raw';

export default {
	tpl: template,
	modal: true,

	config: null,

	_outside: null,

	postRender () {
		this.onEvent('onContextMenu', this.onContextMenu.bind(this));
		this.onEvent('onHideContextMenu', this.onMouseDown.bind(this));
		this.onEvent('mouseDown', this.onMouseDown.bind(this));
		this.onEvent('onUiKeyDown', this.onUiKeyDown.bind(this));

		// Close only on outside pointer down (capture so it runs first)
		this._outside = e => {
			if (!this.el.is(':visible')) return;
			if (this.el[0].contains(e.target)) return;
			this.onMouseDown(e);
		};
		document.addEventListener('pointerdown', this._outside, true);
	},

	destroy () {
		document.removeEventListener('pointerdown', this._outside, true);
	},

	onContextMenu (config, e) {
		this.config = config;

		const container = this.el.find('.list').empty();

		config.forEach((c, i) => {
			const text = (c.text || c);
			const { hotkey, suffix } = c;

			const row = $(templateItem.replace('$TEXT$', text)).appendTo(container);

			if (hotkey) row.find('.hotkey').html(`(${hotkey})`);
			else if (suffix) row.find('.hotkey').html(`${suffix}`);

			if (c.callback) {
				// prevent outside handler from firing for menu items
				row.on('pointerdown', ev => ev.stopPropagation());
				row.on('click', ev => {
					ev.stopPropagation();
					this.onClick(i, c.callback);
					events.emit('onClickContextItem');
				});
				row.on('touchstart', ev => {
					ev.stopPropagation();
					this.onClick(i, c.callback);
					events.emit('onClickContextItem');
				});
			} else {
				row.addClass('no-hover');
				if (text.includes('---')) row.addClass('divider');
			}
		});

		const pos = _.isIos()
			? { left: e.detail.clientX, top: e.detail.clientY }
			: { left: e.clientX, top: e.clientY };

		pos['max-height'] = window.innerHeight - pos.top - 10;

		this.el.css(pos).show();
	},

	onClick (index, callback) {
		this.el.hide();
		callback();
	},

	onMouseDown (e) {
		if (!this.el.is(':visible') || (e && e.button === 2)) return;
		this.config = null;
		this.el.hide();
	},

	onUiKeyDown (keyEvent) {
		if (!this.config || !this.el.is(':visible'))
			return;

		const configEntry = this.config.find(({ hotkey }) => hotkey === keyEvent.key);
		if (!configEntry)
			return;

		configEntry.callback();
		keyEvent.consumed = true;
		this.el.hide();
	}
};
