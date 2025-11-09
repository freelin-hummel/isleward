import events from '../../../js/system/events';
import client from '../../../js/system/client';
import template from './template.html?raw';
import './styles.css';
import renderItem from '../../shared/renderItem';

export default {
	tpl: template,

	centered: true,
	hoverItem: null,

	items: [],
	maxItems: null,

	modal: true,
	hasClose: true,

	postRender () {
		[
			'onKeyUp',
			'onKeyDown',
			'onOpenStash',
			'onAddStashItems',
			'onRemoveStashItems'
		]
			.forEach(e => {
				this.onEvent(e, this[e].bind(this));
			});
	},

	build () {
		const { el, maxItems, items } = this;

		el.removeClass('scrolls');
		if (maxItems > 50)
			el.addClass('scrolls');

		const container = this.el.find('.grid').empty();

		const renderItemCount = Math.max(items.length, maxItems);

		for (let i = 0; i < renderItemCount; i++) {
			const item = items[i];
			const itemEl = renderItem(container, item);

			if (!item)
				continue;

			let moveHandler = this.onHover.bind(this, itemEl, item);
			let downHandler = () => {};
			if (isMobile) {
				moveHandler = () => {};
				downHandler = this.onHover.bind(this, itemEl, item);
			}

			itemEl
				.data('item', item)
				.on('mousedown', downHandler)
				.on('mousemove', moveHandler)
				.on('mouseleave', this.hideTooltip.bind(this, itemEl, item))
				.find('.icon')
				.on('contextmenu', this.showContext.bind(this, item));
		}
	},

	showContext (item, e) {
		events.emit('onContextMenu', [{
			text: 'withdraw',
			callback: this.withdraw.bind(this, item)
		}], e);

		e.preventDefault();

		return false;
	},

	hideTooltip () {
		events.emit('onHideItemTooltip', this.hoverItem);
		this.hoverItem = null;
	},

	onHover (el, item) {
		if (item)
			this.hoverItem = item;
		else
			item = this.hoverItem;

		let ttPos = null;

		if (el) {
			el.removeClass('new');
			delete item.isNew;

			let elOffset = el.offset();
			ttPos = {
				x: ~~(elOffset.left + 74),
				y: ~~(elOffset.top + 4)
			};
		}

		events.emit('onShowItemTooltip', item, ttPos, true);
	},

	onGetStashItems (items) {
		this.items = items;

		if (this.shown)
			this.build();
	},

	onAddStashItems (addItems) {
		const { items } = this;

		addItems.forEach(newItem => {
			const existIndex = items.findIndex(i => i.id === newItem.id);
			if (existIndex !== -1)
				items.splice(existIndex, 1, newItem);
			else
				items.push(newItem);
		});
	},

	onRemoveStashItems (removeItemIds) {
		const { items } = this;

		removeItemIds.forEach(id => {
			const item = items.find(i => i.id === id);
			if (item === this.hoverItem)
				this.hideTooltip();

			_.spliceWhere(items, i => i.id === id);
		});

		if (this.shown)
			this.build();
	},

	onAfterShow () {
		if ((!this.shown) && (!window.player.stash.active))
			return;

		events.emit('onShowOverlay', this.el);
		this.build();
	},

	beforeHide () {
		if ((!this.shown) && (!window.player.stash.active))
			return;

		events.emit('onHideOverlay', this.el);
		events.emit('onHideContextMenu');
	},

	onOpenStash ({ items, maxItems }) {
		this.maxItems = maxItems;

		this.show();

		this.onGetStashItems(items);
	},

	beforeDestroy () {
		events.emit('onHideOverlay', this.el);
	},

	withdraw (item) {
		if (!item)
			return;

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'stash',
				method: 'withdraw',
				data: { itemId: item.id }
			}
		});
	},

	onKeyDown (key) {
		if (key === 'shift' && this.hoverItem)
			this.onHover();
	},

	onKeyUp (key) {
		if (key === 'shift' && this.hoverItem)
			this.onHover();
	}
};
