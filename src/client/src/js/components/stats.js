import events from '../system/events';
import { buildBar, updateBar } from './stats/bars';

export default {
	type: 'stats',

	values: null,

	bars: [],

	init () {
		if (this.obj.self)
			events.emit('onGetStats', this.values);

		if (_.has(this.obj, 'serverId'))
			events.emit('onGetPartyStats', this.obj.serverId, this.values);

		this.buildHpBar();
	},

	buildHpBar (renderInLayer = 'effects') {
		const { obj, bars } = this;

		const bar = buildBar({
			obj,
			color: 0x802343,
			innerColor: 0xd43346,
			layerName: renderInLayer,
			calcPercent: () => (this.values.hp / this.values.hpMax),
			isVisible: () => (this.values.hp < this.values.hpMax) && (!obj.sprite || obj.sprite.visible)
		});

		//If we render this in the effects layer, we assume it's a normal bar (not one controlled by some outside source)
		if (renderInLayer === 'effects') {
			bars.push(bar);

			this.updateBars();
		} else {
			bar.visible = true;

			updateBar(bar);
		}

		return bar;
	},

	addBar (config) {
		const { obj, bars } = this;

		const bar = buildBar({ obj, ...config });

		bars.push(bar);

		return bar;
	},

	removeBar (bar) {
		this.removeSprites(this.bars.find(b => b === bar));

		_.spliceFirstWhere(this.bars, b => b === bar);
	},

	removeSprites (bar) {
		bar.container.parent?.removeChild(bar.container);
	},

	updateBars () {
		const { obj } = this;

		if (obj.dead)
			return;

		let barIndex = 0;

		this.bars.forEach(bar => {
			let barVisible = true;
			if (typeof(bar.isVisible) === 'function')
				barVisible = bar.isVisible();

			bar.visible = barVisible;

			bar.index = barIndex;

			updateBar(bar);

			if (barVisible)
				barIndex++;
		});
	},

	updateBarVisibility (visible) {
		this.bars.forEach(bar => {
			if (!bar.sprite)
				return;

			const isVisible = (visible !== undefined) ? visible : bar.isVisible();

			bar.sprite.visible = isVisible;
			bar.spriteInner.visible = isVisible;
		});
	},

	extend (blueprint) {
		let bValues = blueprint.values || {};

		let values = this.values;

		for (let b in bValues)
			values[b] = bValues[b];

		if (this.obj.self)
			events.emit('onGetStats', this.values, blueprint);

		if (_.has(this.obj, 'serverId'))
			events.emit('onGetPartyStats', this.obj.serverId, this.values);

		this.updateBars();
	},

	destroy () {
		this.bars.forEach(bar => {
			this.removeSprites(bar);
		});
	}
};
