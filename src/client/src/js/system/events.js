let events = {
	events: {},
	queue: [],
	on (eventName, callback) {
		let list = this.events[eventName] || (this.events[eventName] = []);
		list.push(callback);

		for (let i = 0; i < this.queue.length; i++) {
			let q = this.queue[i];
			if (q.event !== eventName)
				continue;

			this.queue.splice(i, 1);
			i--;

			q.args.splice(0, 0, eventName);

			this.emit.apply(this, q.args);
		}

		return callback;
	},
	clearQueue () {
		this.queue.length = 0;
	},
	off (eventName, callback) {
		let list = this.events[eventName] || [];
		let lLen = list.length;
		for (let i = 0; i < lLen; i++) {
			if (list[i] === callback) {
				list.splice(i, 1);
				i--;
				lLen--;
			}
		}

		if (lLen === 0)
			delete this.events[eventName];
	},
	emit (eventName) {
		let args = [].slice.call(arguments, 1);

		let list = this.events[eventName];
		if (!list) {
			this.queue.push({
				event: eventName,
				args
			});

			return;
		}

		list.forEach(l => l.apply(null, args));
	}
};

export default events;
