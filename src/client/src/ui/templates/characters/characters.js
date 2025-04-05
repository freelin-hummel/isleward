import events from '../../../js/system/events';
import client from '../../../js/system/client';
import uiFactory from '../../factory';
import template from './template.html?raw';
import templateListItem from './templateListItem.html?raw';
import './styles.css';
import globals from '../../../js/system/globals';

export default {
	tpl: template,

	centered: true,
	characterInfo: {},
	characters: null,
	selected: null,
	selectedIndex: -1,
	deleteCount: 0,

	beforeRender () {
		const { clientConfig: { logoPath } } = globals;
		if (!logoPath)
			return;

		const tempEl = $(this.tpl);
		tempEl.find('.logo').attr('src', logoPath);

		this.tpl = tempEl.prop('outerHTML');
	},

	postRender () {
		this.find('.btnPlay').on('click', this.onPlayClick.bind(this));
		this.find('.btnNew').on('click', this.onNewClick.bind(this));
		this.find('.btnDelete')
			.on('click', this.onDeleteClick.bind(this))
			.on('mouseleave', this.onDeleteReset.bind(this));

		this.getCharacters();

		this.onEvent('onKeyDown', this.onKeyDown.bind(this));
	},

	onKeyDown (key) {
		if (this.el.hasClass('disabled'))
			return;

		if (key === 'enter')
			this.onPlayClick();
		else if (key === 'up' || key === 'down') {
			if (!this.characters || this.selectedIndex === -1)
				return;

			const numChars = this.characters.length;
			if (!numChars)
				return;

			const delta = key === 'up' ? -1 : 1;

			//Clamp index within range [0, numChars - 1]
			const newIndex = Math.min(Math.max(this.selectedIndex + delta, 0), numChars - 1);

			const list = this.find('.left');
			if (!list)
				return;

			const li = list.children()[newIndex];
			li.click();

			list.scrollTop(li.offsetTop);
		}
	},

	onPlayClick () {
		let char = this.selected;
		if (!char)
			return;

		this.el.addClass('disabled');

		client.request({
			cpn: 'auth',
			method: 'play',
			data: { name: this.selected },
			callback: this.onPlay.bind(this)
		});
	},
	onPlay () {
		this.el.removeClass('disabled');
		this.destroy();
	},

	onNewClick () {
		uiFactory.build('createCharacter');
		this.destroy();
	},

	getCharacters () {
		this.el.addClass('disabled');

		client.request({
			cpn: 'auth',
			method: 'getCharacterList',
			callback: this.onGetCharacters.bind(this)
		});
	},
	onGetCharacters (characters) {
		this.characters = characters;
		this.find('.sprite').css('background', '');
		this.find('.info div').html('');

		this.el.removeClass('disabled');

		let list = this.find('.left')
			.empty();

		this.characters
			.sort((a, b) => b.level - a.level)
			.forEach((charName, i) => {
				const html = templateListItem
					.replace('$NAME$', charName);

				let li = $(html)
					.appendTo(list);

				li.on('click', this.onCharacterClick.bind(this, charName, i));

				if (i === 0)
					li.click();
			});
	},
	onCharacterClick (charName, charIndex, e) {
		this.selectedIndex = charIndex;
		this.el.addClass('disabled');

		let el = $(e.target);
		el.parent().find('.selected').removeClass('selected');
		el.addClass('selected');

		let charInfo = this.characterInfo[charName];
		if (charInfo) {
			this.onGetCharacter(charName, charInfo);

			return;
		}

		client.request({
			cpn: 'auth',
			method: 'getCharacter',
			data: { name: charName },
			callback: this.onGetCharacter.bind(this, charName)
		});
	},
	onGetCharacter (charName, result) {
		this.find('.btn').removeClass('disabled');

		let spriteY = ~~(result.cell / 8);
		let spirteX = result.cell - (spriteY * 8);

		spirteX = -(spirteX * 8);
		spriteY = -(spriteY * 8);

		let spritesheet = result.sheetName;
		if (spritesheet === 'characters')
			spritesheet = '../../../images/characters.png';

		this.find('.sprite')
			.css('background', 'url("' + spritesheet + '") ' + spirteX + 'px ' + spriteY + 'px')
			.show();

		this.find('.name').html(charName);
		let stats = result.components.find(function (c) {
			return (c.type === 'stats');
		});
		if (stats) {
			this.find('.class').html(
				'Lvl ' + stats.values.level +
					' ' +
					result.class[0].toUpperCase() + result.class.substr(1)
			);
		} else
			this.find('.class').html('');

		this.el.removeClass('disabled');

		this.characterInfo[charName] = result;
		this.selected = charName;

		this.find('.btnPlay').removeClass('disabled');

		events.emit('afterGetCharacter', { character: result });
	},

	setMessage (msg) {
		this.find('.message').html(msg);
	},

	async onDeleteClick () {
		if (!this.selected)
			return;

		if (this.deleteCount < 3) {
			this.deleteCount++;

			this.setMessage('click delete ' + (4 - this.deleteCount) + ' more time' + ((this.deleteCount === 3) ? '' : 's') + ' to confirm');

			this.find('.btnDelete')
				.removeClass('deleting')
				.addClass('deleting')
				.html('delete (' + (4 - this.deleteCount) + ')');

			return;
		}
		this.onDeleteReset();

		this.el.addClass('disabled');

		const result = await new Promise(res => {
			client.request({
				cpn: 'auth',
				method: 'deleteCharacter',
				data: { name: this.selected },
				callback: res
			});
		});

		if (!result.success) {
			this.setMessage(result.msg);
			this.el.removeClass('disabled');

			return;
		}

		this.onGetCharacters(result.characterList);
	},

	onDeleteReset () {
		this.deleteCount = 0;
		this.find('.btnDelete')
			.removeClass('deleting')
			.html('delete');

		setTimeout(this.setMessage.bind(this, ''), 5000);
	}
};
