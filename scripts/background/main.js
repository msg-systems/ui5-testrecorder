chrome.browserAction.onClicked.addListener(function (tab) {
	/*chrome.browserAction.setPopup({
		popup: chrome.extension.getURL('/scripts/popup/index.html')
	});*/
	chrome.tabs.create({
		url: chrome.extension.getURL('/scripts/popup/index.html'),
		active: false
	}, function (tab) {
		// After the tab has been created, open a window to inject the tab
		chrome.windows.create({
			tabId: tab.id,
			type: 'popup',
			focused: true
		});
		chrome.tabs.executeScript(tab.id, {
			file: '/scripts/content/ui5Testing.js'
		});
	});

	/*
	// for the current tab, inject the "inject.js" file & execute it
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.sendMessage(tabs[0].id, { inject: true }, function (response) {
			if (typeof response === "undefined" || typeof response.ui5TestingRegistered === "undefined") {
				registerScript(tab.ib);
			}
		});
	});*/
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
			title: "Add Control to Test",
			contexts: ["page", "frame","selection", "page_action"],
			onclick: startForControl
		});
		chrome.contextMenus.create({
			title: "Current Test",
			contexts: ["browser_action"],
			onclick: showCode
		});
		chrome.contextMenus.create({
			parentId: "testManagement",
			title: "Export Test",
			contexts: ["browser_action"],
			onclick: showCode
		});
		bRegisterContextMenu = false;
	}
};

chrome.contextMenus.create({
	id: "testManagement",
	title: "Test-Management",
	contexts: ["browser_action"]
});

chrome.contextMenus.create({
	parentId: "testManagement",
	title: "Import Test",
	contexts: ["browser_action"],
	onclick: showCode
});

chrome.contextMenus.create({
	title: "Import Test",
	contexts: ["launcher"],
	onclick: showCode
});