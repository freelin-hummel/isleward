import onJoinChannel from './onJoinChannel';

const onGetPlayer = player => {
	if (player.social?.customChannels)
		player.social.customChannels.forEach(c => onJoinChannel(c));
};

export default onGetPlayer;
