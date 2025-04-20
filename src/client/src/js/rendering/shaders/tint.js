// TintFilter.js
import { Filter } from 'pixi.js';
import { hex2rgb, rgb2hex } from '@pixi/utils';

import vertex from './tint/vert.js';
import fragment from './tint/frag.js';

class TintFilter extends Filter {
	constructor ({ color = 0xFFFFFF } = {}) {
		super(vertex, fragment, {
			uColor: new Float32Array([1, 1, 1, 1])
		});

		// Store the initial color
		this._color = color;
		hex2rgb(this._color, this.uniforms.uColor);

		// Assign properties
		Object.assign(this, {
			color: this._color
		});
	}

	apply (filterManager, input, output, clear) {
		// Update the color uniform before applying the filter
		hex2rgb(this.color, this.uniforms.uColor);
		filterManager.applyFilter(this, input, output, clear);
	}

	get color () {
		// Return the color as a hex value
		return rgb2hex(this.uniforms.uColor);
	}

	set color (value) {
		// Set the color uniform from a hex value
		this._color = value;
		hex2rgb(value, this.uniforms.uColor);
	}
}

export default TintFilter;
