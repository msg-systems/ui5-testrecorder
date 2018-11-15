sap.ui.define([
    "com/ui5/testing/controller/BaseController",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/RecordController",
    "com/ui5/testing/model/Navigation",
    "com/ui5/testing/model/ExportImport",
    "sap/ui/model/json/JSONModel"
], function (BaseController, Communication, RecordController, Navigation, ExportImport, JSONModel) {
    "use strict";

    return BaseController.extend("com.ui5.testing.controller.Overview", {
        onInit: function () {
            this._oModel = this._createViewModel();
            this.getView().setModel(this._oModel, "viewModel");
            this.getView().setModel(RecordController.getModel(), "recordModel");
            this.getRouter().getRoute("overview").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function () {
            this._loadData();
        },

        onAfterRendering: function () {
            var that = this;
            document.getElementById("importOrigHelper").addEventListener("change", function (e) {
                var files = e.target.files, reader = new FileReader();
                var fnImportDone = function () {
                    that._importDone(JSON.parse(this.result));
                }
                reader.onload = fnImportDone;
                reader.readAsText(files[0]);
            }, false);
        },

        _importDone: function (oData) {
            ExportImport.save(oData).then(function() {
                this._loadData();
            }.bind(this));
        },

        onImport : function() {
            document.getElementById("importOrigHelper").click();
        },

        onNavigateToTest: function (oEvent) {
            this.getRouter().navTo("testDetails", {
                TestId: oEvent.getSource().getBindingContext("viewModel").getObject().uuid
            });
        },

        _loadData: function () {
            var aItems = [];
            var that = this;
            that._oModel.setProperty("/items", []);
            chrome.storage.local.get(["items"], function (items) {
                if (items && items.items) {
                    aItems = items.items;
                }
                var aDataStore = [];
                chrome.storage.local.get(aItems, function (aData) {
                    for (var sId in aData) {
                        var oData = JSON.parse(aData[sId]);
                        aDataStore.push({
                            uuid: oData.test.uuid,
                            createdAt: new Date(oData.test.createdAt),
                            testName: oData.codeSettings.testName,
                            testUrl: oData.codeSettings.testUrl
                        });
                    }
                    that._oModel.setProperty("/items", aDataStore);
                });
            });
        },

        _createViewModel: function () {
            var oJSON = {
                recording: false
            };
            return new JSONModel(oJSON);
        }
    });
});