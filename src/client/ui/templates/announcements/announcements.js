define([
	'js/system/events',
	'html!ui/templates/announcements/template',
	'css!ui/templates/announcements/styles',
	'html!ui/templates/announcements/templateLine'
], function (
	events,
	template,
	styles,
	templateLine
) {
	const maxTtl = 160;

	return {
		tpl: template,

		message: null,

		postRender: function () {
			[
				'onGetAnnouncement',
				'onRemoveAnnouncement'
			].forEach(e => {
				this.onEvent(e, this[e].bind(this));
			});
		},

		onGetAnnouncement: function ({
			msg,
			ttl = maxTtl,
			type,
			zIndex,
			top: marginTop
		}) {
			if (isMobile) {
				if (['press g to', 'press u to'].some(f => msg.toLowerCase().indexOf(f) > -1))
					return;
			}

			this.clearMessage();

			let container = this.find('.list');

			let html = templateLine
				.replace('$MSG$', msg);

			let el = $(html)
				.appendTo(container);

			if (type)
				el.addClass(type);
			if (zIndex)
				el.css('z-index', zIndex);
			if (marginTop)
				el.css('margin-top', marginTop);

			this.message = {
				msg,
				ttl,
				el
			};
		},

		onRemoveAnnouncement: function ({ msg }) {
			if (this.message?.msg !== msg)
				return;

			this.clearMessage();
		},

		update: function () {
			let message = this.message;
			if (!message)
				return;

			message.ttl--;

			if (message.ttl <= 0)
				this.clearMessage();
		},

		clearMessage: function () {
			let message = this.message;
			if (!message)
				return;

			this.message = null;
			message.el.remove();
		}
	};
});
