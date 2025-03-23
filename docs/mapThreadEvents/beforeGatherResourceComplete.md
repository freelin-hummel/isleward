# beforeGatherResourceComplete
The event fires on map threads right before giving players the item(s) they've gathered from resource nodes.
```js
const yourMod = {
	initMapThread: function () {
		[
			'beforeGatherResourceComplete'
		].forEach(e => this.events.on(e, this[e].bind(this)));
	},

	beforeGatherResourceComplete: function (eventMessage) {
		const { 
			obj,
			source,
			nodeType,
			blueprint,
			xp,
			items,
			noChangeAmount
		} = eventMessage;
	}
};
```

## Arguments

### `obj`
The resource node itself (the object in the world you've interacted with). Modifying this will have no impact on the actual in-game object.

### `source`
The player that performed the gather action. Modifying this will have no impact on the actual in-game object.

### `nodeType`
The type of resource node being gathered. At the time of writing (`v0.18`), `nodeType` is one of `['herb', 'fish']`

### `blueprint`
An object that contains the following fields:
* `type`
  * `(string)` The node type.
* `sheetName`
  * `(string)` The spritesheet used to render the node in the world.
* `cell`
  * `(integer)` The cell index of the world sprite inside the spritesheet.
* `name`
  * `(string)` The name of the resource node in the world.
* `gatherChance`
  * `(integer)` A number between `0` and `100` defining the chance a player has to successfully gather this node.
* `itemName`
  * `(string)` This string isn't set by default. Refer to the section on `Modifying Argument` for more info about it.
* `itemSheet`
  * `(string)` The spritesheet used to render the item that the player will obtain from successfully gathering this node
* `itemSprite`
  * `(array)` The coordinate of the item inside the spritesheet (itemSheet). E.g. `[0, 3]]`
* `itemAmount`
  * `(array)` Determines how many of the resource node's items the player will get upon successfully gathering this node. E.g. `[5, 9]` where `5` is the minimum amount and `9` is the maximum amount. If not set, the player will get `1`.
* Other
  * Fishing nodes have the following extra fields: `x`, `y`, `properties`, `layerName`, `quantity`, `width`, `height`, `ttl`, `positions`, `baseWeight`.

### `xp`
The amount of `xp` the player will receive upon successfully gathering the resource node.

### `items`
An array of items the player will receive upon successfully gathering the resource node.

## Modifying Arguments

### `obj`
Changing this has no effect on the game. It is effectively read-only.

### `source`
Changing this has no effect on the game. It is effectively read-only.

### `nodeType`
Changing this has no effect on the game. It is effectively read-only.

### `blueprint`
The following fields may be modified on the `blueprint` object:
* `noChangeAmount`
  * Setting this to `true` will cause the resource node not to reduce its quantity after successfully gathering. For pools of fish, this means the amount of fish in the pool will stay unaltered and for herbs this means the node will not be destroyed.
* `itemName`
  * Setting this to a `string` will cause the *first item* gathered from the resource node to have this name
* `itemAmount`
  * Modifying this will change how many items the player will obtain from successfully gathering this node. If the value is not set, it will result to `1` item being obtained.
* `gatherChance`
  * Modifying this (to a value between `1` and `100`) will modify the chance the player has to gather this node. This only applies to `nodeType: 'fish'`
* `baseWeight`
  * Changing this to an integer value will modify the weight of the fish being caught.
* `xp`
  * Changing this will affect how much `xp` the player gets upon successfully gathering.
* `items`
  * Modifying this will affect which items the player obtains upon successfully gathering.

## Modifying `eventMessage.items`
1. Items may be added to the array.
2. For fishing nodes, any item in this array that does not have a `slot` property, will be given a `weight`, `worth` and `name` appropriate to its weight/quality.
3. For non fishing nodes, all items will receive a `worth` of `1` if they do not have a `worth` specified.
4. For non fishing nodes, the first item in the array will receive `eventMessage.blueprint.itemName` if it is specified
5. For non fishing nodes, the first item in the array will receive a `quantity` dictated by `eventMessage.blueprint.itemAmount` if it is specified

## Sample
```js
const itemGenerator = require('../../items/generator');

const yourMod = {
	initMapThread: function () {
		[
			'beforeGatherResourceComplete'
		].forEach(e => this.events.on(e, this[e].bind(this)));
	},

	beforeGatherResourceComplete: function (eventMessage) {
		const {
			nodeType,
			items
		} = eventMessage;

		//Check to make sure we're fishing
		if (nodeType !== 'fish')
			return;

		//Only do something when we fish up a sun carp
		if (items[0].name !== 'Sun Carp')
			return;

		//Add a new item that should be obtained from the gather
		items.push(itemGenerator.generate({
			name: 'Stinky Fish Pants',
			slot: 'legs',
			level: 1
		}));
	}
};
```
