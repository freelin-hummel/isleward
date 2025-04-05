import events from '../../../js/system/events';
import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';
import uiFactory from '../../factory';
import globals from '../../../js/system/globals';

export default {
	tpl: template,
	centered: true,

	classSprites: null,
	class: null,
	costume: 0,
	skinId: null,

	beforeRender () {
		const { clientConfig: { logoPath } } = globals;
		if (!logoPath)
			return;

		const tempEl = $(this.tpl);
		tempEl.find('.logo').attr('src', logoPath);

		this.tpl = tempEl.prop('outerHTML');
	},

	postRender () {
		this.getSkins();

		uiFactory.build('tooltips');

		this.find('.txtClass')
			.on('click', this.changeClass.bind(this))
			.on('mousemove', this.onClassHover.bind(this))
			.on('mouseleave', this.onClassUnhover.bind(this));

		this.find('.skinBox .btn').on('click', this.changeCostume.bind(this));

		this.find('.btnBack').on('click', this.back.bind(this));
		this.find('.btnCreate').on('click', this.create.bind(this));
	},

	getSkins () {
		this.el.addClass('disabled');

		client.request({
			cpn: 'auth',
			method: 'getSkinList',
			data: {},
			callback: this.onGetSkins.bind(this)
		});
	},

	onGetSkins (result) {
		this.el.removeClass('disabled');

		this.classSprites = result;

		this.costume = 0;

		this.class = 'owl';
		this.find('.txtClass').html('Owl');

		this.changeCostume();
	},

	clear () {},

	back () {
		this.clear();

		this.destroy();

		uiFactory.build('characters');
	},

	create () {
		this.el.addClass('disabled');

		const eCreateCharacter = {
			name: this.find('.txtName').val(),
			class: this.class,
			skinId: this.skinId
		};

		events.emit('beforeCreateCharacter', eCreateCharacter);

		client.request({
			cpn: 'auth',
			method: 'createCharacter',
			data: eCreateCharacter,
			callback: this.onCreate.bind(this)
		});
	},

	onCreate (result) {
		this.el.removeClass('disabled');

		if (!result) {
			this.clear();
			this.destroy();
		} else
			this.el.find('.message').html(result);
	},

	onClassHover (e) {
		let el = $(e.target);

		let pos = {
			x: e.clientX + 25,
			y: e.clientY
		};

		let text = ({
			owl: 'The wise Owl guides you; granting you the focus needed to cast spells. <br /><br />Upon level up, you gain 1 Intellect.',
			bear: 'The towering Bear strenghtens you; lending force to your blows. <br /><br />Upon level up, you gain 1 Strength.',
			lynx: 'The nimble Lynx hastens you; allowing your strikes to land true. <br /><br />Upon level up, you gain 1 Dexterity.'
		})[this.class];

		events.emit('onShowTooltip', text, el[0], pos, 200);
		$('.uiTooltips .tooltip').addClass('bright');
	},

	onClassUnhover (e) {
		let el = $(e.target);
		events.emit('onHideTooltip', el[0]);
	},

	changeClass (e) {
		let el = $(e.target);
		let classes = ['owl', 'bear', 'lynx'];
		let nextIndex = (classes.indexOf(this.class) + 1) % classes.length;

		let newClass = classes[nextIndex];

		el.html(newClass[0].toUpperCase() + newClass.substr(1));

		this.class = newClass;

		this.onClassHover(e);
	},

	changeCostume (e) {
		let delta = e ? ~~$(e.target).attr('delta') : 0;

		let spriteList = this.classSprites;
		if (!spriteList)
			return;

		this.costume = (this.costume + delta) % spriteList.length;
		if (this.costume < 0)
			this.costume = spriteList.length - 1;
		this.skinId = spriteList[this.costume].id;

		$('.txtCostume').html(spriteList[this.costume].name);

		this.setSprite();
	},

	setSprite () {
		let classSprite = this.classSprites[this.costume];
		let costume = classSprite.sprite.split(',');
		let spirteX = -costume[0] * 8;
		let spriteY = -costume[1] * 8;

		let spritesheet = classSprite.spritesheet || '../../../images/characters.png';

		this.find('.sprite')
			.css('background', 'url("' + spritesheet + '") ' + spirteX + 'px ' + spriteY + 'px');
	}
};
