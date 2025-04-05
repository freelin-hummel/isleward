Object.defineProperty(Object.prototype, 'has', {
	enumerable: false,
	writable: true,
	value (prop) {
		/* eslint-disable-next-line no-prototype-builtins */
		return (this.hasOwnProperty(prop) && this[prop] !== undefined && this[prop] !== null);
	}
});

if (!String.prototype.padStart) {
	 
	String.prototype.padStart = function padStart (targetLength, padString) {
		targetLength = targetLength >> 0;
		padString = String(typeof padString !== 'undefined' ? padString : ' ');
		if (this.length >= targetLength)
			return String(this);

		targetLength = targetLength - this.length;
		if (targetLength > padString.length)
			padString += padString.repeat(targetLength / padString.length);

		return padString.slice(0, targetLength) + String(this);
	};
}

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
