sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.ui5.testing.controller.Start", {
        onInit: function () {
            
        },

        onRecord: function() {
            chrome.tabs.query({ active: true, currentWindow: false }, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { inject: true }, function (response) {
                    if (typeof response === "undefined" || typeof response.ui5TestingRegistered === "undefined") {
                        chrome.tabs.executeScript(tabs[0].id, {
                            file: '/scripts/content/ui5Testing.js'
                        });
                    }
                });
            });
        }
    });
}
);
