sap.ui.define([
    "com/ui5/testing/controller/BaseController",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/RecordController",
    "com/ui5/testing/model/Navigation",
    "sap/ui/model/json/JSONModel"
], function (BaseController, Communication, RecordController, Navigation, JSONModel) {
    "use strict";

    return BaseController.extend("com.ui5.testing.controller.Start", {
        onInit: function () {
            this._oModel = this._createViewModel();
            this.getView().setModel(this._oModel,"viewModel");
            this.getView().setModel(RecordController.getModel(),"recordModel");
            this._bRegistered = false;
            this._oInitializedPromise = null;
            this._oInitPromiseResolve = null;
            this._oInitPromiseReject = null;
            this._sTabId = "";
            RecordController.init(this.getOwnerComponent());
            this.getView().setModel(Navigation.getModel(), "navModel");
            this._getCurrentURL();
        },

        _createViewModel: function () {
            var oJSON = {
                recording: false,
                currentUrl: "",
            };
            return new JSONModel(oJSON);
        },

        _getCurrentURL : function() {
            chrome.tabs.query({ active: true, currentWindow: false }, function (tabs) {
                var sUrl = "";
                if ( tabs && tabs[0] ) {
                    sUrl = tabs[0].url;
                }
                this._oModel.setProperty("/currentUrl", sUrl);
            }.bind(this));
        },

        onStartNewRecording: function () {
            RecordController.injectScript().then(function () {
                this.getModel("navModel").setProperty("/elements", []);
                this.getModel("navModel").setProperty("/elementLength", 0);
                this.getRouter().navTo("testDetailsCreate");
            }.bind(this), function() {
                return;
            });
        },

        onOpenOverview : function() {
            this.getRouter().navTo("overview");
        },

        onOpenSettings: function () {
            this.getRouter().navTo("settings");
        },

        onStopRecord: function () {
            RecordController.stopRecording();
        }
    });
}
);
