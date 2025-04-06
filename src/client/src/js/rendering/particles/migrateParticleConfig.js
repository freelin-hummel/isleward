//Behaviors
const buildBlendMode = blendMode => ({
	type: 'blendMode',
	config: { blendMode }
});

const buildAlpha = oldConfig => ({
	type: 'alpha',
	config: {
		alpha: {
			list: [
				{
					value: oldConfig.alpha?.start ?? oldConfig.opacity.start,
					time: 0
				},
				{
					value: oldConfig.alpha?.end ?? oldConfig.opacity.end,
					time: 1
				}
			]
		}
	}
});

const buildScale = oldConfig => {
	const isRange = oldConfig.scale.start.min !== undefined;

	return isRange
		? {
			type: 'scale',
			config: {
				pickScale: {
					list: [
						{
							value: oldConfig.scale.start,
							time: 0
						},
						{
							value: oldConfig.scale.end,
							time: 1
						}
					]
				}
			}
		}
		: {
			type: 'scale',
			config: {
				scale: {
					list: [
						{
							value: oldConfig.scale.start,
							time: 0
						},
						{
							value: oldConfig.scale.end,
							time: 1
						}
					]
				}
			}
		};
};

const buildRotationStatic = () => ({
	type: 'rotationStatic',
	config: {
		min: 0,
		max: 360
	}
});

const buildNoRotation = () => ({
	type: 'noRotation',
	config: { rotation: 0 }
});

const buildColor = oldConfig => {
	if (!oldConfig.color) return null;

	if (Array.isArray(oldConfig.color.start)) {
		return {
			type: 'color',
			config: {
				color: {
					pickList: [
						{
							value: oldConfig.color.start,
							time: 0
						},
						{
							value: oldConfig.color.end,
							time: 1
						}
					]
				}
			}
		};
	}

	if (!oldConfig.color.end) {
		return {
			type: 'colorStatic',
			config: { color: oldConfig.color.start }
		};
	}

	return {
		type: 'color',
		config: {
			color: {
				list: [
					{
						value: oldConfig.color.start,
						time: 0
					},
					{
						value: oldConfig.color.end ?? oldConfig.color.start,
						time: 1
					}
				]
			}
		}
	};
};

const buildMoveSpeed = oldConfig => {
	const isRange = oldConfig.speed.start.min !== undefined;

	return isRange
		? {
			type: 'moveSpeed',
			config: {
				pickSpeed: {
					list: [
						{
							value: oldConfig.speed.start,
							time: 0
						},
						{
							value: oldConfig.speed.end,
							time: 1
						}
					]
				}
			}
		}
		: {
			type: 'moveSpeed',
			config: {
				speed: {
					list: [
						{
							value: oldConfig.speed.start,
							time: 0
						},
						{
							value: oldConfig.speed.end,
							time: 1
						}
					]
				}
			}
		};
};

const buildSpawnShape = oldConfig => {
	let spawnConfig = oldConfig.spawnCircle;
	if (oldConfig.spawnType === 'rect' || oldConfig.spawnType === 'ring')
		spawnConfig = oldConfig.spawnRect;

	if (spawnConfig.r !== undefined) {
		spawnConfig.radius = spawnConfig.r;
		delete spawnConfig.r;
	}

	return {
		type: 'spawnShape',
		config: {
			type: oldConfig.spawnType,
			data: spawnConfig
		}
	};
};

//Method
const migrateParticleConfig = oldConfig => {
	const newConfig = {
		lifetime: { ...oldConfig.lifetime },
		frequency: oldConfig.frequency,
		spawnChance: oldConfig.chance,
		particlesPerWave: oldConfig.particlesPerWave ?? 5,
		emitterLifetime: oldConfig.emitterLifetime,
		maxParticles: 1000,
		pos: { ...oldConfig.pos },
		addAtBack: oldConfig.addAtBack ?? false,
		behaviors: []
	};

	newConfig.behaviors.push(
		buildBlendMode(oldConfig.blendMode),
		buildAlpha(oldConfig),
		buildScale(oldConfig),
		buildRotationStatic(),
		buildNoRotation()
	);

	const colorBehavior = buildColor(oldConfig);
	if (colorBehavior)
		newConfig.behaviors.push(colorBehavior);

	newConfig.behaviors.push(
		buildMoveSpeed(oldConfig),
		buildSpawnShape(oldConfig)
	);

	return newConfig;
};

export default migrateParticleConfig;
