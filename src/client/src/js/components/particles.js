import renderer from '../rendering/renderer';

export default {
	type: 'particles',
	emitter: null,

	init (blueprint) {
		if (!document.hasFocus() && blueprint.ttl !== undefined && blueprint.ttl !== -1) {
			this.obj.destroyed = true;

			return;
		}

		this.blueprint = this.blueprint || {};
		this.blueprint.pos = {
			x: (this.obj.x * scale) + (scale / 2),
			y: (this.obj.y * scale) + (scale / 2)
		};
		this.ttl = blueprint.ttl;
		this.blueprint.obj = this.obj;

		this.emitter = renderer.buildEmitter(this.blueprint);

		this.isFocused = document.hasFocus();

		this.onBlur = () => {
			this.isFocused = false;
			this.setVisible(this.obj.isVisible);
		};
		this.onFocus = () => {
			this.isFocused = true;
			this.setVisible(this.obj.isVisible);
		};

		window.addEventListener('blur', this.onBlur);
		window.addEventListener('focus', this.onFocus);

		this.setVisible(this.obj.isVisible);
	},

	setVisible (visible) {
		//Sometimes, we make emitters stop emitting for a reason
		// for example, when an explosion stops
		if (!this.emitter.disabled)
			this.emitter.emit = visible && this.isFocused;
	},

	update () {
		const { ttl, destroyObject, emitter, obj } = this;

		if (ttl !== null && ttl !== undefined) {
			this.ttl--;
			if (this.ttl <= 0) {
				if (destroyObject)
					this.obj.destroyed = true;
				else
					this.destroyed = true;

				return;
			}
		}

		if (!emitter.emit)
			return;

		emitter.spawnPos.x = (obj.x * scale) + (scale / 2) + obj.offsetX;
		emitter.spawnPos.y = (obj.y * scale) + (scale / 2) + obj.offsetY;
	},

	destroy () {
		window.removeEventListener('blur', this.onBlur);
		window.removeEventListener('focus', this.onFocus);

		if (this.emitter)
			renderer.destroyEmitter(this.emitter);
	}
};
