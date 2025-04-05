import tpl from './template.html?raw';
import tplBar from './templateBar.html?raw';
import './styles.css';

export default {
	tpl,

	bars: [],

	postRender () {
		this.onEvent('onShowProgress', this.onShowProgress.bind(this));
	},

	onShowProgress (text, percentage) {
		let bar = this.bars.find(function (b) {
			return (b.text === text);
		});

		if (bar) {
			if (percentage >= 100) {
				bar.el.remove();
				this.bars.spliceWhere(function (b) {
					return (b === bar);
				});
			} else
				bar.el.find('.bar').css('width', percentage + '%');
		} else if (percentage < 100) {
			bar = $(tplBar).appendTo(this.el);
			bar.find('.bar').css('width', percentage + '%');
			bar.find('.text').html(text);

			this.bars.push({
				text,
				el: bar
			});
		}
	}
};
