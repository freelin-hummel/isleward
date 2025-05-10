import events from '../../../js/system/events';
import client from '../../../js/system/client';
import globals from '../../../js/system/globals';
import objects from '../../../js/objects/objects';
import template from './template.html?raw';
import './styles.css';
import templateInvite from './templateInvite.html?raw';
import templatePartyMember from './templatePartyMember.html?raw';
import config from '../../../js/config';

export default {
	tpl: template,

	invite: null,
	party: null,

	postRender () {
		this.onEvent('onGetInvite', this.onGetInvite.bind(this));
		this.onEvent('onGetParty', this.onGetParty.bind(this));
		this.onEvent('onPartyDisband', this.onPartyDisband.bind(this));

		this.onEvent('globalObjectListUpdated', this.globalObjectListUpdated.bind(this));

		this.onEvent('onGetPartyStats', this.onGetPartyStats.bind(this));

		this.onEvent('onTogglePartyView', this.onTogglePartyView.bind(this));
		this.onTogglePartyView(config.partyView);
	},

	globalObjectListUpdated ({ list }) {
		if (!window.player)
			return;

		const { party } = this;
		const { player: { serverId: playerId } } = window;

		const playerInList = list.find(l => l.id === playerId);
		if (!playerInList)
			return;

		const { zoneId: playerZone } = playerInList;

		if (!party)
			return;

		list.forEach(l => {
			const { id: mId, zoneId: mZone, level: mLevel } = l;

			if (!party.includes(mId))
				return;

			if (mId !== playerId) {
				const el = this.find('.member[memberId="' + mId + '"]');
				el.removeClass('differentZone');

				if (mZone !== playerZone)
					el.addClass('differentZone');

				el.find('.txtLevel').html('level: ' + mLevel);
			}
		});
	},

	onGetPartyStats (id, stats) {
		let party = this.party;
		if (!party)
			return;

		let el = this.find('.member[memberId="' + id + '"]');
		if (el.length === 0)
			return;

		if ((stats.hp !== null) && (stats.hpMax !== null)) {
			let hpPercentage = Math.min(100, (stats.hp / stats.hpMax) * 100);
			el.find('.statHp').css('width', hpPercentage + '%');
		}

		if ((stats.mana !== null) && (stats.manaMax !== null)) {
			let manaPercentage = Math.min((stats.mana / stats.manaMax) * 100, 100);
			el.find('.statMana').css('width', manaPercentage + '%');
		}

		if (stats.level !== null)
			el.find('.txtLevel').html('level: ' + stats.level);
	},

	onPartyDisband () {
		this.find('.party .list')
			.empty();
	},

	onGetParty (party) {
		// Destroy invite frame if you join a party
		if (this.invite)
			this.destroyInvite();

		let container = this.find('.party .list')
			.empty();

		this.party = party;
		if (!party)
			return;

		party.forEach(serverId => {
			if (serverId === window.player.serverId)
				return;

			let player = globals.onlineList.find(o => o.id === serverId);
			let playerName = player ? player.name : 'unknown';
			let level = 'level: ' + (player ? player.level : '?');

			let html = templatePartyMember
				.replace('$NAME$', playerName)
				.replace('$LEVEL$', level);

			let el = $(html)
				.appendTo(container)
				.attr('memberId', serverId)
				.on('contextmenu', this.showContext.bind(this, playerName, serverId))
				.on('click', this.targetPartyMember.bind(this, serverId));

			if (player.zoneId !== window.player.zoneId)
				el.addClass('differentZone');

			//Find stats
			let memberObj = objects.objects.find(o => o.serverId === serverId);
			if ((memberObj) && (memberObj.stats))
				this.onGetPartyStats(serverId, memberObj.stats.values);
		});
	},

	targetPartyMember (id) {
		const memberObj = objects.objects.find(o => o.serverId === id);
		if (!memberObj)
			return;

		window.player.spellbook.setTarget(memberObj);
	},

	showContext (charName, id, e) {
		events.emit('onContextMenu', [{
			text: 'whisper',
			callback: events.emit.bind(events, 'onDoWhisper', charName)
		}, {
			text: 'remove from party',
			callback: this.removeFromParty.bind(this, id)
		}, {
			text: 'leave party',
			callback: this.leaveParty.bind(this)
		}], e);

		e.preventDefault();

		return false;
	},

	onGetInvite (sourceId) {
		if (this.invite)
			this.destroyInvite();

		let sourcePlayer = globals.onlineList.find(o => o.id === sourceId);

		let html = templateInvite
			.replace('$NAME$', sourcePlayer.name);

		let el = $(html)
			.appendTo(this.el);
		el
			.find('.btn')
			.on('click', this.destroyInvite.bind(this));

		this.invite = {
			fromId: sourcePlayer.id,
			fromName: sourcePlayer.name,
			el
		};
	},

	destroyInvite (e) {
		if (e) {
			if ($(e.target).hasClass('btnAccept'))
				this.acceptInvite();
			else
				this.declineInvite();
		}

		this.invite.el.remove();
		this.invite = null;

		events.emit('onUiHover', false);
	},

	acceptInvite () {
		client.request({
			cpn: 'social',
			method: 'acceptInvite',
			data: { targetId: this.invite.fromId }
		});
	},

	declineInvite () {
		client.request({
			cpn: 'social',
			method: 'declineInvite',
			data: { targetId: this.invite.fromId }
		});
	},

	removeFromParty (id) {
		client.request({
			cpn: 'social',
			method: 'removeFromParty',
			data: { id }
		});
	},

	leaveParty () {
		client.request({
			cpn: 'social',
			method: 'leaveParty'
		});
	},

	onTogglePartyView (state) {
		this.el.removeClass('full compact minimal');
		this.el.addClass(state);
	}
};
