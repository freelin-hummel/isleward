const takeDamage = (cpnStats, eventDamage) => {
	const { obj, values, syncer } = cpnStats;

	if (values.hp <= 0)
		return;

	if (!eventDamage.noEvents) {
		eventDamage.source.fireEvent('beforeDealDamage', eventDamage);
		obj.fireEvent('beforeTakeDamage', eventDamage);
	}

	const { source, damage, threatMult = 1, noEvents } = eventDamage;
	const { failed, blocked, dodged, crit, element } = damage;

	if (failed || obj.destroyed)
		return;

	const amount = Math.min(values.hp, damage.amount);

	damage.dealt = amount;

	const msg = {
		id: obj.id,
		source: source.id,
		crit,
		amount,
		element
	};

	values.hp -= amount;
	const recipients = [];
	if (obj.serverId)
		recipients.push(obj.serverId);
	if (source.serverId)
		recipients.push(source.serverId);

	if (source.follower && source.follower.master.serverId) {
		recipients.push(source.follower.master.serverId);
		msg.masterSource = source.follower.master.id;
	}
		
	if (obj.follower && obj.follower.master.serverId) {
		recipients.push(obj.follower.master.serverId);
		msg.masterId = obj.follower.master.id;
	}

	if (recipients.length) {
		if (!blocked && !dodged)
			syncer.queue('onGetDamage', msg, recipients);
		else {
			syncer.queue('onGetDamage', {
				id: obj.id,
				source: source.id,
				event: true,
				text: blocked ? 'blocked' : 'dodged'
			}, recipients);
		}
	}

	obj.aggro.tryEngage(source, amount, threatMult);

	if (values.hp <= 0) {
		const emBeforeActorDies = {
			obj,
			source,
			success: true
		};

		obj.instance.eventEmitter.emit('beforeActorDies', emBeforeActorDies);
		obj.fireEvent('beforeDeath', emBeforeActorDies);

		if (emBeforeActorDies.success) 
			cpnStats.preDeath(source);
	} else {
		source.aggro.tryEngage(obj, 0);
		obj.syncer.setObject(false, 'stats', 'values', 'hp', values.hp);
	}

	if (!noEvents) {
		source.fireEvent('afterDealDamage', eventDamage);
		obj.fireEvent('afterTakeDamage', eventDamage);
	}
};

module.exports = takeDamage;
