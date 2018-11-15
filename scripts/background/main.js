chrome.browserAction.onClicked.addListener(function (tab) {
	//in case the mentioned tab is closed, we will also close our own - it doesn't make much sense, as we anyways only have "own tab authorization"
	var sOurTabId = tab.id;
	var sOurWindowId = 0;
	chrome.tabs.onRemoved.addListener(function (tabId, info) {
		if (tabId === sOurTabId) {
			chrome.windows.remove(sOurWindowId);
		}
	}.bind(this));

	chrome.tabs.create({
		url: chrome.extension.getURL('/scripts/popup/index.html'),
		active: false
	}, function (tab) {
		chrome.windows.create({
			tabId: tab.id,
			type: 'popup',
			focused: true
		}, function (fnWindow) {
			sOurWindowId = fnWindow.id;
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