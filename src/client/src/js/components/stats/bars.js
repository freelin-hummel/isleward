import renderer from '../../rendering/renderer';

const barPadding = scaleMult;
const barHeight = scaleMult;

export const updateBar = ({ obj, visible, container, barForeground, calcPercent, barIndex = 0 }, overrideObjPos) => {
	const { sprite } = obj;

	const x = overrideObjPos?.x ?? obj.x;
	const y = overrideObjPos?.y ?? obj.y;

	const percent = calcPercent();

	//By default, hp sprites are 10px higher than the owner object's sprite. Keeping in
	// mind that bigger sprites always have their 'origin' in the bottom middle tile
	const spriteHeight = sprite ? sprite.height : scale;
	const spriteWidth = sprite ? sprite.width : scale;

	const xOffset = -(spriteWidth - scale) / 2;
	const yOffset = -(spriteHeight - scale) - ((barIndex + 1) * scaleMult * 2);

	const barWidth = spriteWidth - (barPadding * 2);

	container.visible = visible;
	container.x = (x * scale) + barPadding + xOffset;
	container.y = (y * scale) + yOffset;

	barForeground.width = percent * barWidth;
	barForeground.height = barHeight;
};

export const buildBar = ({ obj, color, innerColor, calcPercent, isVisible, layerName = 'effects' }) => {
	const { sprite, x, y } = obj;

	const container = renderer.buildContainer({
		layerName
	});

	container.x = x * scale;
	container.y = y * scale;

	//By default, hp sprites are 10px higher than the owner object's sprite. Keeping in
	// mind that bigger sprites always have their 'origin' in the bottom middle tile
	const spriteWidth = sprite ? sprite.width : scale;

	const barWidth = spriteWidth - (barPadding * 2);

	const barBackground = renderer.buildRectangle({
		parent: container,
		x: 0,
		y: 0,
		w: barWidth,
		h: barHeight,
		color
	});

	const barForeground = renderer.buildRectangle({
		parent: container,
		color: innerColor,
		x: 0,
		y: 0,
		w: barWidth,
		h: barHeight
	});

	const bar = {
		obj,
		container,
		barBackground,
		barForeground,
		calcPercent,
		isVisible
	};

	bar.update = updateBar.bind(null, bar);

	return bar;
};
