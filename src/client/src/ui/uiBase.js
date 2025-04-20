import events from '../js/system/events';

export default {
	centeredX: false,
	centeredY: false,

	el: null,
	shown: true,

	eventCallbacks: {},

	render () {
		let container = '.ui-container';
		if (this.container)
			container += ' > ' + this.container;

		if (this.beforeRender)
			this.beforeRender();

		this.el = $(this.tpl)
			.appendTo(container)
			.data('ui', this);

		this.el.on('mouseenter', this.onMouseEnter.bind(this, true));
		this.el.on('mouseleave', this.onMouseEnter.bind(this, false));

		if (this.modal)
			this.el.addClass('modal');

		if (this.hasClose)
			this.buildClose();

		if (this.postRender)
			this.postRender();

		if (this.centered) {
			this.centeredX = true;
			this.centeredY = true;
		}

		if ((this.centeredX) || (this.centeredY))
			this.center(this.centeredX, this.centeredY);

		this.registerUiEvents();

		this.shown = this.el.is(':visible');

		events.emit('onAfterRenderUi', { ui: this });
	},

	registerUiEvents () {
		this.find('.btn').on('click', events.emit.bind(events, 'onClickButton'));
		this.find('.tab').on('click', events.emit.bind(events, 'onClickTab'));
	},

	onMouseEnter (enter) {
		events.emit('onUiHover', enter);
	},

	on (el, eventName, callback) {
		if (typeof (el) === 'string')
			el = this.find(el);
		else
			el = $(el);

		el.on(eventName, function (e) {
			callback(e, eventName);
		});
	},

	find (selector) {
		return this.el.find(selector);
	},

	center (x, y) {
		if (x !== false)
			x = true;
		if (y !== false)
			y = true;

		this.centeredX = x;
		this.centeredY = y;

		let el = this.el;
		let pat = el.parent();
		if (!pat[0])
			return;

		let posX = ~~((pat.width() / 2) - (el.width() / 2));
		let posY = ~~((pat.height() / 2) - (el.height() / 2));

		el.css('position', 'absolute');
		if (x)
			el.css('left', posX);
		if (y)
			el.css('top', posY);
	},

	show () {
		if (this.shown)
			return;

		if (this.modal) {
			//Close any other open modal
			$('.modal').toArray().forEach(el => {
				const ui = $(el).data('ui');
				if (ui.shown)
					ui.hide();
			});
		}

		this.shown = true;
		if (this.isFlex)
			this.el.css('display', 'flex');
		else
			this.el.show();

		if (this.onAfterShow)
			this.onAfterShow();

		if ((this.centeredX) || (this.centeredY))
			this.center(this.centeredX, this.centeredY);

		events.emit('onShowUi', this);
	},

	hide () {
		if (!this.shown)
			return;

		if (this.beforeHide)
			this.beforeHide();

		this.shown = false;
		this.el.hide();

		if (this.afterHide)
			this.afterHide();

		events.emit('onHideUi', this);
	},

	destroy () {
		this.offEvents();

		if (this.beforeDestroy)
			this.beforeDestroy();

		this.el.remove();
	},

	val (selector) {
		return this.find(selector).val();
	},

	setDisabled (isDisabled) {
		this.el.removeClass('disabled');

		if (isDisabled)
			this.el.addClass('disabled');
	},

	onEvent (eventName, callback) {
		let list = this.eventCallbacks[eventName] || (this.eventCallbacks[eventName] = []);
		let eventCallback = events.on(eventName, callback);
		list.push(eventCallback);

		return eventCallback;
	},

	offEvent (eventCallback) {
		for (let e in this.eventCallbacks) {
			this.eventCallbacks[e].forEach(c => {
				if (c === eventCallback)
					events.off(e, c);
			});
		}
	},

	offEvents () {
		for (let e in this.eventCallbacks) {
			this.eventCallbacks[e].forEach(c => {
				events.off(e, c);
			});
		}
	},

	toggle () {
		if (!this.shown)
			this.show();
		else
			this.hide();

		events.emit('onToggleUi', this);
	},

	buildClose () {
		$('<div class="btn btnClose">X</div>')
			.appendTo(this.find('.heading').eq(0))
			.on('click', this.toggle.bind(this));
	}
};
