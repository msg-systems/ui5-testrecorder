sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/Navigation",
    "sap/m/MessageToast"
], function (Object, JSONModel, Communication, Navigation, MessageToast) {
    "use strict";

    var RecordController = Object.extend("com.ui5.testing.model.RecordController", {
        constructor: function() {
            var oJSON = {
                recording: false
            };
            this._oModel = new JSONModel(oJSON);
            this._sTabId = "";
            this._oInitializedPromise = null;
            this._oComponent = null;
            Communication.registerEvent("stopped", this._onStopped.bind(this));
            Communication.registerEvent("loaded", this._onInjectionDone.bind(this));
        }
    });

    RecordController.prototype.getModel = function () {
        return this._oModel;
    };

    RecordController.prototype.init = function (oComponent) {
        this._oComponent = oComponent;
    };

    RecordController.prototype.startRecording = function() {
        Communication.fireEvent("start");
        this._oModel.setProperty("/recording", true);
        chrome.tabs.update(this._sTabId, { "active": true }, function (tab) { });
    };

    RecordController.prototype.stopRecording = function () {
        Communication.fireEvent("stop");
    };

    RecordController.prototype._onStopped = function (oData) {
        this._oModel.setProperty("/recording", false);
    };


    RecordController.prototype._onInjectionDone = function (oData) {
        if (oData.ok === true) {
            this._oInitPromiseResolve();
            window.onbeforeunload = function() {
                //inform our window, to clean up!
                this.stopRecording();
            }.bind(this);
            MessageToast.show("Initialization for " + this._sCurrentURL + " succeed. UI5 " + oData.version + " is used");
        } else {
            MessageToast.show("Initialization for " + this._sCurrentURL + " failed. UI5 is not used on that page.");
            this._oInitPromiseReject();
            this._oInitPromiseReject = null;
        }
    };

    RecordController.prototype.injectScript = function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            if (this._oInitializedPromise) {
                this._oInitializedPromise.then(resolve, reject);
                return;
            }
            this._oInitializedPromise = new Promise(function (resolve, reject) {
                this._oInitPromiseResolve = resolve;
                this._oInitPromiseReject = reject;
                chrome.tabs.query({ active: true, currentWindow: false }, function (tabs) {
                    //check if we area already registered..
                    chrome.tabs.sendMessage(tabs[0].id, { type: "ui5-check-if-injected" }, function (response) {
                        that._sTabId = tabs[0].id;
                        that._sCurrentURL = tabs[0].url;
                        if (typeof response === "undefined" || typeof response.injected === "undefined") {
                            chrome.tabs.executeScript(that._sTabId, {
                                file: '/scripts/content/ui5Testing.js'
                            }, function() {
                                if (chrome.runtime.lastError) {
                                    MessageToast.show("Initialization for " + url + " failed. Please restart the Addon.");
                                    that._oInitializedPromise = null;
                                }
                            });
                            Communication.register(that._sTabId);
                        } else {
                            Communication.register(that._sTabId);
                        }
                    });
                });
            }.bind(this));
            this._oInitializedPromise.then(resolve, reject);
        }.bind(this))
    }

    return new RecordController();
});