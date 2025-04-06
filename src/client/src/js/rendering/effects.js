export default {
	list: [],

	register (cpn) {
		this.list.push(cpn);
	},

	unregister (cpn) {
		_.spliceWhere(this.list, l => l === cpn);
	},

	render () {
		let list = this.list;
		let lLen = list.length;

		for (let i = 0; i < lLen; i++) {
			let l = list[i];

			if (l.destroyed || !l.obj || l.obj.destroyed) {
				if ((l.destroyManual && !l.destroyManual()) || !l.destroyManual) {
					list.splice(i, 1);
					i--;
					lLen--;

					continue;
				}
			}

			l.renderManual();
		}
	}
};
