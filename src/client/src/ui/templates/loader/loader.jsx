import React, { useEffect, useState, useRef } from 'react';

import events from '../../../js/system/events';

import './styles.css';

const setLoaderProgress = ({ setProgress }, { type, progress }) => {
	setProgress(prev => ({
		...prev,
		[type]: progress
	}));
};

const onMount = ({ setProgress }) => {
	events.on('loaderProgress', setLoaderProgress.bind(null, { setProgress }));
};

const Loader = () => {
	const [progress, setProgress] = useState({
		resources: 0,
		components: 0,
		sounds: 0
	});

	useEffect(onMount.bind(null, { setProgress }), []);

	const loaderRef = useRef(null);
	const [isVisible, setIsVisible] = useState(true);
	
	// Calculate total progress (average of all three types)
	const totalProgress = (progress.resources + progress.components + progress.sounds) / 3;
	
	// Handle fade out animation when loading is complete
	useEffect(() => {
		if (totalProgress >= 1 && loaderRef.current) {
			// Add fade-out class to trigger animation
			loaderRef.current.classList.add('fade-out');
			
			// After animation completes, set isVisible to false to remove from DOM
			const timer = setTimeout(() => {
				setIsVisible(false);
			}, 500);
			
			return () => clearTimeout(timer);
		}
	}, [totalProgress]);
	
	// If not visible, return null
	if (!isVisible) 
		return null;
	
	return (
		<div ref={loaderRef} className='uiLoader'>
			<div className='progress-container'>
				<div className='progress-bar-bg'>
					<div className='progress-label'>Resources {Math.floor(progress.resources * 100)}%</div>
					<div 
						className='progress-bar-fill resources' 
						style={{ width: `${progress.resources * 100}%` }}
					></div>
				</div>
			</div>
			
			<div className='progress-container'>
				<div className='progress-bar-bg'>
					<div className='progress-label'>Components {Math.floor(progress.components * 100)}%</div>
					<div 
						className='progress-bar-fill components' 
						style={{ width: `${progress.components * 100}%` }}
					></div>
				</div>
			</div>
			
			<div className='progress-container'>
				<div className='progress-bar-bg'>
					<div className='progress-label'>Sounds {Math.floor(progress.sounds * 100)}%</div>
					<div 
						className='progress-bar-fill sounds' 
						style={{ width: `${progress.sounds * 100}%` }}
					></div>
				</div>
			</div>
		</div>
	);
};

export default Loader;
