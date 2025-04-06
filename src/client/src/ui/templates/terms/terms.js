import uiFactory from '../../factory';
import template from './template.html?raw';
import './styles.css';
import globals from '../../../js/system/globals';
import browserStorage from '../../../js/system/browserStorage';

export default {
	tpl: template,
	centered: true,

	postRender () {
		const { clientConfig: { tos: { content, version } } } = globals;
		const morphedContent = content.split('\n').join('<br />');

		const elHeading = this.find('.heading');
		elHeading.html(`${elHeading.html()} (v${version})`);

		this.find('.content').html(morphedContent);

		this.find('.btnDecline').on('click', this.onDeclineClick.bind(this));
		this.find('.btnAccept').on('click', this.onAcceptClick.bind(this, version));
	},

	onDeclineClick () {
		browserStorage.set('tos_accepted_version', null);

		window.location.reload();
	},

	onAcceptClick (version) {
		browserStorage.set('tos_accepted_version', version);
		this.destroy();

		uiFactory.build('characters');
	}
};
