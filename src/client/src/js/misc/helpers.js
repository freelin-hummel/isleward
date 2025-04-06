window._ = {
	get2dArray (w, h, def) {
		def = def || 0;

		let result = [];
		for (let i = 0; i < w; i++) {
			let inner = [];
			for (let j = 0; j < h; j++) {
				if (def === 'array')
					inner.push([]);
				else
					inner.push(def);
			}

			result.push(inner);
		}

		return result;
	},

	spliceWhere (array, filter) {
		for (let i = array.length - 1; i >= 0; i--) {
			if (filter(array[i], i, array))
				array.splice(i, 1);
		}
	},

	spliceFirstWhere (array, filter) {
		for (let i = 0; i < array.length; i++) {
			if (filter(array[i], i, array)) {
				const [ value ] = array.splice(i, 1);

				return value;
			}
		}
	},

	has (obj, key) {
		return (
			Object.prototype.hasOwnProperty.call(obj, key) &&
			obj[key] !== undefined &&
			this[key] !== null
		);
	},

	log (msg) {
		/* eslint-disable-next-line no-console */
		console.log(msg);
	},

	toggleFullScreen () {
		let doc = window.document;
		let docEl = doc.documentElement;

		let requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
		let cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

		if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement)
			requestFullScreen.call(docEl);

		else
			cancelFullScreen.call(doc);
	},

	isIos () {
		return (
			[
				'iPad Simulator',
				'iPhone Simulator',
				'iPod Simulator',
				'iPad',
				'iPhone',
				'iPod'
			].includes(navigator.platform) ||
			(navigator.userAgent.includes('Mac') && 'ontouchend' in document)
		);
	}
};

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
