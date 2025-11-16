import events from '../../../js/system/events';
import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';
import renderItem from '../../shared/renderItem';

export default {
	tpl: template,

	centered: true,

	isFlex: true,

	modal: true,
	hasClose: true,

	list: null,
	action: null,

	postRender () {
		this.onEvent('onGetTradeList', this.onGetTradeList.bind(this));
		this.onEvent('onCloseTrade', this.hide.bind(this));
	},

	onGetTradeList (itemList, action) {
		itemList = itemList || this.itemList;
		action = action || this.action;

		this.itemList = itemList;
		this.action = action;

		this.find('.gold .amount').html(window.player?.trade?.gold);

		this.find('.heading-text').html(action[0].toUpperCase() + action.substring(1));

		let uiInventory = $('.uiInventory').data('ui');

		let container = this.el.find('.grid')
			.empty();

		let buyItems = itemList.items;

		buyItems.forEach(item => {
			if ((item === this.hoverItem))
				this.onHover(null, item);
		});

		const itemsHavePositions = action === 'sell' || buyItems.find(b => b.pos);

		const iLen = Math.max(
			window.player?.inventory?.inventorySize ?? 50,
			50
		);

		for (let i = 0; i < iLen; i++) {
			let item = buyItems[i];

			if (itemsHavePositions)
				item = buyItems.find(b => b.pos === i);

			if (!item) {
				renderItem(container, null)
					.on('click', uiInventory.hideTooltip.bind(uiInventory));

				continue;
			}

			item = $.extend(true, {}, item);

			let itemEl = renderItem(container, item);

			itemEl
				.data('item', item)
				.find('.icon')
				.addClass(item.type);

			if (isMobile)
				itemEl.on('click', this.onHover.bind(this, itemEl, item, action));
			else {
				itemEl
					.on('click', this.onClick.bind(this, itemEl, item, action))
					.on('mousemove', this.onHover.bind(this, itemEl, item, action))
					.on('mouseleave', uiInventory.hideTooltip.bind(uiInventory, itemEl, item));
			}

			if (action === 'buy') {
				let noAfford = false;
				if (item.worth.currency) {
					let currencyItems = window.player.inventory.items.find(f => f.name === item.worth.currency);
					noAfford = ((!currencyItems) || (currencyItems.quantity < item.worth.amount));
				} else
					noAfford = (~~(item.worth * this.itemList.markup) > window.player.trade.gold);

				if (!noAfford && item.factions)
					noAfford = item.factions.some(f => f.tier > window.player.reputation.getTier(f.id));

				if (noAfford)
					$('<div class="no-afford"></div>').appendTo(itemEl);
			}

			if (item.worth.currency)
				item.worthText = item.worth.amount + 'x ' + item.worth.currency;
			else
				item.worthText = `${~~(itemList.markup * item.worth)} Gold`;
		}

		this.center();
		this.show();
		events.emit('onShowOverlay', this.el);
	},

	onClick (el, item, action, e) {
		el.addClass('disabled');

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'trade',
				method: 'buySell',
				data: {
					itemId: item.id,
					action
				}
			},
			callback: this.onServerRespond.bind(this, el)
		});

		events.emit('onBuySellItem', this.el);

		let uiInventory = $('.uiInventory').data('ui');
		uiInventory.hideTooltip(el, item, e);
	},

	onHover (el, item, action, e) {
		let uiInventory = $('.uiInventory').data('ui');
		uiInventory.onHover(el, item, e);

		let canAfford = true;
		if (action === 'buy') {
			if (item.worth.currency) {
				let currencyItems = window.player.inventory.items.find(i => i.name === item.worth.currency);
				canAfford = (currencyItems && currencyItems.quantity >= item.worth.amount);
			} else
				canAfford = (item.worth * this.itemList.markup <= window.player.trade.gold);
		}

		let uiTooltipItem = $('.uiTooltipItem').data('ui');
		uiTooltipItem.showWorth(canAfford);

		if (isMobile)
			uiTooltipItem.addButton(action, this.onClick.bind(this, el, item, action));
	},

	beforeHide () {
		events.emit('onHideOverlay', this.el);
		$('.uiInventory').data('ui').hideTooltip();
	},

	onServerRespond (el) {
		el.removeClass('disabled');
	}
};
