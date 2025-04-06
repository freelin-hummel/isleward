import events from '../system/events';
import objects from '../objects/objects';
import renderer from './renderer';
import config from '../config';

//Defaults
const MOVE_SPEED = 0.5;

const TTL = 35;
const FONT_SIZE = 18;
const FONT_SIZE_CRIT = 22;
const LAYER_NAME = 'effects';

let PADDING;

const POSITION = {
	BOTTOM_CENTER: 0,
	LEFT_BOTTOM: 1,
	RIGHT_BOTTOM: 2,
	TOP_CENTER: 3
};

//Internals
const list = [];

//Create an object of the form: { elementName: elementIntegerColor, ... } from corresponding variable values.
// These variables are defined in main.less and take the form: var(--color-element-elementName)
const elementColors = Object.fromEntries(
	['default', 'arcane', 'frost', 'fire', 'holy', 'poison'].map(e => {
		const variableName = `--color-element-${e}`;
		const variableValue = getComputedStyle(document.documentElement).getPropertyValue(variableName);

		const integerColor = `0x${variableValue.replace('#', '')}`;

		return [e, integerColor];
	})
);

//Helpers
const getColor = ({ color, element }) => {
	if (color)
		return color;

	return elementColors[element];
};

const getText = ({ amount, text, heal }) => {
	if (amount === undefined)
		return text;

	const div = ((~~(amount * 10) / 10) > 0) ? 10 : 100;
	let result = ~~(amount * div) / div;

	if (heal)
		result = `+${result}`;

	return result;
};

const getPosition = ({ position, event: isEvent, heal }) => {
	if (position)
		return position;

	//Events render under the target, centered
	if (isEvent)
		return POSITION.BOTTOM_CENTER;
	else if (heal)
		return POSITION.LEFT_BOTTOM;

	return POSITION.RIGHT_BOTTOM;
};

const getXY = (msg, position, sprite) => {
	let x = 0;
	let y = 0;

	if (position === POSITION.TOP_CENTER) {
		x = (scale / 2) - (sprite.width / 2);
		y = -PADDING - sprite.height;
	} else if (position === POSITION.BOTTOM_CENTER) {
		x = (scale / 2) - (sprite.width / 2);
		y = scale + PADDING;
	} else if (position === POSITION.RIGHT_BOTTOM) {
		x = scale;
		y = scale - sprite.height + (scaleMult * 2);
	} else if (position === POSITION.LEFT_BOTTOM) {
		x = -sprite.width - PADDING;
		y = scale - sprite.height + (scaleMult * 2);
	}

	return {
		x,
		y
	};
};

const getMovementDelta = ({ movementDelta }, position) => {
	if (movementDelta)
		return movementDelta;

	if (position === POSITION.BOTTOM_CENTER)
		return [0, 1];

	return [0, -1];
};

const getFontSize = ({ fontSize, crit }) => {
	if (fontSize)
		return fontSize;
	else if (crit)
		return FONT_SIZE_CRIT;

	return FONT_SIZE;
};

//Events
const onGetDamage = msg => {
	const { ttl = TTL } = msg;

	if (config.damageNumbers === 'off')
		return;

	const target = objects.objects.find(o => o.id === msg.id);
	if (!target || !target.isVisible)
		return;

	const sprite = renderer.buildText({
		fontSize: getFontSize(msg),
		layerName: LAYER_NAME,
		text: getText(msg),
		color: getColor(msg),
		visible: false
	});

	const position = getPosition(msg);
	const movementDelta = getMovementDelta(msg, position);
	const { x, y } = getXY(msg, position, sprite);

	sprite.x = (target.x * scale) + x;
	sprite.y = (target.y * scale) + y;
	sprite.visible = true;

	const numberObj = {
		obj: target,
		x,
		y,
		ttl,
		ttlMax: ttl,
		movementDelta,
		sprite
	};

	list.push(numberObj);
};

//Call this method from inside update to generate test numbers
// around the player
/* eslint-disable-next-line no-unused-vars */
const test = () => {
	objects.objects.forEach(o => {
		if (!o.player)
			return;

		const amount = Math.random() < 0.5 ? ~~(Math.random() * 100) : undefined;
		const isEvent = amount ? false : Math.random() < 0.5;
		const text = amount ? undefined : 'text';
		const heal = Math.random() < 0.5;
		let position;
		if (!amount)
			position = Math.random() < 0.5 ? POSITION.TOP_CENTER : POSITION.BOTTOM_CENTER;
		const element = ['default', 'arcane', 'frost', 'fire', 'holy', 'poison'][~~(Math.random() * 6)];
		const crit = amount > 50;

		onGetDamage({
			id: o.id,
			event: isEvent,
			text,
			amount,
			element,
			heal,
			position,
			crit
		});
	});
};

const update = () => {
	let lLen = list.length;
	for (let i = 0; i < lLen; i++) {
		const l = list[i];

		l.ttl--;
		if (l.ttl === 0) {
			list.splice(i, 1);
			lLen--;

			renderer.destroyObject({
				layerName: 'effects',
				sprite: l.sprite
			});

			continue;
		}

		l.x += l.movementDelta[0] * MOVE_SPEED;
		l.y += l.movementDelta[1] * MOVE_SPEED;

		l.sprite.x = (l.obj.x * scale) + l.x;
		l.sprite.y = (l.obj.y * scale) + l.y;

		l.sprite.alpha = l.ttl / l.ttlMax;
	}
};

const init = () => {
	events.on('onGetDamage', onGetDamage);

	PADDING = scaleMult;
};

//Exports
export default {
	init,
	update,
	onGetDamage,
	POSITION
};
