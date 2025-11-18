import events from './system/events';
import globals from './system/globals';

let modComponents;

//Store templates here after loading them
const templates = [];
const extenders = [];

let loadedCount = 0;

//Internal
const componentList = [
	'aggro',
	'animation',
	'attackAnimation',
	'bumpAnimation',
	'chatter',
	'chest',
	'dialogue',
	'effects',
	'events',
	'explosion',
	'fadeInOut',
	'flash',
	'gatherer',
	'inventory',
	'keyboardMover',
	'light',
	'lightningEffect',
	'lightPatch',
	'mouseMover',
	'moveAnimation',
	'particles',
	'passives',
	'pather',
	'player',
	'projectile',
	'quests',
	'reputation',
	'resourceNode',
	'serverActions',
	'social',
	'sound',
	'spellbook',
	'stash',
	'stats',
	'touchMover',
	'trade',
	'whirlwind',
	'/effects/auras',
	'/effects/shield'
].map(c => {
	return {
		type: c,
		path: c
	};
});

//Bound Methods
const hookEvent = function (e, cb) {
	if (!this.eventList[e])
		this.eventList[e] = [];

	this.eventList[e].push(cb);
	events.on(e, cb);
};

const unhookEvents = function () {
	Object.entries(this.eventList).forEach(([eventName, callbacks]) => {
		callbacks.forEach(c => events.off(eventName, c));
	});
};

//Helper Methods
const buildComponents = () => {
	templates.forEach(t => {
		const extensions = extenders.filter(e => e.extends === t.type);

		extensions.forEach(e => {
			e.cpn.extendBaseComponent(t);
		});

		t.eventList = {};
		t.hookEvent = hookEvent;
		t.unhookEvents = unhookEvents;
	});
};

//Export
export default {
	async init () {
		modComponents = (await import('@modComponents')).default;

		const fullList = [ ...componentList ];

		globals.clientConfig.clientComponents.forEach(c => {
			if (c.type)
				_.spliceWhere(fullList, f => f.type === c.type);

			fullList.push(c);
		});

		await Promise.all(
			fullList.map(async ({ type, path }) => {
				let importedComponent;

				if (path.includes('/effects/')) {
					const effectName = path.split('/').pop().replace('.js', '');
					importedComponent = await import(`./components/effects/${effectName}.js`);
				} else if (path.indexOf('server/mods/') === 0) {
					const componentName = path.split('/').pop();
					importedComponent = modComponents[componentName];
				} else
					importedComponent = await import(`./components/${type}.js`);

				const cpn = importedComponent.default;

				if (cpn.type)
					templates.push(cpn);

				if (cpn.extends) {
					extenders.push({
						extends: cpn.extends,
						cpn
					});
				}

				loadedCount++;

				events.emit('loaderProgress', {
					type: 'components',
					progress: loadedCount / fullList.length
				});
			})
		);

		buildComponents();
	},

	getTemplate (type) {
		if (type === 'lightpatch')
			type = 'lightPatch';

		return templates.find(t => t.type === type) || { type };
	}
};
