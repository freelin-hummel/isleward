//Plugins
/* eslint-disable-next-line no-shadow */
import $ from 'jquery';

//Globals
import './js/misc/helpers';

//UIs
import Loader from './ui/templates/loader/loader';

//System Imports
import client from './js/system/client';
import components from './js/components';
import events from './js/system/events';
import extraClientModules from './js/system/extraClientModules';
import globals from './js/system/globals';
import input from './js/input';
import numbers from './js/rendering/numbers';
import objects from './js/objects/objects';
import renderer from './js/rendering/renderer';
import resources from './js/resources';
import sound from './js/sound/sound';
import uiFactory from './ui/factory';

//Setting up jquery for global use
window.$ = $;

let fnQueueTick = null;

const getQueueTick = updateMethod => {
	return () => requestAnimationFrame(updateMethod);
};

const main = {
	hasFocus: true,

	lastRender: 0,
	msPerFrame: ~~(1000 / 60),

	onFocus: function (hasFocus) {
		//Hack: Later we might want to make it not render when out of focus
		this.hasFocus = true;

		if (!hasFocus)
			input.resetKeys();
	},

	onContextMenu: function (e) {
		const allowed = ['txtUsername', 'txtPassword'].some(s => $(e.target).hasClass(s));
		if (!allowed) {
			e.preventDefault();
			return false;
		}
	},

	start: async function () {
		window.onfocus = this.onFocus.bind(this, true);
		window.onblur = this.onFocus.bind(this, false);

		$(window).on('contextmenu', this.onContextMenu.bind(this));

		objects.init();
		await renderer.init();
		input.init();

		numbers.init();

		await uiFactory.init();
		extraClientModules.init();

		fnQueueTick = getQueueTick(this.update.bind(this));
		fnQueueTick();

		this.update();
	},

	update: function () {
		const time = +new Date();
		if (time - this.lastRender < this.msPerFrame - 1) {
			fnQueueTick();

			return;
		}

		objects.update();
		renderer.update();
		uiFactory.update();
		numbers.update();

		this.lastRender = time;

		fnQueueTick();
	}
};

(async () => {
	if (window.isMobile) 
		$('.ui-container').addClass('mobile');

	//If we're on an ios device, we need to load longPress since that polyfills contextmenu for us
	//Todo check and fix ios long press
	//if (window._.isIos())
	//	await loadLongPress();

	if (window.location.search.includes('hideMonetization'))
		$('.ui-container').addClass('hideMonetization');

	await client.init();

	const clientConfig = await new Promise(res => {
		client.request({
			module: 'clientConfig',
			method: 'getClientConfig',
			callback: res
		});
	});

	globals.clientConfig = clientConfig;

	await uiFactory.preInit();

	await uiFactory.buildFromConfig({
		type: 'loader',
		path: 'loader',
		template: Loader
	});

	$('.loader-container').remove();

	await Promise.all([
		resources.init(),
		components.init(),
		sound.init()
	]);

	events.emit('onResourcesLoaded');

	main.start();
})();
