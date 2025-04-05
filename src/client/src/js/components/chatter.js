import renderer from '../rendering/renderer';

export default {
	type: 'chatter',

	cd: 0,
	cdMax: 150,
	color: 0xffffff,

	init (blueprint) {
		if ((blueprint) && (blueprint.msg))
			this.extend(blueprint);
	},

	update () {
		let chatSprite = this.obj.chatSprite;
		if (!chatSprite)
			return;

		if (this.cd > 0)
			this.cd--;
		else if (this.cd === 0) {
			renderer.destroyObject({ sprite: chatSprite });
			this.obj.chatSprite = null;
		}
	},

	extend (serverMsg) {
		let msg = serverMsg.msg + '\n\'';
		this.msg = msg;

		let obj = this.obj;

		if (obj.chatSprite)
			renderer.destroyObject({ sprite: obj.chatSprite });

		if (obj.sprite && !obj.sprite.visible)
			return;

		let color = this.color;
		if (msg[0] === '*')
			color = 0xffeb38;

		let yOffset = (msg.split('\r\n').length - 1);

		obj.chatSprite = renderer.buildText({
			layerName: 'effects',
			text: msg,
			color,
			x: (obj.x * scale) + (scale / 2),
			y: (obj.y * scale) - (scale * 0.8) - (yOffset * scale * 0.8)
		});
		obj.chatSprite.visible = true;

		this.cd = this.cdMax;
	},

	destroy () {
		let chatSprite = this.obj.chatSprite;
		if (!chatSprite)
			return;

		renderer.destroyObject({ sprite: chatSprite });
	}
};
