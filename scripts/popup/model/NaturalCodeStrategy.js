sap.ui.define([
    "sap/ui/base/Object"
], function(UI5Object) {
    "use strict";

    var NaturalCodeStrategy = UI5Object.extend("com.ui5.testing.model.NaturalCodeStrategy", {
        constructor: function () {

        }
    });

    NaturalCodeStrategy.prototype.generate = function(oCodeSettings, aElements, codeHelper) {
        var aCodes = [];
        aCodes.push({
            codeName: "Test description",
            type: "FTXT",
            order: 1,
            content: [],
            constants: [],
            code: "Complete natural test description of the recorded test."
        });
        return aCodes;
    };

    NaturalCodeStrategy.prototype.createTestStep = function (oTestStep) {
        return "Single test step description";
    };

    return NaturalCodeStrategy;
});