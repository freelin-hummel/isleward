//Components
import ChatContainer from './components/ChatContainer';
import Tabs from './components/Tabs';
import Messages from './components/Messages';
import Input from './components/Input';
import ContextMenu from './components/ContextMenu';
import Resizer from './components/Resizer';

//Styles
import './styles.css';

//Component
const Chat = () => {
	return (
		<ChatContainer id={'uiChat'}>
			<Tabs />
			<Messages />
			<Input />
			<ContextMenu />
			<Resizer />
		</ChatContainer>
	);
};

export default Chat;
