import input from '../../../../js/input';
import lineBuilders from './lineBuilders';
import getCompareItem from './getCompareItem';
import globals from '../../../../js/system/globals';

const { init: initLineBuilders, lineBuilders: g } = lineBuilders;

const buildTooltipHtml = useTooltipConfig => {
	const html = globals.clientConfig[useTooltipConfig]
		.map(({ handler, config }) => {
			const args = [];

			if (config) {
				const { className, lineBuilder } = config;

				if (lineBuilder)
					args.push(g[lineBuilder]());

				if (className)
					args.splice(0, 0, className);
			}

			return g[handler].call(null, ...args, config);
		})
		.filter(t => t !== null)
		.join('');

	return html;
};

const buildTooltip = (ui, { item, canCompare, customLineBuilders, useTooltipConfig = 'itemTooltipConfig' }) => {
	let shiftDown = input.isKeyDown('shift', true);
	const equipErrors = window.player.inventory.equipItemErrors(item);

	const msg = {
		item,
		compare: null
	};
	getCompareItem(msg);

	const useItem = item = msg.item;
	if (isMobile && useItem === ui.item)
		shiftDown = true;

	const compare = canCompare ? msg.compare : null;

	initLineBuilders(item, compare, shiftDown, equipErrors, customLineBuilders);

	const contents = buildTooltipHtml(useTooltipConfig);

	return contents;
};

export default buildTooltip;
