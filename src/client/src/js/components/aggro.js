export default {
	type: 'aggro',

	list: [],

	faction: null,
	subFaction: null,

	init ({ list, faction, subFaction }) {
		this.list = list;
		this.faction = faction;
		this.subFaction = subFaction;
	},

	extend ({ list, faction, subFaction }) {
		if (list)
			this.list = list;

		if (faction)
			this.faction = faction;
		
		if (subFaction)
			this.subFaction = subFaction;
	}
};
