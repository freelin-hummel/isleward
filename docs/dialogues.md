# Dialogues

## Adding dialogue to a mob

### Hard-coded
1. In the map file, place your mob in the `mobs` layer and give it a name
	* The case you use here will be used in-game
2. Still in the map file, place a rectangle around your mob in the `notices` layer and call it `talkYourMobName` 
	* The name of the notice does not actually matter, we'll define the logic in the zone file
	* If you call your mob `Ben` you can theoretically call your notice anything, like `spoonMonkey`, but standardizing on `talkYourMobName` is more maintainable
3. In your map's zone file, add an entry for the notice inside `objects`
	* Note that in the zone file, names must always be lower case. I.e. `talkYourMobName` -> `talkyourmobname` and `YourMobName` -> `yourmobname`
	* This entry will, when the player enters the rectangle you places in the `notices` layer, cause a player to start talking to the mob
	* If your mob has a space in its name, the entry should look like this: `objects: { 'your mob name': { ... } }`
```js
objects: {
	talkyourmobname: {
		properties: {
			cpnNotice: {
				actions: {
					enter: {
						cpn: 'dialogue',
						method: 'talk',
						args: [{
							targetName: 'yourmobname'
						}]
					},
					exit: {
						cpn: 'dialogue',
						method: 'stopTalk'
					}
				}
			}
		}
	}
}
```
4. In the same folder as your map, create a `dialogues.js` file if one does not exist yet
	* Again, names must be in lower case
	* We'll define how the dialogue objects (`{}`) in this file look in a later section in this document
```js
module.exports = {
	yourmobname: {}
};
```

### (Startup) Add dialogue to an existing mob with no existing dialogue
If, when a map starts up, there is a mob with no dialogue, you can add dialogue to it the following manner:
```js
const yourMod = {
	initMapThread: function () {
		[
			'onAfterBuildMob'
		].forEach(e => this.events.on(e, this[e].bind(this)));
	},

	onAfterBuildMob: function ({ zoneName, mob }) {
		/*
			Note that zoneName isn't the map name, instead, it's the
			name for the zone as defined in the zone file which is
			normally uppercase and can contain spaces, unlike map names.

			Also note that mob.name has the same case as was defined in
			your map file. That is, not lower case like in the zone or
			dialogue files.
		*/
		if (zoneName !== 'YourZoneName' || mob.name !== 'YourMobName')
			return;

		mob.addComponent('dialogue', {
			config: {
				1: {
					msg: 'Hi!',
					options: {
						1.1: {
							msg: 'How are you?',
							goto: 2
						}
					}
				},
				2: {
					msg: 'Good.',
					options: {}
				}
			}
		});

		instancer.instances[0].objects.buildObjects([{
			properties: {
				x: mob.x - 1,
				y: mob.y - 1,
				width: 3,
				height: 3,
				cpnNotice: {
					actions: {
						enter: {
							cpn: 'dialogue',
							method: 'talk',
							args: [{
								targetName: mob.name
							}]
						},
						exit: {
							cpn: 'dialogue',
							method: 'stopTalk'
						}
					}
				}
			}
		}]);
	}
};
```

### Add dialogue to an existing mob with existing dialogue
The method described in this section can either be applied in the `onAfterBuildMob` event, as in the previous section, or at any other juncture where you have access to a mob that already has dialogue defined for it.

That is, we can do it at startup, or dynamically later.

Assume we have a mob with dialogue defined as follows:
```js
yourmobname: {
	1: {
		msg: 'Hi!',
		options: {
			1.1: {
				msg: 'How are you?',
				goto: 2
			}
		}
	},
	2: {
		msg: 'Good',
		options: {}
	}
}
```

We can then alter its dialogue in any way we wish.

#### Removing Options
```js
onAfterBuildMob: function ({ zoneName, mob }) {
	if (zoneName !== 'YourZoneName' || mob.name !== 'YourMobName')
		return;

	const dialogueStates = mob.dialogue.states;

	delete dialogueStates[1].options['1.1'];
}
```

#### Adding Options / States
```js
onAfterBuildMob: function ({ zoneName, mob }) {
	if (zoneName !== 'YourZoneName' || mob.name !== 'YourMobName')
		return;

	dialogueStates[1].options['1.2'] = {
		msg: 'Say something else.',
		goto: 3
	};

	dialogueStates[3] = {
		msg: 'Something else!',
		options: {}
	};
}
```

## Building Dialogues
Dialogue objects (either within `dialogues.js` file or within programmatically created dialogues) must follow a very specific format. The format will be discussed in this section.

### General Layout
```js
{
	yourmobname: {
		1: {
			msg: 'Hi',
			options: {
				1.1: {
					msg: 'How are you?',
					goto: 2
				}
			}
		},
		2: {
			msg: 'Good',
			options: {}
		}
	}
}
```
* In this example we have two states: `1` and `2`
* State `1` has 1 option (something for the player to say/ask to the mob)
	* When an option is chosen, the dialogue moves to the corresponding state
* States with no options should still define `options: {}`
* All states will receive the option `Goodbye` which stop the dialogue with the mob
* Never use state `999` as this is used internally for the `Goodbye` options' target state

### Multiple Sub-States
States can also have an array of possible messages to be chosen. These are called sub-states. When a state's `msg` array contains more than one entry, a random one will be chosen for that state each time a player reaches it. In this example, state `1` has 2 possible sub-states, each with their own options:
```js
msg: [{
	msg: 'Hi',
	options: [1.1]
}, {
	msg: 'Oh, hello there!',
	options: [1.1, 1.2]
}],
options: {
	1.1: {
		msg: 'How are you?',
		goto: 2
	},
	1.2: {
		msg: 'You seem happy today.',
		goto: 2
	}
}
```

By default each sub-state has a weighting of `100`, meaning that if there are `10` sub-states, each one has a `100 / (100 * 10)` chance to be chosen. You can change this by giving custom weightings:
```js
msg: [{
	chance: 90,
	msg: 'Hi',
	options: [1.1]
}, {
	chance: 10,
	msg: 'Oh, hello there!',
	options: [1.1, 1.2]
}]
```

Note that if you want custom weightings, **all** sub-states should receive them, or it won't work properly.

### Re-using options
If multiple states need the same options, you can re-use them so that you don't need to retype them all the time (and have a single place to maintain them. In the following example, state `2` has the same options as state `1`:
```js
yourmobname: {
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'How are you?',
				goto: 2
			}
		}
	},
	2: {
		msg: 'Good',
		options: '$1'
	}
}
```

If a state has multiple sub-states and another state uses its options, that state will always have **all** options, not just a subset defined by one of the sub-states. In the following example, state `2` always has `1.1` and `1.2` as options:
```js
yourmobname: {
	1: {
		msg: [{
			chance: 90,
			msg: 'Hi',
			options: [1.1]
		}, {
			chance: 10,
			msg: 'Oh, hello there!',
			options: [1.1, 1.2]
		}],
		options: {
			1.1: {
				msg: 'How are you?',
				goto: 2
			},
			1.2: {
				msg: 'You seem happy today.',
				goto: 2
			}
		}
	},
	2: {
		msg: [{
			msg: 'Good',
			options: '$1'
		}]
	}
}
```

### Multiple goto's
Options can also define multiple states to for their `goto` entries. Again, these can either all have the same weighting, or custom weightings. If one of them have a weighting then **all** of them should receive weightings:
```js
yourmobname: {
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'How are you?',
				goto: [{
					chance: 90,
					number: 2
				}, {
					chance: 10,
					number: 3
				}]
			}
		}
	},
	2: {
		msg: [{
			msg: 'Good',
			options: {}
		}]
	},
	3: {
		msg: [{
			msg: 'Bad',
			options: {}
		}]
	}
}
```

### Prerequisites
State options can have prerequisites that determine whether they should be available or not. In this example, option `1.1` becomes available if the player has an item of type `Sword` in their inventory:
```js
yourmobname: {
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'Do you like my sword?',
				goto: 2,
				prereq: obj => obj.inventory.items.some(f => f.type === 'Sword')
			}
		}
	},
	2: {
		msg: [{
			msg: 'Yes',
			options: {}
		}]
	}
}
```

### Component Handlers
States can can call methods on the player component (not the mob component) when they are reached. This is mostly only used to start buying/selling:
```js
yourmobname: {
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'I\'d like to buy something.',
				goto: 'tradeBuy'
			},
			1.2: {
				msg: 'I\'d like to sell something.',
				goto: 'tradeSell'
			},
			1.3: {
				msg: 'I sold something to you by accident.',
				goto: 'tradeBuyback'
			}
		}
	},
	tradeBuy: {
		cpn: 'trade',
		method: 'startBuy',
		args: [{
			targetName: 'yourmobname'
		}]
	},
	tradeSell: {
		cpn: 'trade',
		method: 'startSell',
		args: [{
			targetName: 'yourmobname'
		}]
	},
	tradeBuyback: {
		cpn: 'trade',
		method: 'startBuyback',
		args: [{
			targetName: 'yourmobname'
		}]
	}
}
```

In theory however, you can use it to call any component method on a player. Note however that the arguments with which the method will be called will not be dynamic:
```js
{
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'Please kill me.',
				goto: 'die'
			}
		}
	},
	die: {
		cpn: 'stats',
		method: 'die',
		args: []
	}
}
```

The `stats.die` method actually expects to be called with `stats.die({ source: objThatKilledMe })` but in this case at least, it won't crash without it. Still, only use the `cpn` / `method` handlers in states for trading. For anything more complex, refer to the next section.

### Custom Methods
States can implement custom logic through defining a `method`:
```js
yourmobname: {
	1: {
		msg: 'Hi',
		options: {
			1.1: {
				msg: 'Do you like my sword?',
				goto: 'checkSword'
			}
		}
	},
	checkSword: {
		msg: [{
			msg: '',
			options: []
		}],
		method: function (objPlayer) {
			//You can access the object of the mob you're talking to with 'this'
			const objMob = this;

			const itemSword = objPlayer.inventory.items.find(f => f.type === 'Sword');

			if (!itemSword)
				return 'What sword? You don\'t have one!';

			if (itemSword.quality === 4)
				return `Legendary?! ${objMob.name} approves!`;

			return 'It\'s ok...';
		}
	}
}
```

* Whatever this method returns will be used as the message send to the player for that state, so make sure it's a string
	* If your method doesn't return anything, the `msg` from the state definition will be used instead
* Note that when a state has a method handler, the state must be defined with `msg: [{ msg: '', options: []]`. That is, it can not have a simple string message like `msg: '...'`
