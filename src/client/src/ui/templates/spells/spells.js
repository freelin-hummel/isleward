import globals from '../../../js/system/globals';
import resources from '../../../js/resources';
import events from '../../../js/system/events';

import template from './template.html?raw';
import './styles.css';
import templateSpell from './templateSpell.html?raw';
import templateTooltip from './templateTooltip.html?raw';

export default {
	tpl: template,

	spells: [],

	postRender () {
		this.onEvent('onGetSpells', this.onGetSpells.bind(this));
		this.onEvent('onGetSpellActive', this.onGetSpellActive.bind(this));
		this.onEvent('onGetStats', this.onGetStats.bind(this));
		this.onEvent('onRezone', this.onRezone.bind(this));

		setInterval(this.update.bind(this), 100);
	},

	onRezone () {
		this.spells.forEach(s => {
			delete s.ttl;
			delete s.ttlStart;
		});
	},

	onGetSpells (spells) {
		this.el.empty();

		const storedTtls = [];
		this.spells.forEach(({ id, ttl, ttlStart }) => {
			storedTtls.push({
				id,
				ttl,
				ttlStart
			});
		});

		this.spells = spells;

		storedTtls.forEach(({ id, ttl, ttlStart }) => {
			const spell = this.spells.find(f => f.id === id);

			spell.ttl = ttl;
			spell.ttlStart = ttlStart;
		});

		for (let i = 0; i < spells.length; i++) {
			let spell = spells[i];
			let icon = spell.icon;
			let x = -(icon[0] * 64);
			let y = -(icon[1] * 64);

			let hotkey = (spell.id === 0) ? 'space' : spells[i].id;

			let html = templateSpell
				.replace('$HOTKEY$', hotkey);

			let el = $(html)
				.appendTo(this.el);
			el
				.on('dblclick', this.onDblClickSpell.bind(this, hotkey))
				.on('click', this.onClickSpell.bind(this, hotkey))
				.on('mouseover', this.onShowTooltip.bind(this, el, spell))
				.on('mouseleave', this.onHideTooltip.bind(this, el));

			let spritesheet = spell.spritesheet || 'images/abilityIcons.png';
			if (spritesheet.indexOf('server/mods') === 0)
				spritesheet = resources.sprites[spritesheet]?.src;
			el
				.find('.icon').css({ background: 'url("' + spritesheet + '") ' + x + 'px ' + y + 'px' })
				.next().html(hotkey);

			if (spell.autoActive)
				el.addClass('active');

			if (spell.cd && !spell.ttlStart) {
				const tickTime = globals.clientConfig.tickTime;

				spell.ttlStart = +new Date() - ((spell.cdMax - spell.cd) * tickTime);
				spell.ttl = spell.cdMax * tickTime;
			}
		}
	},

	onClickSpell (hotkey, e) {
		e.preventDefault();

		let key = (hotkey === 'space') ? ' ' : hotkey;

		window.player.spellbook.onKeyDown(key);

		return false;
	},

	onDblClickSpell (hotkey, e) {
		window.player.spellbook.tabTarget();

		return this.onClickSpell(hotkey, e);
	},

	onShowTooltip (el, spell) {
		if (isMobile)
			return false;

		const elParent = el.parent();
		const ttPos = {
			x: elParent[0].offsetLeft - 26,
			y: elParent[0].offsetTop + 4
		};

		events.emit('showItemTooltip', {
			item: { spell },
			pos: ttPos,
			rightAlign: true,
			zIndex: this.el.css('z-index'),
			useTooltipConfig: 'equipedRuneTooltipConfig'
		});
	},

	onHideTooltip (el) {
		events.emit('onHideItemTooltip', el[0]);
	},

	onGetSpellActive (options) {
		let spellIndex = this.spells.findIndex(s => s.id === options.spell);
		let el = this.el.children('div')
			.eq(spellIndex)
			.removeClass('active');

		this.spells[spellIndex].autoActive = options.active;

		if (options.active)
			el.addClass('active');
	},

	onGetStats (stats) {
		let mana = stats.mana;

		let spells = this.spells;
		if (!spells)
			return;

		for (let i = 0; i < spells.length; i++) {
			let spell = spells[i];

			let el = this.el.children('div').eq(i).find('.hotkey');
			el.removeClass('no-mana');
			if (spell.manaCost > mana)
				el.addClass('no-mana');
		}
	},

	update () {
		let spells = this.spells;
		if (!spells)
			return;

		let time = +new Date();

		for (let i = 0; i < spells.length; i++) {
			let spell = spells[i];

			if (!spell.ttlStart) {
				this.el.children('div').eq(i).find('.cooldown').css({ width: '0%' });

				continue;
			}

			const elapsed = time - spell.ttlStart;
			let width = 1 - (elapsed / spell.ttl);
			if (width <= 0) {
				delete spell.ttl;
				delete spell.ttlStart;

				width = 0;
			}

			width = Math.ceil((width * 100) / 4) * 4;

			this.el.children('div').eq(i).find('.cooldown').css({ width: width + '%' });
		}
	}
};
