import events from './system/events.js';
import globals from './system/globals.js';

import modComponents from '@modComponents';

//Store templates here after loading them
const templates = [];
const extenders = [];

//Internal
const componentList = [
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

		extensions.forEach(e => $.extend(true, t, e.tpl));

		t.eventList = {};
		t.hookEvent = hookEvent;
		t.unhookEvents = unhookEvents;
	});
};

//Export
export default {
	async init () {
		const fullList = [
			...componentList,
			...globals.clientConfig.clientComponents
		]

		await Promise.all(
			fullList.map(async ({ type, path }) => {
				let importedComponent;

				if (path.includes('/effects/')) {
					const effectName = path.split('/').pop().replace('.js', '');
					importedComponent = await import(`./components/effects/${effectName}.js`);

				} else if (path.indexOf('server/mods/') === 0) {
					const componentName = path.split('/').pop();
					importedComponent = modComponents[componentName];

				} else {
					importedComponent = await import(`./components/${type}.js`);
				}

				const cpn = importedComponent.default;
				if (cpn.type) templates.push(cpn);
				if (cpn.extends) {
					extenders.push({ extends: cpn.extends, cpn });
				}
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
