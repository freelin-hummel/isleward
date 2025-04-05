//import { createRoot } from 'react-dom/client';

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
import './js/misc/helpers';
import $ from 'jquery';

window.$ = $;

const urlParams = Object.fromEntries(window.location.search.substr(1).split('&').map(k => k.split('=')));

window.isMobile = (
	urlParams.forceMobile === 'true' ||
		/Mobi|Android/i.test(navigator.userAgent) ||
		(
			navigator.platform === 'MacIntel' &&
			navigator.maxTouchPoints > 1
		)
);

window.scale = isMobile ? 32 : 40;
window.scaleMult = isMobile ? 4 : 5;

if (!window.navigator.vibrate)
	window.navigator.vibrate = () => {};

//const root = createRoot(document.getElementById('root'));
//root.render();

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

		sound.init();

		objects.init();
		await renderer.init();
		input.init();

		numbers.init();

		uiFactory.init();
		extraClientModules.init();

		fnQueueTick = getQueueTick(this.update.bind(this));
		fnQueueTick();

		$('.loader-container').remove();

		Array.prototype.spliceWhere = function (callback, thisArg) {
			let T = thisArg;
			let O = Object(this);
			let len = O.length >>> 0;

			let k = 0;

			while (k < len) {
				let kValue;

				if (k in O) {
					kValue = O[k];

					if (callback.call(T, kValue, k, O)) {
						O.splice(k, 1);
						k--;
					}
				}
				k++;
			}
		};

		 
		Array.prototype.spliceFirstWhere = function (callback, thisArg) {
			let T = thisArg;
			let O = Object(this);
			let len = O.length >>> 0;

			let k = 0;

			while (k < len) {
				let kValue;

				if (k in O) {
					kValue = O[k];

					if (callback.call(T, kValue, k, O)) {
						O.splice(k, 1);

						return kValue;
					}
				}
				k++;
			}
		};

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
	if (window.isMobile) {
		$('.ui-container').addClass('mobile');

		//If we're on an ios device, we need to load longPress since that polyfills contextmenu for us
		//Todo check and fix ios long press
		//if (window._.isIos())
		//	await loadLongPress();
	}

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

	await Promise.all([
		resources.init(),
		components.init()
	]);

	events.emit('onResourcesLoaded');

	main.start();
})();