/* eslint-disable max-lines-per-function */

import events from '../../../js/system/events';
import client from '../../../js/system/client';
import resources from '../../../js/resources';
import template from './template.html?raw';
import renderItem from '../../shared/renderItem';
import globals from '../../../js/system/globals';
import './styles.css';

export default {
	tpl: template,

	centered: true,

	modal: true,
	hasClose: true,

	stats: null,
	equipment: null,

	hoverItem: null,
	hoverEl: null,
	hoverCompare: null,

	isInspecting: false,

	hotkeyToOpen: 'j',

	postRender () {
		this.onEvent('onGetStats', this.onGetStats.bind(this));
		this.onEvent('onGetItems', this.onGetItems.bind(this));

		this.onEvent('onInspectTarget', this.onInspectTarget.bind(this));

		this.onEvent('onShowEquipment', this.toggle.bind(this));

		this.find('.tab').on('click', this.onTabClick.bind(this));

		this.onEvent('onKeyDown', this.onKeyDown.bind(this));
		this.onEvent('onKeyUp', this.onKeyUp.bind(this));

		this.find('.slot[tooltip]')
			.on('mousemove', this.onShowTooltipAuto.bind(this))
			.on('mouseleave', this.onHideTooltip.bind(this));
	},

	beforeHide () {
		this.isInspecting = false;
		delete this.result;

		this.find('.itemList').hide();

		this.onHoverItem(null, null, null);
	},

	onAfterShow () {
		this.find('.itemList').hide();

		if (!this.isInspecting)
			this.find('.heading-text').html(`Character: ${window.player.name}`);

		this.onGetStats();
		this.onGetItems();

		this.onHoverItem(null, null, null);
	},

	onKeyDown (key) {
		if (key === 'shift' && this.hoverItem)
			this.onHoverItem(this.hoverEl, this.hoverItem, this.hoverCompare);
	},
	onKeyUp (key) {
		if (key === 'shift' && this.hoverItem)
			this.onHoverItem(this.hoverEl, this.hoverItem, null);
	},

	onTabClick (e) {
		this.find('.tab.selected').removeClass('selected');

		$(e.target).addClass('selected');

		let stats = this.isInspecting ? this.result.stats : this.stats;

		this.onGetStats(stats);
	},

	onGetItems (items, isInspectedItems = false) {
		if (this.isInspecting && !isInspectedItems)
			return;

		items = items || this.items;

		if (!this.isInspecting)
			this.items = items;

		if (!this.shown)
			return;

		this.find('.slot').addClass('empty');

		this.find('[slot]')
			.removeData('item')
			.addClass('empty show-default-icon')
			.find('.info')
			.html('')
			.parent()
			.find('.icon')
			.off()
			.css('background-image', '')
			.css('background-position', '')
			.on('click', this.buildSlot.bind(this));

		this.find('[slot]').toArray().forEach(el => {
			el = $(el);

			//Mods might have added more elements. Delete those so we can recreate from scratch
			el.children().not('.icon, .info').remove();

			let slot = el.attr('slot');
			let newItems = window.player.inventory.items.some(i => {
				if (slot.indexOf('finger') === 0)
					slot = 'finger';
				else if (slot === 'oneHanded')
					return (['oneHanded', 'twoHanded'].includes(i.slot) && i.isNew);

				return (i.slot === slot && i.isNew);
			});

			if (newItems)
				el.find('.info').html('new');
		});

		const renderItems = items
			.filter(item => _.has(item, 'quickSlot') || (item.eq && (item.slot || _.has(item, 'runeSlot'))));

		const twoHandedItem = renderItems.find(f => f.slot === 'twoHanded');
		if (twoHandedItem) {
			renderItems.push({
				...twoHandedItem,
				equipSlot: 'offHand',
				faded: true
			});
		}

		renderItems.forEach(item => {
			let slot = item.slot;
			if (_.has(item, 'runeSlot')) {
				let runeSlot = item.runeSlot;
				slot = 'rune-' + runeSlot;
			} else if (_.has(item, 'quickSlot'))
				slot = 'quick-' + item.quickSlot;

			slot = item.equipSlot || slot;

			const elSlot = this.find('[slot="' + slot + '"]')
				.removeClass('empty show-default-icon');

			const itemEl = renderItem(null, item, elSlot);

			itemEl
				.data('item', item)
				.removeClass('empty show-default-icon')
				.find('.icon')
				.off()
				.on('contextmenu', this.showContext.bind(this, item))
				.on('mousedown', this.buildSlot.bind(this, elSlot))
				.on('mousemove', this.onHoverItem.bind(this, elSlot, item, null))
				.on('mouseleave', this.onHoverItem.bind(this, null, null));

			if (item.faded)
				itemEl.addClass('faded');
		});
	},

	showContext (item, e) {
		let menuItems = {
			unequip: {
				text: 'unequip',
				callback: this.unequipItem.bind(this, item)
			}
		};

		let config = [];

		config.push(menuItems.unequip);

		events.emit('onContextMenu', config, e);

		e.preventDefault();

		return false;
	},

	unequipItem (item) {
		const isQuickslot = _.has(item, 'quickSlot');
		const method = isQuickslot ? 'setQuickSlot' : 'unequip';
		const data = isQuickslot ? { slot: item.quickSlot } : { itemId: item.id };

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'equipment',
				method,
				data
			}
		});
	},

	onInspectTarget (result) {
		this.isInspecting = true;

		this.find('.heading-text').html(`Character: ${result.name}`);

		this.show();

		this.result = result;

		this.onGetStats(result.stats, true);
		this.onGetItems(result.equipment, true);
	},

	buildSlot (el, e) {
		if (e && e.button !== 0)
			return;

		if (this.isInspecting)
			return;

		if (el.target)
			el = $(el.target).parent();

		let slot = el.attr('slot');
		let isRune = (slot.indexOf('rune') === 0);
		const isConsumable = (slot.indexOf('quick') === 0);

		let container = this.find('.itemList .grid')
			.empty();

		this.find('.itemList')
			.css('display', 'flex');

		this.find('.itemList .heading-text').html(`Choose an item to equip in the '${el.attr('slotName')}' slot`);

		let hoverCompare = this.hoverCompare = el.data('item');

		let items = this.items
			.filter(item => {
				if (isRune)
					return (!item.slot && item.spell && !item.eq);
				else if (isConsumable)
					return (item.type === 'consumable' && !_.has(item, 'quickSlot'));

				let checkSlot = (slot.indexOf('finger') === 0) ? 'finger' : slot;
				if (slot === 'oneHanded')
					return (!item.eq && (item.slot === 'oneHanded' || item.slot === 'twoHanded'));

				return (item.slot === checkSlot && !item.eq);
			});

		if (isConsumable)
			items = items.filter((item, i) => items.findIndex(f => f.name === item.name) === i);

		items.splice(0, 0, ...[{
			name: 'Back',
			empty: true,
			action: 'back',
			spritesheet: '/images/uiIcons.png',
			sprite: [6, 0]
		}, null, null, null, null, null, null]);

		if (hoverCompare) {
			items.splice(6, 1, {
				name: hoverCompare ? 'Unequip Item' : 'Back',
				slot: hoverCompare ? hoverCompare.slot : null,
				id: (hoverCompare && !isConsumable) ? hoverCompare.id : null,
				type: isConsumable ? 'consumable' : null,
				empty: true,
				action: 'unequip',
				spritesheet: '/images/uiIcons.png',
				sprite: [7, 0]
			});
		}

		if (hoverCompare)
			items.splice(3, 1, hoverCompare);

		items.forEach(item => {
			const itemEl = renderItem(container, item);

			if (!item)
				return;

			itemEl
				.on('mousedown', this.equipItem.bind(this, item, slot))
				.on('mousemove', this.onHoverItem.bind(this, itemEl, item, null))
				.on('mouseleave', this.onHoverItem.bind(this, null, null));

			if (item.action)
				itemEl.addClass('empty');

			if (item === hoverCompare)
				itemEl.find('.icon').addClass('eq');
			else if (item.isNew)
				el.find('.icon').addClass('new');
		});

		if (!items.length)
			container.hide();

		if (e) {
			e.preventDefault();

			return false;
		}
	},

	equipItem (item, slot, e) {
		let isNew = window.player.inventory.items.some(f => (f.equipSlot === slot && f.isNew));
		if (!isNew)
			this.find('[slot="' + slot + '"] .info').html('');

		if (item === this.hoverCompare) {
			this.find('.itemList').hide();

			return;
		}

		if (item.action === 'back') {
			this.find('.itemList').hide();

			e.preventDefault();

			return false;
		}

		let cpn = 'equipment';
		let method = 'equip';
		let data = { itemId: item.id };

		if (item.action === 'unequip')
			method = 'unequip';

		if (item.type === 'consumable') {
			cpn = 'equipment';
			method = 'setQuickSlot';
			data = {
				itemId: item.id,
				slot: ~~slot.replace('quick-', '')
			};
		} else if (!item.slot) {
			cpn = 'inventory';
			method = 'learnAbility';
			data = {
				itemId: item.id,
				slot: ~~slot.replace('rune-', '')
			};

			if (item.empty) {
				if (!this.hoverCompare) {
					this.find('.itemList').hide();

					return;
				}
				method = 'unlearnAbility';
				data.itemId = this.hoverCompare.id;
				delete data.slot;
			}
		} else if (item.slot === 'finger') {
			data = {
				itemId: item.id,
				slot
			};
		}

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn,
				method,
				data
			}
		});

		this.find('.itemList').hide();

		e.preventDefault();

		return false;
	},

	onHoverItem (el, item, compare, e) {
		if (el) {
			this.hoverItem = item;
			this.hoverEl = el;

			if ((item.isNew) && (!item.eq)) {
				delete item.isNew;
				el.find('.icon').removeClass('new');
			}

			let ttPos = null;
			if (e) {
				ttPos = {
					x: ~~(e.clientX + 32),
					y: ~~(e.clientY)
				};
			}

			events.emit('onShowItemTooltip', item, ttPos, this.hoverCompare);
		} else {
			events.emit('onHideItemTooltip', this.hoverItem);
			this.hoverItem = null;
		}
	},

	onGetStats (stats, componentBlueprint, isInspectedStats = false) {
		if (this.isInspecting && !isInspectedStats)
			return;

		if (stats && !this.isInspecting)
			this.stats = stats;

		stats = stats || this.stats;
		if (!this.shown)
			return;

		const { clientConfig: { statTranslations } } = globals;

		let container = this.el.find('.stats');
		container.children('*:not(.tabs)').remove();

		let xpRemaining = (stats.xpMax - stats.xp).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

		const selectedTab = this.find('.tab.selected').html().toLowerCase();

		let newStats = {
			basic: {
				Level: stats.level,
				'Next Level': xpRemaining + ' experience',
				gap1: '',
				Health: ~~stats.hp + '/' + ~~stats.hpMax,
				regenHp: stats.regenHp,
				vit: stats.vit,
				gap3: '',
				Mana: ~~stats.mana + '/' + ~~stats.manaMax,
				regenMana: ~~stats.regenMana + '%',
				gap4: '',
				str: stats.str,
				int: stats.int,
				dex: stats.dex
			},

			offensive: {
				critChance: {
					addCritChance: (~~(stats.critChance * 10) / 10) + '%',
					addAttackCritChance: (~~((stats.critChance + stats.attackCritChance) * 10) / 10) + '%',
					addSpellCritChance: (~~((stats.critChance + stats.spellCritChance) * 10) / 10) + '%'
				},

				gap0: '',

				critMultiplier: {
					addCritMultiplier: (~~(stats.critMultiplier * 10) / 10) + '%',
					addAttackCritMultiplier: (~~((stats.critMultiplier + stats.attackCritMultiplier) * 10) / 10) + '%',
					addSpellCritMultiplier: (~~((stats.critMultiplier + stats.spellCritMultiplier) * 10) / 10) + '%'
				},

				gap1: '',

				attackSpeed: (100 + stats.attackSpeed) + '%',
				castSpeed: (100 + stats.castSpeed) + '%',

				gap2: '',

				addAttackDamage: stats.addAttackDamage,
				addSpellDamage: stats.addSpellDamage,

				gap4: '',

				damageGroups: {
					physicalPercent: stats.physicalPercent,
					elementArcanePercent: stats.elementArcanePercent,
					elementFirePercent: stats.elementFirePercent,
					elementHolyPercent: stats.elementHolyPercent,
					elementPoisonPercent: stats.elementPoisonPercent,
					elementFrostPercent: stats.elementFrostPercent,
					spellPercent: stats.spellPercent
				}
			},

			defensive: {
				armor: stats.armor,

				gap1: '',

				blockAttackChance: stats.blockAttackChance + '%',
				blockSpellChance: stats.blockSpellChance + '%',

				gap2: '',

				dodgeAttackChance: (~~(stats.dodgeAttackChance * 10) / 10) + '%',
				dodgeSpellChance: (~~(stats.dodgeSpellChance * 10) / 10) + '%',

				gap4: '',

				lifeOnHit: stats.lifeOnHit,

				gap5: '',

				resistGroups: {
					elementArcaneResist: stats.elementArcaneResist,
					elementFireResist: stats.elementFireResist,
					elementHolyResist: stats.elementHolyResist,
					elementPoisonResist: stats.elementPoisonResist,
					elementFrostResist: stats.elementFrostResist,
					elementAllResist: stats.elementAllResist
				}
			},

			other: {
				magicFind: stats.magicFind + '%',
				itemQuantity: stats.itemQuantity + '%',

				gap1: '',

				sprintChance: ((~~(stats.sprintChance * 100) / 100) || 0) + '%',

				gap2: '',

				xpIncrease: stats.xpIncrease + '%',

				gap3: '',

				catchChance: stats.catchChance + '%',
				catchSpeed: stats.catchSpeed + '%',
				fishRarity: stats.fishRarity + '%',
				fishWeight: stats.fishWeight + '%',
				fishItems: stats.fishItems + '%'
			}
		}[selectedTab];

		const damageGroups = [
			{ key: 'physicalPercent', label: 'Physical', color: 'var(--color-element-default)' },
			{ key: 'elementArcanePercent', label: 'Arcane', color: 'var(--color-element-arcane)' },
			{ key: 'elementFirePercent', label: 'Fire', color: 'var(--color-element-fire)' },
			{ key: 'elementFrostPercent', label: 'Frost', color: 'var(--color-element-frost)' },
			{ key: 'elementHolyPercent', label: 'Holy', color: 'var(--color-element-holy)' },
			{ key: 'elementPoisonPercent', label: 'Poison', color: 'var(--color-element-poison)' },
			{ key: 'spellPercent', label: 'Spell', color: 'elementalRainbow' }
		];

		const resistGroups = [
			{ key: 'elementArcaneResist', label: 'Arcane', color: 'var(--color-element-arcane)' },
			{ key: 'elementFireResist', label: 'Fire', color: 'var(--color-element-fire)' },
			{ key: 'elementFrostResist', label: 'Frost', color: 'var(--color-element-frost)' },
			{ key: 'elementHolyResist', label: 'Holy', color: 'var(--color-element-holy)' },
			{ key: 'elementPoisonResist', label: 'Poison', color: 'var(--color-element-poison)' },
			{ key: 'elementAllResist', label: 'All Elemental', color: 'elementalRainbow' }
		];

		const renderElementalGroup = (label, groups) => {
			let wrap = $('<div class="stat elemental-group"></div>');
			wrap.append(`<div class="elemental-heading">${label}</div>`);

			let row = $('<div class="elemental-row"></div>').appendTo(wrap);

			groups.forEach(g => {
				let tooltipText = label.includes('Damage') ?
					`${g.label} damage is increased by ${g.value}%` :
					`You have ${g.value}% ${g.label} resistance`;

				const borderColor = g.color === 'elementalRainbow' ? 'transparent' : g.color;

				const tooltipBase = statTranslations.tooltips[g.key];

				const elemClass = g.color === 'elementalRainbow' ? 'elem rainbow' : 'elem';
				const el = $(`
					<div class="${elemClass}" style="border-bottom: 4px solid ${borderColor};" tooltip="${tooltipText}">
						<span>${g.value}%</span>
					</div>
				`)
					.appendTo(row)
					.on('mousemove', this.onShowTooltipAuto.bind(this))
					.on('mouseleave', this.onHideTooltip.bind(this));

				if (tooltipBase)
					el.attr('tooltipBase', tooltipBase);
			});

			container.append(wrap);
		};

		const renderCritGroup = (label, parts) => {
			let wrap = $('<div class="stat elemental-group"></div>');
			wrap.append(`<div class="elemental-heading">${label}</div>`);

			let row = $('<div class="elemental-row"></div>').appendTo(wrap);

			parts.forEach(p => {
				const translated = statTranslations[p.key] ?? p.key;

				const tooltipBase = statTranslations.tooltips[p.key];

				const tooltipText = `${translated} is ${p.value}`;
				const el = $(`
					<div class="elem" style="border-bottom: 4px solid var(--grayB);" tooltip="${tooltipText}">
						<span>${p.type}: ${p.value}</span>
					</div>
				`)
					.appendTo(row)
					.on('mousemove', this.onShowTooltipAuto.bind(this))
					.on('mouseleave', this.onHideTooltip.bind(this));

				if (tooltipBase)
					el.attr('tooltipBase', tooltipBase);
			});

			container.append(wrap);
		};

		for (let s in newStats) {
			if (s === 'damageGroups') {
				let dg = [];
				for (let k in newStats[s]) {
					let val = newStats[s][k];
					dg.push({
						key: k,
						label: damageGroups.find(x => x.key === k)?.label || k,
						color: damageGroups.find(x => x.key === k)?.color || '#fff',
						value: val
					});
				}
				renderElementalGroup('Damage Increase:', dg);

				continue;
			} else if (s === 'resistGroups') {
				let rg = [];
				for (let k in newStats[s]) {
					let val = newStats[s][k];
					rg.push({
						key: k,
						label: resistGroups.find(x => x.key === k)?.label || k,
						color: resistGroups.find(x => x.key === k)?.color || '#fff',
						value: val
					});
				}
				renderElementalGroup('Resistances:', rg);

				continue;
			} else if (s === 'critChance') {
				let c = newStats[s];
				renderCritGroup('Critical Hit Chance:', [
					{ key: 'addCritChance', type: 'Global', value: c.addCritChance },
					{ key: 'addAttackCritChance', type: 'Attack', value: c.addAttackCritChance },
					{ key: 'addSpellCritChance', type: 'Spell', value: c.addSpellCritChance }
				]);

				continue;
			} else if (s === 'critMultiplier') {
				let c = newStats[s];
				renderCritGroup('Critical Hit Damage Multiplier:', [
					{ key: 'addCritMultiplier', type: 'Global', value: c.addCritMultiplier },
					{ key: 'addAttackCritMultiplier', type: 'Attack', value: c.addAttackCritMultiplier },
					{ key: 'addSpellCritMultiplier', type: 'Spell', value: c.addSpellCritMultiplier }
				]);

				continue;
			}

			const translated = statTranslations[s] ?? s;

			let label = translated + ': ';
			let value = newStats[s];

			let isGap = false;
			if (label.indexOf('gap') === 0) {
				isGap = true;
				label = '';
				value = '';
			}

			let row = $(
				'<div class="stat"><font class="q0">' +
				label +
				'</font><font style="color: var(--grayC)">' +
				value +
				'</font></div>'
			).appendTo(container);

			const tooltip = statTranslations.tooltips[s];
			if (tooltip) {
				row
					.attr('tooltip', tooltip)
					.on('mousemove', this.onShowTooltipAuto.bind(this))
					.on('mouseleave', this.onHideTooltip.bind(this));
			}

			if (s === 'Gold')
				row.addClass('gold');
			else if (s === 'Level' || s === 'Next Level')
				row.addClass('blueText');

			if (isGap)
				row.addClass('empty');
		}
	},

	onShowTooltipAuto: function ({ currentTarget, originalEvent }) {
		const { player: { inventory: { items } } } = window;

		const slot = $(currentTarget).attr('slot');

		if (
			slot &&
			(
				items.some(f => f.equipSlot === slot && f.eq) ||
				(
					slot.includes('rune-') &&
					items.some(f => f.runeSlot === +slot.replace('rune-', '') && f.eq)
				) ||
				(
					slot.includes('quick-') &&
					items.some(f => f.quickSlot === +slot.replace('quick-', ''))
				) ||
				slot === 'offHand' && items.some(f => f.slot === 'twoHanded' && f.eq)
			)
		)
			return;

		const tooltipPos = {
			x: originalEvent.clientX + 24,
			y: originalEvent.clientY
		};

		const tooltipPre = $(currentTarget).attr('tooltip') ?? 'No Tooltip';
		const tooltipBase = $(currentTarget).attr('tooltipBase') ?? '';

		let tooltip = tooltipPre;
		if (tooltipBase)
			tooltip = `${tooltipBase}<br /><br />${tooltipPre}`;

		events.emit('onShowTooltip', tooltip, currentTarget, tooltipPos);
	},

	onShowTooltip: function (tooltip, { currentTarget, originalEvent }) {
		const tooltipPos = {
			x: originalEvent.clientX + 24,
			y: originalEvent.clientY
		};

		events.emit('onShowTooltip', tooltip, currentTarget, tooltipPos);
	},

	onHideTooltip: function (e) {
		events.emit('onHideTooltip', e.currentTarget);
	}
};
