chrome.browserAction.onClicked.addListener(function (tab) {
	chrome.tabs.create({
		url: chrome.extension.getURL('/scripts/popup/index.html'),
		active: false
	}, function (tab) {
		chrome.windows.create({
			tabId: tab.id,
			type: 'popup',
			focused: true
		}, function (fnWindow) {
			chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
				if (message.type === "HandshakeToWindow") {
					chrome.runtime.sendMessage({
						"type": "send-window-id",
						"windowid" : fnWindow.id
					}, function (response) {
					});
				}
			});

		});

	});
});