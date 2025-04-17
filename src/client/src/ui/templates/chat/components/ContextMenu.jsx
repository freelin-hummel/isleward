import { getState as gs } from './props';

import { moveToTab } from './Tabs';

export const handleContextMenu = (e, message, targetType, targetValue) => {
	e.preventDefault();

	gs('setContextMenu', {
		visible: true,
		x: e.clientX,
		y: e.clientY,
		messageId: message.id,
		targetType,
		targetValue
	});
};

export const closeContextMenu = () => {
	gs('setContextMenu', prev => ({ ...prev, visible: false }));
};

const ContextMenu = () => {
	const { contextMenu } = gs();

	if (!contextMenu.visible)
		return null;

	return (
		<div 
			className="context-menu"
			style={{
				top: `${contextMenu.y}px`,
				left: `${contextMenu.x}px`
			}}
			onClick={e => e.stopPropagation()}
		>
			<div 
				className="context-menu-item"
				onClick={() => moveToTab(contextMenu.targetType, contextMenu.targetValue)}
			>
				Move to tab
			</div>
		</div>
	);
};

export default ContextMenu;
