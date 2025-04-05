import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';
import tplOption from './tplOption.html?raw';

export default {
	tpl: template,

	modal: true,

	postRender () {
		this.onEvent('onGetTalk', this.onGetTalk.bind(this));
		this.onEvent('clearUis', this.hide.bind(this));
	},

	onGetTalk (dialogue) {
		this.state = dialogue;

		if (!dialogue) {
			this.hide();

			return;
		}

		this.show();

		this.find('.name').html(dialogue.from);
		this.find('.msg').html('"' + dialogue.msg + '"');
		let options = this.find('.options').empty();

		dialogue.options.forEach(function (o) {
			let html = tplOption;

			$(html)
				.appendTo(options)
				.html('- ' + o.msg)
				.on('click', this.onReply.bind(this, o));
		}, this);

		this.center(true, false);
	},

	onReply (option) {
		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'dialogue',
				method: 'talk',
				data: {
					target: this.state.id,
					state: option.id
				}
			}
		});
	}
};
