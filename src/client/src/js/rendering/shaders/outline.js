// OutlineFilter.js
import { Filter } from 'pixi.js';
import { hex2rgb, rgb2hex } from '@pixi/utils';

import vertex from './outline/vert';
import fragment from './outline/frag';

class OutlineFilter extends Filter {
	constructor ({ thickness = 5, color = 0xFFFFFF, quality = 0.1, alpha = 1.0, knockout = false }) {
		const angleStep = Math.PI / 2;

		super(vertex, fragment.replace('$angleStep$', angleStep), {
			uThickness: new Float32Array([thickness, thickness]),
			uColor: new Float32Array([1, 1, 1, 1]),
			uAlpha: alpha,
			uKnockout: knockout
		});

		hex2rgb(color, this.uniforms.uColor);

		Object.assign(this, {
			thickness,
			color,
			quality,
			alpha,
			knockout
		});
	}

	apply (filterManager, input, output, clear) {
		this.uniforms.uThickness[0] = this.thickness / input._frame.width;
		this.uniforms.uThickness[1] = this.thickness / input._frame.height;
		this.uniforms.uAlpha = this.alpha;
		this.uniforms.uKnockout = this.knockout;
		hex2rgb(this.color, this.uniforms.uColor);

		filterManager.applyFilter(this, input, output, clear);
	}

	get alpha () {
		return this._alpha;
	}
	set alpha (value) {
		this._alpha = value;
	}

	get color () {
		return rgb2hex(this.uniforms.uColor);
	}
	set color (value) {
		hex2rgb(value, this.uniforms.uColor);
	}

	get knockout () {
		return this._knockout;
	}
	set knockout (value) {
		this._knockout = value;
	}

	get thickness () {
		return this._thickness;
	}
	set thickness (value) {
		this._thickness = value;
		this.padding = value;
	}
}

export default OutlineFilter;
