import { useEffect, useCallback } from 'react';

import { getState as gs } from './props';

const Resizer = () => {
	const {
		isResizing, setIsResizing,
		resizeType, setResizeType,
		resizeRef,
		chatSettings, setChatSettings
	} = gs();

	// Handle resize start
	const handleResizeStart = useCallback((e, type) => {
		e.preventDefault();
		e.stopPropagation();

		setIsResizing(true);
		setResizeType(type);
	}, []);
	
	// Handle resize move
	useEffect(() => {
		const handleResizeMove = e => {
			if (!isResizing || !resizeRef.current) return;
			
			const rect = resizeRef.current.getBoundingClientRect();
			
			if (resizeType === 'right' || resizeType === 'corner') {
				const newWidth = Math.max(200, e.clientX - rect.left);
				setChatSettings(prev => ({ ...prev, width: newWidth }));
			}
			
			if (resizeType === 'top' || resizeType === 'corner') {
				// For top resize, we only change the height
				// The bottom position stays fixed at 16px as defined in the less file
				const newHeight = Math.max(150, rect.bottom - e.clientY);
				setChatSettings(prev => ({ ...prev, height: newHeight }));
			}
		};
		
		const handleResizeEnd = () => {
			setIsResizing(false);
			setResizeType(null);
		};
		
		if (isResizing) {
			document.addEventListener('mousemove', handleResizeMove);
			document.addEventListener('mouseup', handleResizeEnd);
		}
		
		return () => {
			document.removeEventListener('mousemove', handleResizeMove);
			document.removeEventListener('mouseup', handleResizeEnd);
		};
	}, [isResizing, resizeType, setChatSettings]);

	return (
		<> 
			{/* Resize handles - only shown when allowResize is true */}
			{chatSettings.allowResize !== false && (
				<>
					<div 
						className="resize-handle resize-right"
						onMouseDown={e => handleResizeStart(e, 'right')}
					/>
					<div 
						className="resize-handle resize-top"
						onMouseDown={e => handleResizeStart(e, 'top')}
					/>
					<div 
						className="resize-handle resize-corner"
						onMouseDown={e => handleResizeStart(e, 'corner')}
					/>
				</>
			)}
		</>
	);
};

export default Resizer;
