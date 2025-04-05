import lightningBuilder from '../rendering/lightningBuilder';
import effects from '../rendering/effects';

export default {
	type: 'lightningEffect',

	cd: 0,
	cdMax: 1,

	effect: null,

	ttl: 6,
	lineGrow: false,
	linePercentage: 0.1,

	lineShrink: false,
	shrinking: false,

	init () {
		effects.register(this);

		if (this.toX === undefined && this.target === undefined) {
			this.destroyed = true;

			return;
		}

		let { toX = this.target.x, toY = this.target.y } = this;

		const fromX = this.obj.x + ((toX >= this.obj.x) ? 1 : 0);
		const fromY = this.obj.y + 0.5;

		toX = this.lineGrow ? fromX : toX + 0.5;
		toY = this.lineGrow ? fromY : toY + 0.5;

		this.effect = lightningBuilder.build({
			fromX,
			fromY,
			toX,
			toY,
			divisions: this.divisions,
			colors: this.colors,
			maxDeviate: this.maxDeviate,
			divDistance: this.divDistance,
			linkSize: this.linkSize
		});
	},

	renderManual () {
		let linePercentage = this.linePercentage;

		let cdMax = this.cdMax;
		if (((this.lineGrow) && (linePercentage < 1)) || ((this.shrinking) && (linePercentage > 0)))
			cdMax = 1;

		if (this.cd > 0) {
			this.cd--;

			return;
		}

		this.cd = cdMax;

		if (this.effect) {
			lightningBuilder.destroy(this.effect);
			this.effect = null;
		}

		if (!this.shrinking) {
			this.ttl--;
			if (this.ttl === 0) {
				this.destroyed = true;

				return;
			}
		}

		let { toX = this.target.x, toY = this.target.y } = this;
		toX += 0.5;
		toY += 0.5;

		let xOffset = (toX >= this.obj.x) ? 1 : 0;

		let fromX = this.obj.x + xOffset;
		let fromY = this.obj.y + 0.5;

		let changeTo = (
			(
				(this.lineGrow) &&
					(linePercentage < 1)
			) ||
				(
					(this.shrinking) &&
					(linePercentage > 0)
				)
		);

		if (changeTo) {
			if (this.shrinking)
				linePercentage /= 1.5;
			else {
				linePercentage *= 1.5;
				if (linePercentage > 1)
					linePercentage = 1;
			}

			let angle = Math.atan2(toY - fromY, toX - fromX);
			let distance = Math.sqrt(Math.pow(fromX - toX, 2) + Math.pow(fromY - toY, 2));
			toX = fromX + (Math.cos(angle) * distance * linePercentage);
			toY = fromY + (Math.sin(angle) * distance * linePercentage);
		}

		this.effect = lightningBuilder.build({
			fromX,
			fromY,
			toX,
			toY,
			divisions: this.divisions,
			colors: this.colors,
			maxDeviate: this.maxDeviate,
			divDistance: this.divDistance,
			linkSize: this.linkSize
		});

		if ((this.shrinking) && (linePercentage < 0.1))
			this.destroyed = true;

		this.linePercentage = linePercentage;
	},

	destroyManual () {
		if ((!this.lineShrink) || (this.shrinking)) {
			if (this.effect)
				lightningBuilder.destroy(this.effect);

			//effects.unregister(this);
			return;
		}

		this.destroyed = false;
		this.shrinking = true;

		return true;
	}
};
