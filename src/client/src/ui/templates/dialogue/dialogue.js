import template from './template.html?raw';
import './styles.css';

export default {
	tpl: template,
	text: [],

	centeredX: true,

	postRender () {
		this.onEvent('onGetDialogue', this.onGetDialogue.bind(this));
		this.onEvent('onRemoveDialogue', this.onRemoveDialogue.bind(this));
	},

	onGetDialogue (msg) {
		if (isMobile && msg.msg.includes('(U to'))
			return;

		this.text.spliceWhere(function (t) {
			return (t.src === msg.src);
		});

		this.text.push(msg);
		this.setText();
	},

	onRemoveDialogue (msg) {
		this.text.spliceWhere(function (t) {
			return (t.src === msg.src);
		});

		this.setText();
	},

	setText () {
		let text = '';
		for (let i = 0; i < this.text.length; i++) {
			let t = this.text[i];

			text += t.msg;
			if (i < this.text.length - 1)
				text += '<br /><hr>';
		}

		this.find('.textBox').html(text);

		if (text !== '')
			this.show();

		else
			this.hide();
	}
};
