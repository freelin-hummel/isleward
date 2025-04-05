window._ = {
	get2dArray (w, h, defaultValue) {
		const result = new Array(w);
		for (let i = 0; i < w; i++) {
			result[i] = new Array(h);
			if (defaultValue === 'array') {
				for (let j = 0; j < h; j++)
					result[i][j] = [];
			} else {
				for (let j = 0; j < h; j++)
					result[i][j] = defaultValue;
			}
		}

		return result;
	},
	isIos () {
		return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
	}
};

window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

window.addons = window.addons || {
	init () {}
};
