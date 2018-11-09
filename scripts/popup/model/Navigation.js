sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel"
], function (Object, JSONModel) {
    "use strict";

    var Navigation = Object.extend("com.ui5.testing.model.Navigation", {
        constructor: function () {
            var oJSON = {
                item: {},
                elements: [],
                elementLength: 0
            };
            this._oModel = new JSONModel(oJSON);
        }
    });

    Navigation.prototype.setSelectedItem = function (oItem) {
        this._oModel.setProperty("/item", oItem);
    };
    Navigation.prototype.getSelectedItem = function (oItem) {
        return this._oModel.getProperty("/item");
    };
    Navigation.prototype.getModel = function () {
        return this._oModel;
    };


    return new Navigation();
});