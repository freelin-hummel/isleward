//System
const eventEmitter = require('../../misc/events');

//Helpers
const { isItemStackable } = require('./helpers');

const getNextId = items => {
	let id = 0;
	const iLen = items.length;

	for (let i = 0; i < iLen; i++) {
		const fItem = items[i];
		if (fItem.id >= id) 
			id = fItem.id + 1;
	}

	return id;
};

const dropBagForOverflow = (cpnInv, item) => {
	const { obj: { x, y, name, instance } } = cpnInv;

	const dropCell = instance.physics.getOpenCellInArea(x - 1, y - 1, x + 1, y + 1);
	if (!dropCell)
		return;

	cpnInv.createBag(dropCell.x, dropCell.y, [item], name);
	const msg = `Your inventory is too full to receive (${item.name}). It has been dropped on the ground.`;
	cpnInv.notifyNoBagSpace(msg);
};

const notifyPlayer = (obj, item, quantity, hideAlert, hideMessage) => {
	const { instance: { syncer } } = obj;

	if (!hideAlert) {
		syncer.queue('onGetDamage', {
			id: obj.id,
			event: true,
			text: 'loot'
		}, -1);
	}

	if (hideMessage)
		return;

	const { name, stats, quality } = item;

	let msg = name;
	if (quantity)
		msg += ` x${quantity}`;
	else if (stats?.weight)
		msg += ` ${stats.weight}lb`;

	const messages = [{
		class: `q${quality}`,
		message: `loot: {${msg}}`,
		item,
		type: 'loot'
	}];

	syncer.queue('onGetMessages', {
		id: obj.id,
		messages
	}, [obj.serverId]);
};

const stackExistingItem = (items, item) => {
	const { name, quantity = 1 } = item;

	if (!isItemStackable(item))
		return null;

	const existItem = items.find(i => i.name === name);
	if (!existItem || !isItemStackable(existItem))
		return null;

	existItem.quantity = ~~(existItem.quantity ?? 1) + ~~quantity;

	return existItem;
};

const handleInventoryFull = (cpnInv, item, hideMessage, createBagIfFull) => {
	if (cpnInv.hasSpace(item))
		return false;

	if (createBagIfFull)
		dropBagForOverflow(cpnInv, item);
	else if (!hideMessage)
		cpnInv.notifyNoBagSpace();

	return true;
};

const setItemPos = (items, item) => {
	const iLen = items.length;
	let pos = iLen;

	for (let i = 0; i < iLen; i++) {
		if (!items.some(fi => fi.pos === i)) {
			pos = i;

			break;
		}
	}

	item.pos = pos;
};

//Method
module.exports = (cpnInv, item, hideMessage, noStack, hideAlert, createBagIfFull = false) => {
	const { obj, items } = cpnInv;

	obj.instance.eventEmitter.emit('onBeforeGetItem', item, obj);
	eventEmitter.emit('beforePlayerGetItem', obj, item);

	if (!noStack) {
		const getQuantity = item.quantity;

		const existingItem = stackExistingItem(items, item);
		if (existingItem !== null) {
			notifyPlayer(obj, item, getQuantity, hideAlert, hideMessage);

			obj.syncer.deleteFromArray(true, 'inventory', 'getItems', i => i.id === existingItem.id);
			obj.syncer.setArray(true, 'inventory', 'getItems', cpnInv.simplifyItem(existingItem), true);

			if (!hideMessage && item.fromMob) 
				obj.fireEvent('afterLootMobItem', item);

			return existingItem;
		}
	}

	if (handleInventoryFull(cpnInv, item, hideMessage, createBagIfFull))
		return false;

	items.push(item);

	delete item.pos;

	item.id = getNextId(items);
	item.quality = item.quality ?? 0;

	if (!item.eq)
		setItemPos(items, item);
	else {
		delete item.eq;

		if (item.ability) {
			cpnInv.learnAbility({
				itemId: item.id,
				slot: item.runeSlot
			});
		} else
			obj.equipment.equip({ itemId: item.id });
	}

	if (item.effects) 
		cpnInv.hookItemEvents([item]);

	if (obj.player) {
		if (item.has('quickSlot')) {
			obj.equipment.setQuickSlot({
				itemId: item.id,
				slot: item.quickSlot
			});
		}

		if (item.fromMob) {
			delete item.fromMob;

			if (!hideMessage)
				obj.fireEvent('afterLootMobItem', item);
		}

		notifyPlayer(obj, item, item.quantity, hideAlert, hideMessage);

		//Some handlers will sync the item to the player themselves
		if (!item.eq && !item.has('quickSlot') && !item.effects) {
			obj.syncer.deleteFromArray(true, 'inventory', 'getItems', i => i.id === item.id);
			obj.syncer.setArray(true, 'inventory', 'getItems', cpnInv.simplifyItem(item), true);
		}
	}

	return item;
};
