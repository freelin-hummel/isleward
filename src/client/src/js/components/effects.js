import events from '../system/events';
import numbers from '../rendering/numbers';

const defaultBuffIcons = {
	stunned: [4, 0],
	gainStat: [6, 1]
};

const effectBase = {
	init () {
		this.defaultDamageText(false);

		if (this.self && defaultBuffIcons[this.type]) {
			events.emit('onGetEffectIcon', {
				id: this.id,
				icon: defaultBuffIcons[this.type]
			});
		}
	},

	destroy () {
		if (!this.obj.destroyed)
			this.defaultDamageText(true);

		if (this.self && defaultBuffIcons[this.type])
			events.emit('onRemoveEffectIcon', { id: this.id });
	},

	defaultDamageText (removing) {
		numbers.onGetDamage({
			id: this.obj.id,
			event: true,
			text: (removing ? '-' : '+') + this.type
		});
	}
};

export default {
	type: 'effects',

	effects: [],

	templates: {},

	init () {
		this.effects = this.effects.map(e => this.buildEffect(e));
	},

	buildEffect (data) {
		let template = this.templates[data.type] || {};

		let effect = $.extend(true, {}, effectBase, template, data);

		effect.self = !!this.obj.self;
		effect.obj = this.obj;

		if (effect.init)
			effect.init();

		return effect;
	},

	extend (blueprint) {
		if (blueprint.addEffects) {
			blueprint.addEffects = blueprint.addEffects.map(e => this.buildEffect(e));

			this.effects.push.apply(this.effects, blueprint.addEffects || []);
		}
		if (blueprint.removeEffects) {
			blueprint.removeEffects.forEach(removeId => {
				let effect = this.effects.find(e => e.id === removeId);

				if (!effect)
					return;

				if (effect.destroy)
					effect.destroy();

				this.effects.spliceFirstWhere(e => e.id === removeId);
			});
		}
		if (blueprint.extendEffects) {
			blueprint.extendEffects.forEach(u => {
				let effect = this.effects.find(e => e.id === u.id);

				if (!effect)
					return;

				if (effect.extend)
					effect.extend(u.data);
				else {
					for (let p in u.data)
						effect[p] = u.data[p];
				}
			});
		}
	},

	update () {
		this.effects.forEach(e => {
			if (e.update)
				e.update();
		});
	},

	setVisible (visible) {
		this.effects.forEach(e => {
			if (e.setVisible)
				e.setVisible(visible);
		});
	},

	destroy () {
		this.effects.forEach(e => {
			if (e.destroy)
				e.destroy();
		});
	}
};
