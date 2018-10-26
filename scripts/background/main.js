chrome.browserAction.onClicked.addListener(function (tab) {
	// for the current tab, inject the "inject.js" file & execute it
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { inject: true }, function (response) {
			if (typeof response === "undefined" || typeof response.ui5TestingRegistered === "undefined") {
				registerScript(tab.ib);
			}
		});
	});
});

function startForControl(info, tab) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { startForControl: true });
	});
};

function showCode(info, tab) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { showCode: true });
	});
}

var bRegisterContextMenu = true;
var registerScript = function (id) {
	chrome.tabs.executeScript(id, {
		file: '/scripts/content/ui5Testing.js'
	}, function () {
		chrome.browserAction.setIcon({
			path: {
				"16": "/target_bright.png",
				"32": "/target_bright.png"
			}
		});
	});

	if (bRegisterContextMenu === true) {
		chrome.contextMenus.create({
			title: "Add to UI5 Testing",
			contexts: ["all"],
			onclick: startForControl
		});
		chrome.contextMenus.create({
			title: "Show current code",
			contexts: ["all"],
			onclick: showCode
		});
		bRegisterContextMenu = false;
	}
};
