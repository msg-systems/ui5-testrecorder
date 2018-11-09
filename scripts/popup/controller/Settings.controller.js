sap.ui.define([
    "com/ui5/testing/controller/BaseController",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/RecordController",
    "com/ui5/testing/model/GlobalSettings",
    "com/ui5/testing/model/Navigation",
    "sap/ui/model/json/JSONModel", 
    "sap/m/MessageToast"
], function (BaseController, Communication, RecordController, GlobalSettings, Navigation, JSONModel, MessageToast) {
    "use strict";

    return BaseController.extend("com.ui5.testing.controller.Settings", {
        onInit: function () {
            this._oModel = this._createViewModel();
            this.getView().setModel(this._oModel, "viewModel");
            this.getView().setModel(RecordController.getModel(), "recordModel");
            this.getView().setModel(GlobalSettings.getModel(), "settingsModel");
            this.getRouter().getRoute("settings").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function () {
            GlobalSettings.load();
        },


        onSave : function() {
            GlobalSettings.save();
            this.getRouter().navTo("start");
        },

        onClearSettings : function() {
            chrome.storage.local.clear();
            MessageToast.show("Cleaned local storage");
            GlobalSettings.load();
        },

        _createViewModel: function () {
            var oJSON = {
            };
            return new JSONModel(oJSON);
        }
    });
});