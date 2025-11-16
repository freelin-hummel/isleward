/* eslint-disable max-lines-per-function */
const eventEmitter = require('../misc/events');

const generator = require('../items/generator');
const statGenerator = require('../items/generators/stats');
const skins = require('../config/skins');

const sendMessage = ({ instance, id, serverId }, color, message) => {
	instance.syncer.queue('onGetMessages', {
		id: id,
		messages: [{
			class: color,
			message,
			type: 'info'
		}]
	}, [serverId]);
};

module.exports = {
	type: 'trade',

	items: null,
	buybackList: {},

	maxBuyback: 10,

	blueprint: null,
	gold: 0,

	target: null,
	action: null,

	regenCd: 0,
	regenCdMax: 1710,

	markup: {
		buy: 1,
		sell: 1
	},

	init: function (blueprint) {
		const { gold, markup, items, regenCdMax = this.regenCdMax } = blueprint;

		this.blueprint = blueprint;
		this.gold = gold;
		this.items = [];
		this.regenCd = 0;
		this.regenCdMax = regenCdMax;

		if (!items)
			return;

		this.markup = markup;

		if (blueprint.faction) {
			this.obj.extendComponent('trade', 'factionVendor', blueprint);

			return;
		}

		this.update();
	},

	update: function () {
		if (!this.blueprint.items?.max)
			return;

		if (this.regenCd > 0) {
			this.regenCd--;

			return;
		}

		const { items, blueprint } = this;
		const { forceItems, level: itemLevelRange, items: blueprintItems } = blueprint;
		const { max: amountOfItemsForSale, extra: extraItems, infinite: itemsAreInfinite } = blueprintItems;

		this.regenCd = this.regenCdMax;

		items.length = 0;

		if (forceItems) {
			forceItems.forEach((f, i) => {
				const forcedItem = extend({}, f);

				let forcedItemId = 0;
				items.forEach(checkItem => {
					if (checkItem.id >= forcedItemId)
						forcedItemId = checkItem.id + 1;
				});

				if (forcedItem.type === 'skin') {
					const skinBlueprint = skins.getBlueprint(forcedItem.skinId);

					forcedItem.name = skinBlueprint.name;
					forcedItem.sprite = skinBlueprint.sprite;
					forcedItem.spritesheet = skinBlueprint.spritesheet;
				}

				forcedItem.id = forcedItemId;

				items.push(forcedItem);
			});
		}

		if (extraItems) {
			extraItems.forEach(e => {
				let item = extend({}, e);

				if (item.type === 'skin') {
					const skinBlueprint = skins.getBlueprint(item.skinId);

					item.skinId = item.skinId;
					item.name = skinBlueprint.name;
					item.sprite = skinBlueprint.sprite;
				} else if (item.generate) {
					const generated = generator.generate(item);

					if (item.worth)
						generated.worth = item.worth;
					if (item.infinite)
						generated.infinite = true;

					if (item.factions)
						generated.factions = item.factions;

					item = generated;
				}

				let id = 0;
				items.forEach(checkItem => {
					if (checkItem.id >= id)
						id = checkItem.id + 1;
				});

				item.id = id;

				items.push(item);
			});
		}

		for (let i = 0; i < amountOfItemsForSale; i++) {
			let level = 1;
			if (itemLevelRange)
				level = itemLevelRange.min + ~~(Math.random() * (itemLevelRange.max - itemLevelRange.min));

			const item = generator.generate({
				noSpell: true,
				level
			});

			let id = 0;
			items.forEach(checkItem => {
				if (checkItem.id >= id)
					id = checkItem.id + 1;
			});

			if (itemsAreInfinite)
				item.infinite = true;

			item.id = id;

			items.push(item);
		}

		//When we regenerate, we need to find all players currently looking at our
		// shop and tell them to refresh their Trade UI
		const { obj: { instance: { syncer, objects } } } = this;

		const playersToRefresh = objects.filter(f => (
			f.player &&
			f.trade?.target === this.obj &&
			f.trade.action === 'buy'
		));

		playersToRefresh.forEach(p => {
			syncer.queue('onGetAnnouncement', {
				msg: 'The shop has been restocked.'
			}, [p.serverId]);

			p.trade.startBuy({
				target: this.obj,
				action: 'buy'
			});
		});
	},

	startBuy: function (msg) {
		if (!msg.has('target') && !msg.targetName)
			return false;

		let target = msg.target;

		if (target && !target.id)
			target = this.obj.instance.objects.objects.find(o => o.id === target);
		else if (msg.targetName)
			target = this.obj.instance.objects.objects.find(o => ((o.name) && (o.name.toLowerCase() === msg.targetName.toLowerCase())));

		this.target = null;
		this.action = 'buy';

		if ((!target) || (!target.trade))
			return false;

		this.target = target;

		let itemList = target.trade.getItems(this.obj);
		let markup = target.trade.markup.sell;

		if (msg.action === 'buyback') {
			itemList = target.trade.buybackList[this.obj.name] || [];
			markup = target.trade.markup.buy;
		}

		this.obj.syncer.set(true, 'trade', 'buyList', {
			markup: markup,
			items: itemList,
			buyback: (msg.action === 'buyback')
		});
	},

	buySell: function (msg) {
		if (msg.action === 'buy')
			this.buy(msg);
		else if (msg.action === 'sell')
			this.sell(msg);
		else if (msg.action === 'buyback')
			this.buyback(msg);
	},

	buy: async function (msg) {
		let target = this.target;
		if (!target)
			return;

		let item = null;
		let targetTrade = target.trade;
		let markup = targetTrade.markup.sell;

		if (msg.action === 'buyback') {
			item = targetTrade.findBuyback(msg.itemId, this.obj.name);
			markup = targetTrade.markup.buy;
		} else
			item = targetTrade.findItem(msg.itemId, this.obj.name);

		if (!item) {
			this.resolveCallback(msg);
			return;
		}

		let canAfford = false;
		if (item.worth.currency) {
			let currencyItem = this.obj.inventory.items.find(i => (i.name === item.worth.currency));
			canAfford = ((currencyItem) && (currencyItem.quantity >= item.worth.amount));
		} else
			canAfford = this.gold >= ~~(item.worth * markup);

		if (!canAfford) {
			sendMessage(this.obj, 'color-redA', 'You can\'t afford that item.');
			this.resolveCallback(msg);
			return;
		}

		if (!targetTrade.canBuy(msg.itemId, this.obj, msg.action)) {
			this.resolveCallback(msg);
			return;
		}

		if (item.type === 'skin') {
			let haveSkin = await this.obj.auth.doesOwnSkin(item.skinId);

			if (haveSkin) {
				sendMessage(this.obj, 'color-redA', 'You have already unlocked that skin.');
				this.resolveCallback(msg);
				return;
			}
		}

		if (msg.action === 'buyback')
			targetTrade.removeBuyback(msg.itemId, this.obj.name);
		else if ((item.type !== 'skin') && (!item.infinite)) {
			targetTrade.removeItem(msg.itemId, this.obj.name);
			targetTrade.genLeft++;
		}

		if (item.type !== 'skin') {
			//Some shop items have both an in-shop definition (item) as well as a definition
			// for the item that should be given to the player (giveItem)
			let clonedItem = extend({}, item.giveItem || item);

			if (item.worth.currency)
				clonedItem.worth = 0;
			if ((item.stats) && (item.stats.stats)) {
				delete clonedItem.stats;
				statGenerator.generate(clonedItem, {});
			}

			delete clonedItem.infinite;

			if (clonedItem.generate) {
				clonedItem = generator.generate(clonedItem);
				delete clonedItem.generate;

				if (item.factions)
					clonedItem.factions = item.factions;
			}

			if (!this.obj.inventory.getItem(clonedItem)) {
				this.resolveCallback(msg);
				return;
			}

			if (!item.infinite)
				this.obj.syncer.setArray(true, 'trade', 'removeItems', item.id);
		}

		if (item.worth.currency) {
			let currencyItem = this.obj.inventory.items.find(i => (i.name === item.worth.currency));
			this.obj.inventory.destroyItem({ itemId: currencyItem.id }, item.worth.amount, true);
		} else {
			targetTrade.gold += ~~(item.worth * markup);
			this.gold -= ~~(item.worth * markup);
			this.obj.syncer.set(true, 'trade', 'gold', this.gold);
		}

		//Hack to always redraw the UI (to give items the red overlay if they can't be afforded)
		this.obj.syncer.setArray(true, 'trade', 'redraw', true);

		this.resolveCallback(msg);
	},

	buyback: function (msg) {
		msg.action = 'buyback';
		this.buy(msg);
	},

	sell: function (msg) {
		let target = this.target;
		if (!target)
			return;

		let targetTrade = target.trade;

		const item = this.obj.inventory.findItem(msg.itemId);
		if (!item || item.worth <= 0 || item.eq || item.noDestroy)
			return;

		const oldQuantity = item.quantity;
		this.obj.inventory.destroyItem({ itemId: msg.itemId });

		if (oldQuantity)
			item.quantity = oldQuantity;

		let worth = ~~((item.quantity ?? 1) * item.worth * targetTrade.markup.buy);

		this.gold += worth;

		this.obj.syncer.set(true, 'trade', 'gold', this.gold);
		this.obj.syncer.setArray(true, 'trade', 'removeItems', item.id);

		let buybackList = targetTrade.buybackList;
		let name = this.obj.name;
		if (!buybackList[name])
			buybackList[name] = [];

		buybackList[name].push(item);
		if (buybackList[name].length > this.maxBuyback)
			buybackList[name].splice(0, 1);
	},

	startSell: function (msg) {
		let target = msg.target;
		let targetName = (msg.targetName || '').toLowerCase();

		if (!target && !targetName)
			return false;

		if (target && !target.id)
			target = this.obj.instance.objects.objects.find(o => o.id === target);
		else if (targetName)
			target = this.obj.instance.objects.objects.find(o => ((o.name) && (o.name.toLowerCase() === targetName)));

		this.target = null;
		this.action = 'sell';

		if ((!target) || (!target.trade))
			return false;

		this.target = target;

		let itemList = this.obj.inventory.items
			.filter(i => i.worth > 0 && !i.eq && !i.noDestroy);
		itemList = extend([], itemList);

		const emBeforeSendSellableItems = {
			seller: this.obj,
			items: itemList
		};
		eventEmitter.emit('beforeSendSellableItems', emBeforeSendSellableItems);

		this.obj.syncer.set(true, 'trade', 'sellList', {
			markup: target.trade.markup.buy,
			items: itemList.map(i => this.obj.inventory.simplifyItem(i))
		});
	},

	startBuyback: function (msg) {
		msg.action = 'buyback';
		this.startBuy(msg);
		this.action = 'buyback';
	},

	removeItem: function (itemId) {
		return this.items.spliceFirstWhere(i => i.id === itemId);
	},

	removeBuyback: function (itemId, name) {
		return (this.buybackList[name] || []).spliceFirstWhere(i => i.id === itemId);
	},

	getItems: function (requestedBy) {
		let items = this.items.map(i => requestedBy.inventory.simplifyItem(i));

		return items;
	},

	canBuy: function (itemId, requestedBy, action) {
		let item = null;
		if (action === 'buy')
			item = this.findItem(itemId, requestedBy.name);
		else if (action === 'buyback')
			item = this.findBuyback(itemId, requestedBy.name);

		let result = true;
		if (item.factions)
			result = requestedBy.reputation.canEquipItem(item);

		if (!result) {
			const message = 'your reputation is too low to buy that item';
			requestedBy.social.notifySelf({ message });
		}

		return result;
	},

	findItem: function (itemId, sourceName) {
		return this.items.find(i => i.id === itemId);
	},

	findBuyback: function (itemId, sourceName) {
		return (this.buybackList[sourceName] || []).find(i => i.id === itemId);
	},

	resolveCallback: function (msg, result) {
		let callbackId = msg.has('callbackId') ? msg.callbackId : msg;
		result = result || [];

		if (!callbackId)
			return;

		process.send({
			module: 'atlas',
			method: 'resolveCallback',
			msg: {
				id: callbackId,
				result: result
			}
		});
	},

	simplify: function (self) {
		let result = {
			type: 'trade'
		};

		if (self)
			result.gold = this.gold;

		return result;
	},

	events: {
		beforeMove: function () {
			if (!this.target)
				return;

			this.obj.syncer.set(true, 'trade', 'closeTrade', true);

			this.target = null;
		}
	}
};
