/* eslint-disable max-lines-per-function */

import { useState, useEffect, useRef } from 'react';

import { getState as gs } from './props';

export const toggleSettings = e => {
	if (e) {
		e.preventDefault();
		e.stopPropagation();
	}

	gs('setShowSettings', prev => !prev);
};

export const closeSettings = () => {
	gs('setShowSettings', false);
};

const SettingsOverlay = ({ onClose }) => {
	const overlayRef = useRef(null);

	const { chatSettings, setChatSettings } = gs();
    
	// Local state for form values
	const [formValues, setFormValues] = useState({
		pointerEventsMode: chatSettings.pointerEventsMode,
		defaultOpacity: chatSettings.defaultOpacity,
		activeOpacity: chatSettings.activeOpacity,
		hoverOpacity: chatSettings.hoverOpacity,
		width: chatSettings.width || 520,
		height: chatSettings.height || 320,
		allowResize: chatSettings.allowResize !== false
	});

	// Handle clicks outside the overlay to close it
	useEffect(() => {
		const handleClickOutside = e => {
			if (overlayRef.current && !overlayRef.current.contains(e.target)) 
				onClose();
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [onClose]);

	// Handle form changes
	const handleChange = e => {
		const { name: settingName, value, type, checked } = e.target;
		setFormValues(prev => ({
			...prev,
			[settingName]: type === 'checkbox' ? checked : parseFloat(value)
		}));
	};

	// Save changes
	const handleSave = () => {
		setChatSettings(formValues);
		onClose();
	};

	return (
		<div className="settings-overlay-backdrop">
			<div className="settings-overlay" ref={overlayRef}>
				<div className="settings-header">
					<h3>Chat Settings</h3>
					<button className="close-button" onClick={onClose}>×</button>
				</div>
                
				<div className="settings-content">
					<div className="settings-section">
						<div className="settings-option">
							<label className="settings-checkbox">
								<input 
									type="checkbox" 
									name="pointerEventsMode" 
									checked={formValues.pointerEventsMode} 
									onChange={handleChange}
								/>
								<span>Direct Interaction Mode</span>
							</label>
							<p className="settings-description">
                                When enabled, you can hover over items in chat without focusing the chat UI first.
                                When disabled, you need to focus the chat UI before interacting with it.
							</p>
						</div>
                        
						<div className="settings-option">
							<label className="settings-checkbox">
								<input 
									type="checkbox" 
									name="allowResize" 
									checked={formValues.allowResize} 
									onChange={handleChange}
								/>
								<span>Allow Resize</span>
							</label>
							<p className="settings-description">
                                When enabled, resize handles are shown to allow changing the chat UI size.
                                When disabled, resize handles are hidden but the size is still remembered.
							</p>
						</div>
					</div>

					<div className="settings-section">
						<h4>Opacity Settings</h4>
                        
						<div className="opacity-slider">
							<label>Default Opacity: {formValues.defaultOpacity.toFixed(1)}</label>
							<input 
								type="range" 
								name="defaultOpacity" 
								min="0.0" 
								max="1.0" 
								step="0.1" 
								value={formValues.defaultOpacity} 
								onChange={handleChange}
							/>
						</div>

						<div className="opacity-slider">
							<label>Hover Opacity: {formValues.hoverOpacity.toFixed(1)}</label>
							<input 
								type="range" 
								name="hoverOpacity" 
								min="0.0" 
								max="1.0" 
								step="0.1" 
								value={formValues.hoverOpacity} 
								onChange={handleChange}
							/>
						</div>
                        
						<div className="opacity-slider">
							<label>Active Opacity: {formValues.activeOpacity.toFixed(1)}</label>
							<input 
								type="range" 
								name="activeOpacity" 
								min="0.0" 
								max="1.0" 
								step="0.1" 
								value={formValues.activeOpacity} 
								onChange={handleChange}
							/>
						</div>
					</div>

					{/* Size settings removed - now handled by direct resizing */}
				</div>
                
				<div className="settings-footer">
					<button className="save-button" onClick={handleSave}>Save</button>
					<button className="cancel-button" onClick={onClose}>Cancel</button>
				</div>
			</div>
		</div>
	);
};

export default SettingsOverlay;
