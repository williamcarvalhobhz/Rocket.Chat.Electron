import { nativeImage, TouchBar } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n';
import { connect } from '../store';
import { mainWindow } from './mainWindow';
const {
	TouchBarButton,
	TouchBarLabel,
	TouchBarSegmentedControl,
	TouchBarScrubber,
	TouchBarPopover,
} = TouchBar;


let state = {
	servers: [],
	activeServerUrl: null,
};

const events = new EventEmitter();

let isUsingSegmentedControl;
let selectServerControl;

const createSegmentedControl = () => (
	new TouchBarSegmentedControl({
		segmentStyle: 'separated',
		segments: state.servers.map((server) => ({ label: server.title, server })),
		selectedIndex: state.servers.findIndex(({ url }) => url === state.activeServerUrl),
		change: (index) => events.emit('select-server', state.servers[index].url),
	})
);

const createScrubber = () => (
	new TouchBarScrubber({
		items: state.servers.map((server) => ({ label: server.title, server })),
		highlight: (index) => events.emit('select-server', state.servers[index].url),
		selectedStyle: 'background',
		showArrowButtons: true,
		mode: 'fixed',
	})
);

const createTouchBar = (selectServerControl) => (
	new TouchBar({
		items: [
			new TouchBarPopover({
				label: i18n.__('touchBar.selectServer'),
				items: new TouchBar({
					items: [
						new TouchBarLabel({ label: i18n.__('touchBar.selectServer') }),
						selectServerControl,
					],
				}),
			}),
			new TouchBarLabel({ label: i18n.__('touchBar.formatting') }),
			...(
				['bold', 'italic', 'strike', 'inline_code', 'multi_line']
					.map((buttonId) => new TouchBarButton({
						backgroundColor: '#A4A4A4',
						icon: nativeImage.createFromPath(`${ __dirname }/public/images/touch-bar/${ buttonId }.png`),
						click: () => events.emit('format', buttonId),
					}))
			),
		],
	})
);

const update = () => {
	if (process.platform !== 'darwin') {
		return;
	}

	const { servers, activeServerUrl } = state;
	const serverTitlesLength = servers.reduce((length, { url, title }) => length + (title || url).length, 0);
	const maxLengthForSegmentsControl = 76 - i18n.__('touchBar.selectServer').length;
	const shouldUseSegmentedControl = serverTitlesLength <= maxLengthForSegmentsControl;

	if (isUsingSegmentedControl !== shouldUseSegmentedControl) {
		selectServerControl = shouldUseSegmentedControl ? createSegmentedControl() : createScrubber();
		mainWindow.setTouchBar(createTouchBar(selectServerControl));
		isUsingSegmentedControl = shouldUseSegmentedControl;
	}

	if (isUsingSegmentedControl) {
		selectServerControl.segments = servers.map((server) => ({ label: server.title, server }));
		selectServerControl.selectedIndex = servers.findIndex(({ url }) => url === activeServerUrl);
	} else {
		selectServerControl.items = servers.map((server) => ({ label: server.title, server }));
	}
};

const setState = (partialState) => {
	const previousState = state;
	state = {
		...state,
		...partialState,
	};
	update(previousState);
};

let disconnect;

const mount = () => {
	if (process.platform !== 'darwin') {
		return;
	}

	update();
	disconnect = connect(({
		servers,
		view,
	}) => ({
		servers,
		activeServerUrl: view.url,
	}))(setState);
};

const unmount = () => {
	if (process.platform !== 'darwin') {
		return;
	}

	events.removeAllListeners();
	disconnect();
	mainWindow.setTouchBar(null);
};

export const touchBar = Object.assign(events, {
	mount,
	unmount,
});
