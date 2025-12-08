import resources from '../../../js/resources';

import events from '../../../js/system/events';
import client from '../../../js/system/client';
import globals from '../../../js/system/globals';
import template from './template.html?raw';

import './styles.css';

export default {
	tpl: template,

	centered: true,

	modal: true,
	hasClose: true,

	skin: null,
	wardrobeId: null,

	postRender () {
		this.onEvent('onGetWardrobeSkins', this.onGetWardrobeSkins.bind(this));
		this.onEvent('onCloseWardrobe', this.hide.bind(this));

		this.on('.btnCancel', 'click', this.hide.bind(this));
		this.on('.btnApply', 'click', this.apply.bind(this));
	},

	onGetWardrobeSkins ({ skins: list, id: wardrobeId }) {
		this.wardrobeId = wardrobeId;

		list.forEach(l => {
			l.name = l.name.replace('Skin: ', '');
		});

		list.sort((a, b) =>
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);

		const container = this.find('.list').empty();
		let selectedEl = null;
		let selectedData = null;

		list.forEach(l => {
			const html = '<div class="skinName">' + l.name + '</div>';
			const el = $(html).appendTo(container);

			el.on('click', this.setPreview.bind(this, l, el));
			el.on('click', events.emit.bind(events, 'onClickListItem'));

			if (l.id === window.player.skinId) {
				el.addClass('current');
				selectedEl = el;
				selectedData = l;
			}
		});

		this.show();

		if (selectedEl) {
			this.setPreview(selectedData, selectedEl);

			requestAnimationFrame(() => {
				selectedEl.get(0).scrollIntoView({
					block: 'center'
				});
			});
		}
	},

	setPreview (skin, el) {
		this.find('.active').removeClass('active');

		el.addClass('active');

		this.skin = skin;

		let costume = skin.sprite.split(',');

		let spritesheet = skin.spritesheet || '../../../images/characters.png';
		const isBig = globals.clientConfig.bigTextures?.includes(spritesheet);

		if (spritesheet.indexOf('server/mods') === 0)
			spritesheet = resources.sprites[spritesheet]?.src;

		const tileSize = isBig ? 24 : 8;

		let spriteX = -costume[0] * tileSize;
		let spriteY = -costume[1] * tileSize;

		const sprite = this.find('.sprite')
			.css('background', 'url("' + spritesheet + '") ' + spriteX + 'px ' + spriteY + 'px')
			.removeClass('bigSprite');

		if (isBig)
			sprite.addClass('bigSprite');
	},

	apply () {
		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'wardrobe',
				method: 'apply',
				data: {
					skinId: this.skin.id,
					targetId: this.wardrobeId
				}
			}
		});
	}
};
