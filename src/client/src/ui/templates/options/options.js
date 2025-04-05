import events from '../../../js/system/events';
import template from './template.html?raw';
import './styles.css';
import renderer from '../../../js/rendering/renderer';
import config from '../../../js/config';

export default {
	tpl: template,
	centered: true,

	modal: true,
	hasClose: true,

	isFlex: true,

	postRender () {
		this.onEvent('onOpenOptions', this.show.bind(this));

		this.find('.item.nameplates .name').on('click', events.emit.bind(events, 'onUiKeyDown', { key: 'v' }));
		this.find('.item.quests .name').on('click', this.toggleQuests.bind(this));
		this.find('.item.events .name').on('click', this.toggleEvents.bind(this));
		this.find('.item.quality .name').on('click', this.toggleQualityIndicators.bind(this));
		this.find('.item.unusable .name').on('click', this.toggleUnusableIndicators.bind(this));
		this.find('.item.lastChannel .name').on('click', this.toggleLastChannel.bind(this));
		this.find('.item.partyView .name').on('click', this.togglePartyView.bind(this));
		this.find('.item.damageNumbers .name').on('click', this.toggleDamageNumbers.bind(this));

		//Can only toggle fullscreen directly in a listener, not deferred the way jQuery does it,
		// so we register this handler in a different way
		this.find('.item.screen .name')[0].addEventListener('click', this.toggleScreen.bind(this));

		this.find('.item.volume .btn').on('click', this.modifyVolume.bind(this));

		[
			'onResize',
			'onUiKeyDown',
			'onToggleNameplates',
			'onToggleQualityIndicators',
			'onToggleUnusableIndicators',
			'onToggleEventsVisibility',
			'onToggleQuestsVisibility',
			'onToggleLastChannel',
			'onVolumeChange',
			'onTogglePartyView',
			'onToggleDamageNumbers'
		].forEach(e => {
			this.onEvent(e, this[e].bind(this));
		});

		this.find('.item').on('click', events.emit.bind(events, 'onClickOptionsItem'));
	},

	modifyVolume (e) {
		const el = $(e.target);

		const isIncrease = el.hasClass('increase');
		const delta = isIncrease ? 10 : -10;

		const soundType = el.parent().parent().hasClass('sound') ? 'sound' : 'music';

		events.emit('onManipulateVolume', {
			soundType,
			delta
		});
	},

	toggleUnusableIndicators () {
		config.toggle('unusableIndicators');

		if (config.unusableIndicators === 'background' && config.qualityIndicators === 'background') {
			config.toggle('qualityIndicators');
			events.emit('onToggleQualityIndicators', config.qualityIndicators);
		}

		events.emit('onToggleUnusableIndicators', config.unusableIndicators);
	},

	onToggleUnusableIndicators (state) {
		const newValue = state[0].toUpperCase() + state.substr(1);

		this.find('.item.unusable .value').html(newValue);
	},

	toggleQualityIndicators () {
		config.toggle('qualityIndicators');

		if (config.qualityIndicators === 'background' && config.unusableIndicators === 'background') {
			config.toggle('unusableIndicators');
			events.emit('onToggleUnusableIndicators', config.unusableIndicators);
		}

		events.emit('onToggleQualityIndicators', config.qualityIndicators);
	},

	onToggleQualityIndicators (state) {
		const newValue = state[0].toUpperCase() + state.substr(1);

		this.find('.item.quality .value').html(newValue);
	},

	toggleScreen () {
		const state = renderer.toggleScreen();
		const newValue = (state === 'Windowed') ? 'Off' : 'On';

		this.find('.item.screen .value').html(newValue);
	},

	toggleEvents () {
		config.toggle('showEvents');

		events.emit('onToggleEventsVisibility', config.showEvents);
	},

	toggleQuests () {
		config.toggle('showQuests');

		events.emit('onToggleQuestsVisibility', config.showQuests);
	},

	onToggleEventsVisibility (state) {
		const newValue = state ? 'On' : 'Off';

		this.find('.item.events .value').html(newValue);
	},

	onToggleQuestsVisibility (state) {
		const newValue = state[0].toUpperCase() + state.substr(1);

		this.find('.item.quests .value').html(newValue);
	},

	onResize () {
		let isFullscreen = (window.innerHeight === screen.height);
		const newValue = isFullscreen ? 'On' : 'Off';

		this.find('.item.screen .value').html(newValue);
	},

	onToggleNameplates (state) {
		const newValue = state ? 'On' : 'Off';

		this.find('.item.nameplates .value').html(newValue);
	},

	toggleAudio () {
		config.toggle('playAudio');

		events.emit('onToggleAudio', config.playAudio);
	},

	onToggleAudio (isAudioOn) {
		const newValue = isAudioOn ? 'On' : 'Off';

		this.find('.item.audio .value').html(newValue);
	},

	toggleLastChannel () {
		config.toggle('rememberChatChannel');

		events.emit('onToggleLastChannel', config.rememberChatChannel);
	},

	onToggleLastChannel (state) {
		const newValue = state ? 'On' : 'Off';

		this.find('.item.lastChannel .value').html(newValue);
	},

	togglePartyView () {
		config.toggle('partyView');

		events.emit('onTogglePartyView', config.partyView);
	},

	onTogglePartyView (state) {
		const newValue = state[0].toUpperCase() + state.substr(1);

		this.find('.item.partyView .value').html(newValue);
	},

	toggleDamageNumbers () {
		config.toggle('damageNumbers');

		events.emit('onToggleDamageNumbers', config.damageNumbers);
	},

	onToggleDamageNumbers (state) {
		const newValue = state[0].toUpperCase() + state.substr(1);

		this.find('.item.damageNumbers .value').html(newValue);
	},

	onVolumeChange ({ soundType, volume }) {
		const item = this.find(`.item.volume.${soundType}`);

		item.find('.value').html(volume);

		const tickLeftPosition = `${volume}%`;
		item.find('.tick').css({ left: tickLeftPosition });

		const btnDecrease = item.find('.btn.decrease').removeClass('disabled');
		const btnIncrease = item.find('.btn.increase').removeClass('disabled');

		if (volume === 0)
			btnDecrease.addClass('disabled');
		else if (volume === 100)
			btnIncrease.addClass('disabled');

		const configKey = `${soundType}Volume`;
		config.set(configKey, volume);
	},

	build () {
		this.onToggleNameplates(config.showNames);
		this.onToggleAudio(config.playAudio);
		this.onToggleEventsVisibility(config.showEvents);
		this.onToggleQuestsVisibility(config.showQuests);
		this.onToggleQualityIndicators(config.qualityIndicators);
		this.onToggleUnusableIndicators(config.unusableIndicators);
		this.onToggleLastChannel(config.rememberChatChannel);
		this.onTogglePartyView(config.partyView);
		this.onToggleDamageNumbers(config.damageNumbers);

		this.onVolumeChange({
			soundType: 'sound',
			volume: config.soundVolume
		});

		this.onVolumeChange({
			soundType: 'music',
			volume: config.musicVolume
		});
	},

	onAfterShow () {
		this.onResize();

		this.build();
	},

	onUiKeyDown (keyEvent) {
		const { key } = keyEvent;

		if (key === 'v') {
			config.toggle('showNames');

			events.emit('onToggleNameplates', config.showNames);

			const newValue = config.showNames ? 'On' : 'Off';
			this.find('.item.nameplates .value').html(newValue);
		}
	},

	afterHide () {
		this.onResize();

		events.emit('onCloseOptions');
	}
};
