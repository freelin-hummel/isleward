import events from '../../../js/system/events';
import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';
import input from '../../../js/input';
import config from '../../../js/config';
import renderItem from '../../shared/renderItem';

export default {
	tpl: template,

	centered: true,

	items: [],
	inventorySize: 50,

	dragItem: null,
	dragEl: null,
	hoverCell: null,

	modal: true,
	hasClose: true,

	oldSpellsZIndex: 0,

	postRender () {
		this.onEvent('onGetItems', this.onGetItems.bind(this));
		this.onEvent('onGetInventorySize', this.onGetInventorySize.bind(this));
		this.onEvent('onDestroyItems', this.onDestroyItems.bind(this));
		this.onEvent('onShowInventory', this.toggle.bind(this));
		this.onEvent('onToggleQualityIndicators', this.onToggleQualityIndicators.bind(this));
		this.onToggleQualityIndicators(config.get('qualityIndicators'));

		this.onEvent('onToggleUnusableIndicators', this.onToggleUnusableIndicators.bind(this));
		this.onToggleUnusableIndicators(config.get('unusableIndicators'));

		this.onEvent('onKeyDown', this.onKeyDown.bind(this));
		this.onEvent('onKeyUp', this.onKeyUp.bind(this));

		this.find('.grid')
			.on('mousemove', this.onMouseMove.bind(this))
			.on('mouseleave', this.onMouseDown.bind(this, null, null, false))
			.on('mouseup', this.onMouseDown.bind(this, null, null, false));

		this.find('.split-box .amount')
			.on('mousewheel', this.onChangeStackAmount.bind(this))
			.on('input', this.onEnterStackAmount.bind(this));

		this.find('.split-box').on('click', this.splitStackEnd.bind(this, true));
		this.find('.split-box .btnSplit').on('click', this.splitStackEnd.bind(this, null));
		this.find('.split-box .btnLess').on('click', this.onChangeStackAmount.bind(this, null, -1));
		this.find('.split-box .btnMore').on('click', this.onChangeStackAmount.bind(this, null, 1));
		this.find('.btnSortInv').on('click', this.onSortInventory.bind(this));
	},

	build () {
		const { el, inventorySize } = this;

		let container = el.find('.grid')
			.empty();

		let items = this.items
			.filter(function (item) {
				return !item.eq;
			});

		let iLen = Math.max(items.length, inventorySize);

		let rendered = [];

		for (let i = 0; i < iLen; i++) {
			let itemEl = null;

			let item = items.find(f => (f.pos !== null && f.pos === i));

			if (!item) {
				itemEl = renderItem(container, null);

				itemEl
					.on('mouseup', this.onMouseDown.bind(this, null, null, false))
					.on('mousemove', this.onHover.bind(this, itemEl, item))
					.on('mouseleave', this.hideTooltip.bind(this, itemEl, item))
					.children()
					.remove();

				continue;
			} else
				rendered.push(item);

			itemEl = renderItem(container, item);

			let clickHandler = this.onMouseDown.bind(this, itemEl, item, true);
			let moveHandler = this.onHover.bind(this, itemEl, item);
			if (isMobile) {
				clickHandler = this.onHover.bind(this, itemEl, item);
				moveHandler = () => {};
			}

			itemEl
				.data('item', item)
				.on('click', this.onClick.bind(this, item, false))
				.on('mousedown', clickHandler)
				.on('mouseup', this.onMouseDown.bind(this, null, null, false))
				.on('mousemove', moveHandler)
				.on('mouseleave', this.hideTooltip.bind(this, itemEl, item))
				.find('.icon')
				.on('contextmenu', this.showContext.bind(this, item));
		}
	},

	onToggleQualityIndicators (state) {
		const className = `quality-${state.toLowerCase()}`;

		$('.ui-container')
			.removeClass('quality-off quality-bottom quality-border quality-background')
			.addClass(className);
	},

	onToggleUnusableIndicators (state) {
		const className = `unusable-${state.toLowerCase()}`;

		$('.ui-container')
			.removeClass('unusable-off unusable-border unusable-top unusable-background')
			.addClass(className);
	},

	onClick (item, forceCtrl) {
		let msg = {
			item,
			success: true
		};
		events.emit('beforeInventoryClickItem', msg);

		if (!msg.success)
			return;

		if (!forceCtrl && !input.isKeyDown('ctrl', true))
			return;

		client.request({
			cpn: 'social',
			method: 'chat',
			data: {
				message: '',
				item,
				type: 'global'
			}
		});
	},

	onMouseDown (el, item, down, e) {
		if (e.button !== 0)
			return;

		if (down) {
			this.dragEl = el.clone()
				.appendTo(this.find('.grid'))
				.hide()
				.addClass('dragging');

			this.dragItem = el;

			events.emit('onHideItemTooltip', this.hoverItem);
			events.emit('onStartMoveItem', this.dragItem.data('item'));
			this.hoverItem = null;
		} else if (this.dragItem) {
			let method = 'moveItem';

			if ((this.hoverCell) && (this.hoverCell[0] !== this.dragItem[0])) {
				const data = {};

				let placeholder = $('<div></div>')
					.insertAfter(this.dragItem);

				this.dragItem.insertBefore(this.hoverCell);
				this.hoverCell.insertBefore(placeholder);
				placeholder.remove();

				let msgs = [{
					itemId: this.dragItem.data('item').id,
					targetPos: this.dragItem.index()
				}];

				data.moveMsgs = msgs;

				this.items.find(i => i.id === this.dragItem.data('item').id).pos = this.dragItem.index();

				let hoverCellItem = this.hoverCell.data('item');
				if (hoverCellItem) {
					if ((hoverCellItem.name !== this.dragItem.data('item').name) || (!hoverCellItem.quantity)) {
						msgs.push({
							itemId: hoverCellItem.id,
							targetPos: this.hoverCell.index()
						});

						this.items.find(i => i.id === hoverCellItem.id).pos = this.hoverCell.index();
					} else {
						delete data.moveMsgs;
						data.fromId = this.dragItem.data('item').id;
						data.toId = hoverCellItem.id;

						method = 'combineStacks';
					}
				}

				client.request({
					cpn: 'player',
					method: 'performAction',
					data: {
						cpn: 'inventory',
						method,
						data
					}
				});

				events.emit('onStopMoveItem', this.dragItem.data('item'));

				this.build();
			}

			this.dragItem = null;
			this.dragEl.remove();
			this.dragEl = null;
			this.hoverCell = null;
			this.find('.hover').removeClass('hover');
		}

		e.stopPropagation();
	},

	onMouseMove (e) {
		if (!this.dragEl)
			return;

		let offset = this.find('.grid').offset();

		this.dragEl.css({
			left: e.clientX - offset.left - 40,
			top: e.clientY - offset.top - 40,
			display: 'block'
		});
	},

	onSortInventory () {
		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'inventory',
				method: 'sortInventory',
				data: {}
			}
		});
	},

	showContext (item, e) {
		let menuItems = {
			drop: {
				text: 'drop',
				callback: this.performItemAction.bind(this, item, 'dropItem')
			},
			destroy: {
				text: 'destroy',
				callback: this.performItemAction.bind(this, item, 'destroyItem')
			},
			salvage: {
				text: 'salvage',
				callback: this.performItemAction.bind(this, item, 'salvageItem'),
				hotkey: 'f'
			},
			stash: {
				text: 'stash',
				callback: this.performItemAction.bind(this, item, 'stashItem')
			},
			learn: {
				text: 'learn',
				callback: this.performItemAction.bind(this, item, 'learnAbility')
			},
			quickSlot: {
				text: 'quickslot',
				callback: this.performItemAction.bind(this, item, 'setQuickSlot')
			},
			use: {
				text: 'use',
				callback: this.performItemAction.bind(this, item, 'useItem')
			},
			equip: {
				text: 'equip',
				callback: this.performItemAction.bind(this, item, 'equip')
			},
			split: {
				text: 'split stack',
				callback: this.splitStackStart.bind(this, item)
			},
			link: {
				text: 'link',
				callback: this.onClick.bind(this, item, true)
			},
			divider: '----------'
		};

		if (item.eq) {
			menuItems.learn.text = 'unlearn';
			menuItems.equip.text = 'unequip';
		}

		if (item.active)
			menuItems.activate.text = 'deactivate';

		let ctxConfig = [];

		if (item.ability)
			ctxConfig.push(menuItems.learn);
		else if (item.type === 'toy' || item.type === 'consumable' || item.useText || item.type === 'recipe') {
			if (item.useText)
				menuItems.use.text = item.useText;
			ctxConfig.push(menuItems.use);
			if (!_.has(item, 'quickSlot'))
				ctxConfig.push(menuItems.quickSlot);
		} else if (item.slot) {
			ctxConfig.push(menuItems.equip);
			if (!item.eq)
				ctxConfig.push(menuItems.divider);
		}

		if (!item.eq && !item.active && !item.quest) {
			const isAtStash = window.player.serverActions.hasAction('openStash');

			if (isAtStash && !item.noStash)
				ctxConfig.push(menuItems.stash);

			if (!item.noDrop)
				ctxConfig.push(menuItems.drop);

			if (!item.material && !item.noSalvage)
				ctxConfig.push(menuItems.salvage);
		}

		if (item.quantity > 1 && !item.quest)
			ctxConfig.push(menuItems.split);

		ctxConfig.push(menuItems.link);

		if (!item.eq && !item.active && !item.noDestroy) {
			ctxConfig.push(menuItems.divider);
			ctxConfig.push(menuItems.destroy);
		}

		if (isMobile)
			this.hideTooltip(null, this.hoverItem);

		const eBeforeShowItemContextMenu = {
			sourceUi: 'inventory',
			item: this.hoverItem,
			ctxConfig
		};

		events.emit('beforeShowItemContextMenu', eBeforeShowItemContextMenu);

		if (ctxConfig.length > 0)
			events.emit('onContextMenu', eBeforeShowItemContextMenu.ctxConfig, e);

		e.preventDefault();

		return false;
	},

	splitStackStart (item) {
		let box = this.find('.split-box').show();
		box.data('item', item);

		box.find('.amount')
			.val('1')
			.focus();
	},

	splitStackEnd (cancel, e) {
		let box = this.find('.split-box');

		if ((cancel) || (!e) || (e.target !== box.find('.btnSplit')[0])) {
			if ((cancel) && (!$(e.target).hasClass('btn')))
				box.hide();

			return;
		}

		box.hide();

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'inventory',
				method: 'splitStack',
				data: {
					itemId: box.data('item').id,
					stackSize: ~~this.find('.split-box .amount').val()
				}
			}
		});
	},

	onChangeStackAmount (e, amount) {
		let item = this.find('.split-box').data('item');
		let delta = amount;
		if (e)
			delta = (e.originalEvent.deltaY > 0) ? -1 : 1;
		if (input.isKeyDown('shift', true))
			delta *= 10;
		let elAmount = this.find('.split-box .amount');

		elAmount.val(Math.max(1, Math.min(item.quantity - 1, ~~elAmount.val() + delta)));
	},

	onEnterStackAmount () {
		let el = this.find('.split-box .amount');
		let val = el.val();
		if (+val !== ~~+val)
			el.val('');
		else if (val) {
			let item = this.find('.split-box').data('item');
			if (val < 0)
				val = '';
			else if (val > item.quantity - 1)
				val = item.quantity - 1;

			el.val(val);
		}
	},

	hideTooltip () {
		if (this.dragEl) {
			this.hoverCell = null;

			return;
		}

		events.emit('onHideItemTooltip', this.hoverItem);
		this.hoverItem = null;
	},
	onHover (el, item, e) {
		if (this.dragEl) {
			this.hoverCell = el;
			this.find('.hover').removeClass('hover');
			el.addClass('hover');

			return;
		}

		if (item)
			this.hoverItem = item;
		else
			item = this.hoverItem;

		if (!item)
			return;

		let ttPos = null;

		if (el) {
			if (el.hasClass('new')) {
				el.removeClass('new');
				el.find('.quantity').html((item.quantity > 1) ? item.quantity : '');
				delete item.isNew;
			}

			ttPos = {
				x: ~~(e.clientX + 32),
				y: ~~(e.clientY)
			};
		}

		events.emit('onShowItemTooltip', item, ttPos, true);
	},

	onGetInventorySize (inventorySize) {
		this.inventorySize = inventorySize;

		if (this.shown)
			this.build();
	},

	onGetItems (items, rerender) {
		this.items = items;

		if ((this.shown) && (rerender))
			this.build();
	},
	onDestroyItems (itemIds) {
		itemIds.forEach(id => {
			let item = this.items.find(i => i.id === id);
			if (item === this.hoverItem)
				this.hideTooltip();

			_.spliceWhere(this.items, i => i.id === id);
		});

		if (this.shown)
			this.build();
	},

	onAfterShow () {
		this.find('.split-box').hide();
		this.build();
		this.hideTooltip();
	},

	beforeDestroy () {
		this.el.parent().css('background-color', 'transparent');
		this.el.parent().removeClass('blocking');
	},

	beforeHide () {
		if (this.oldSpellsZIndex) {
			$('.uiSpells').css('z-index', this.oldSpellsZIndex);
			this.oldSpellsZIndex = null;
		}

		events.emit('onHideInventory');
		events.emit('onHideContextMenu');
		this.hideTooltip();
	},

	performItemAction (item, action) {
		if (!item)
			return;
		else if ((action === 'equip') && ((item.material) || (item.quest) || (!window.player.inventory.canEquipItem(item))))
			return;
		else if ((action === 'learnAbility') && (!window.player.inventory.canEquipItem(item)))
			return;

		let data = { itemId: item.id };

		let cpn = 'inventory';
		if (['equip', 'setQuickSlot'].includes(action)) {
			cpn = 'equipment';

			if (action === 'setQuickSlot') {
				data = {
					itemId: item.id,
					slot: 0
				};
			}
		}

		if (action === 'useItem')
			this.hide();

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn,
				method: action,
				data
			}
		});
	},

	onKeyDown (key) {
		if (key === 'i')
			this.toggle();
		else if (key === 'shift' && this.hoverItem)
			this.onHover();
	},

	onKeyUp (key) {
		if (key === 'shift' && this.hoverItem)
			this.onHover();
	}
};
