import client from '../../../js/system/client';
import events from '../../../js/system/events';
import tpl from './template.html?raw';
import templateQuest from './templateQuest.html?raw';
import './styles.css';
import config from '../../../js/config';

export default {
	tpl,

	quests: [],
	container: '.right',

	postRender () {
		if (isMobile) {
			this.el.on('click', this.toggleButtons.bind(this));
			this.find('.btnCollapse').on('click', this.toggleButtons.bind(this));
		}

		this.onEvent('clearUis', this.clear.bind(this));

		this.onEvent('onObtainQuest', this.onObtainQuest.bind(this));
		this.onEvent('onUpdateQuest', this.onUpdateQuest.bind(this));
		this.onEvent('onCompleteQuest', this.onCompleteQuest.bind(this));
		this.onEvent('onToggleQuestsVisibility', this.onToggleQuestsVisibility.bind(this));

		this.onToggleQuestsVisibility(config.showQuests);
	},

	clear () {
		this.quests = [];
		this.el.find('.list').empty();
	},

	onObtainQuest (quest) {
		let list = this.el.find('.list');

		let html = templateQuest
			.replace('$ZONE$', quest.zoneName)
			.replace('$NAME$', quest.name)
			.replace('$DESCRIPTION$', quest.description)
			.replace('$REWARD$', quest.xp + ' xp');

		let el = $(html)
			.appendTo(list);

		if (quest.isReady)
			el.addClass('ready');

		if (quest.active)
			el.addClass('active');
		else if (!quest.isReady)
			el.addClass('disabled');

		el.on('click', this.onClick.bind(this, el, quest));

		this.quests.push({
			id: quest.id,
			el,
			quest
		});

		let quests = list.find('.quest');
		quests.toArray().forEach(c => {
			let childEl = $(c);
			if (childEl.hasClass('active'))
				childEl.prependTo(list);
		});
	},

	onClick (el, quest) {
		if (!el.hasClass('ready'))
			return;

		client.request({
			cpn: 'player',
			method: 'performAction',
			data: {
				cpn: 'quests',
				method: 'complete',
				data: { questId: quest.id }
			}
		});
	},

	onUpdateQuest (quest) {
		let q = this.quests.find(f => f.id === quest.id);
		q.quest.isReady = quest.isReady;

		q.el.find('.description').html(quest.description);

		q.el.removeClass('ready');
		if (quest.isReady) {
			q.el.removeClass('disabled');
			q.el.addClass('ready');

			if (isMobile)
				events.emit('onGetAnnouncement', { msg: 'Quest ready for turn-in' });

			events.emit('onQuestReady', quest);
		}
	},

	onCompleteQuest (id) {
		let q = this.quests.find(f => f.id === id);

		if (!q)
			return;

		q.el.remove();
		this.quests.spliceWhere(f => f.id === id);
	},

	toggleButtons (e) {
		this.el.toggleClass('active');
		e.stopPropagation();
	},

	onToggleQuestsVisibility (state) {
		const shouldHide = state === 'off';

		if (shouldHide)
			this.hide();
		else
			this.show();

		this.el.removeClass('minimal');
		if (state === 'minimal')
			this.el.addClass('minimal');
	}
};
