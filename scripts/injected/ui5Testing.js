var TestHandlerSingleton = null;

document.addEventListener('do-ui5-send-xml-view', function (oXMLEvent) {
    TestHandlerSingleton.init(oXMLEvent.detail);
});
document.addEventListener('do-ui5-switch', function (oXMLEvent) {
    TestHandlerSingleton.switch();
});
document.addEventListener('do-show-code', function (oXMLEvent) {
    TestHandlerSingleton.showCode();
});
document.addEventListener('do-ui5-start', function (oXMLEvent) {
    if (oXMLEvent.detail && oXMLEvent.detail.domId) {
        TestHandlerSingleton.startFor(oXMLEvent.detail.domId);
    } else {
        TestHandlerSingleton._start();
    }
});

var oTestGlobalBuffer = {};

//super shitty code - we are just architectuarlly not designed correctly here..
if (typeof sap === "undefined" || typeof sap.ui === "undefined" || typeof sap.ui.getCore === "undefined" || !sap.ui.getCore() || !sap.ui.getCore().isInitialized()) {
    document.dispatchEvent(new CustomEvent('do-ui5-ok', { detail: { ok: false } }));
}
else {
    document.dispatchEvent(new CustomEvent('do-ui5-ok', { detail: { ok: true } }));

    sap.ui.define([
        "sap/ui/base/Object",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "sap/ui/core/ValueState",
        "sap/m/MessageBox"
    ], function (Object, JSONModel, MessageToast, ValueState, MessageBox) {
        "use strict";

        var TestHandler = Object.extend("com.tru.TestHandler", {
            _oDialog: null,
            _oModel: new JSONModel({
                element: {
                    property: {}, //properties
                    item: {}, //current item itself,
                    attributeFilter: [], //table entries of selectors
                    assertFilter: [], //table entries of asserts
                },
                elements: [],
                elementDefault: {
                    property: {
                        assKeyMatchingCount: 1,
                        elementState: "Success",
                        assKey: "ATR",
                        assertMessage: "",
                        selectActInsert: "",
                        actKey: "PRS",
                        type: "ACT",
                        selectItemBy: "UI5",
                        previewCode: ""
                    },
                    identifiedElements: [], //elements which are fitting to the current selector
                    item: {},
                    attributeFilter: [],
                    assertFilter: [],
                    subActionTypes: []
                },
                codeSettings: {
                    language: "TCF",
                    testName: "",
                    testCategory: "",
                    testUrl: window.location.href
                },
                dynamic: {
                    attrType: []
                },
                statics: {
                    type: [
                        { key: "SEL", text: "Select" },
                        { key: "ACT", text: "Action" },
                        { key: "ASS", text: "Assert" },
                    ],
                    action: [
                        { key: "PRS", text: "Press" },
                        { key: "TYP", text: "Type Text" }
                    ],
                    assertType: [
                        { key: "ATR", text: "Attributes" },
                        { key: "EXS", text: "Exists" },
                        { key: "MTC", text: "Matching Count" },
                    ],
                    selType: [
                        { key: "DOM", text: "DOM-Identifier" },
                        { key: "UI5", text: "UI5-Identifier" },
                        { key: "ATTR", text: "Combination of Attributes" }
                    ],
                    attrType: [
                        { key: "OWN", text: "Own Element" },
                        { key: "VIW", text: "View" },
                        { key: "PRT", text: "Parent-Element (L1)" },
                        { key: "PRT2", text: "Parent-Element (L2)" },
                        { key: "PRT3", text: "Parent-Element (L3)" },
                        { key: "PRT4", text: "Parent-Element (L4)" },
                        { key: "PLBL", text: "Label Element" },
                        { key: "PEL", text: "Previous Element" },
                        { key: "NEL", text: "Next Element" }
                    ],
                    operator: [
                        { key: "EQ", text: "Equal" },
                        { key: "NE", text: "Not Equal" },
                        { key: "CP", text: "Contains" },
                        { key: "NP", text: "Not Contains" }
                    ]
                },
                showTargetElement: true,
                completeCode: "",
                completeCodeSaved: "",
                isStretched: false,
                codes: [],
                idQualityState: ValueState.None,
                idQualityStateText: "",
                codeLines: [] //currently maintained code-lines
            }),
            _bActive: false,
            _bStarted: false,
            constructor: function () {
                this._getCriteriaTypes();
            }
        });

        TestHandler.prototype._getControlFromDom = function (oDomNode) {
            var oControls = $(oDomNode).control();
            if (!oControls || !oControls.length) {
                return null;
            }
            return oControls[0];
        };

        TestHandler.prototype._onClose = function () {
            this._oDialog.close();
        };

        TestHandler.prototype._adjustBeforeSaving = function (oElement) {
            //what we are actually saving, is an extremly reduced form, of everything we need for code generation
            var oReturn = {
                property: oElement.property,
                item: {
                    identifier: oElement.item.identifier
                },
                attributeFilter: oElement.attributeFilter,
                assertFilter: oElement.assertFilter,
                selector: this._getSelectorDefinition(oElement),
                assertion: this._getAssertDefinition(oElement)
            };

            return JSON.parse(JSON.stringify(oReturn));
        };

        TestHandler.prototype._onSave = function () {
            this._checkAndDisplay(function () {
                this._oDialog.close();

                var aElements = this._oModel.getProperty("/elements");
                var oCurrentElement = this._oModel.getProperty("/element");
                aElements.push(this._adjustBeforeSaving(oCurrentElement));
                this._oModel.setProperty("/elements", aElements);

                this._oModel.setProperty("/codes", this._testCafeGetCode(this._oModel.getProperty("/elements")));
                this._executeAction(this._oModel.getProperty("/element"));
                if (this._bStarted === true) {
                    this._start();
                }
            }.bind(this));
        };

        TestHandler.prototype._getFinalDomNode = function (oElement) {
            var sExtension = this._oModel.getProperty("/element/property/domChildWith");
            if (!sExtension.length) {
                return $(oElement.control.getDomRef());
            }

            return $("#" + (oElement.control.getDomRef().id + sExtension));
        };

        TestHandler.prototype._executeAction = function () {
            var sType = this._oModel.getProperty("/element/property/type");
            if (sType !== "ACT") {
                return false;
            }
            var sActType = this._oModel.getProperty("/element/property/actKey"); //PRS|TYP

            var aFound = this._getFoundElements(1);
            if (aFound.length === 0) {
                return false;
            }

            var oItem = aFound[0];
            if (!oItem.dom) {
                return false;
            }
            var oDom = this._getFinalDomNode(oItem);

            if (sActType === "PRS") {
                //oDom.trigger("tap");

                //send touch event..
                var event = new MouseEvent('mousedown', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event; //self refer
                oDom.get(0).dispatchEvent(event);
                /*
                var event = new MouseEvent('mousemove', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event; //self refer
                oDom.get(0).dispatchEvent(event);*/
                var event = new MouseEvent('mouseup', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event; //self refer
                oDom.get(0).dispatchEvent(event);

                var event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event; //self refer
                oDom.get(0).dispatchEvent(event);
            } else if (sActType === "TYP") {
                var e = jQuery.Event("keypress");
                e.which = 13; // Enter
                oDom.val(this._oModel.getProperty("/element/property/selectActInsert"));
                oDom.trigger(e);

                var event = new KeyboardEvent('input', {
                    view: window,
                    data: '',
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event;
                oDom.get(0).dispatchEvent(event);
            }
        };

        TestHandler.prototype.onUpdateAction = function (oEvent) {
            this._updateSubActionTypes(false);
            this._adjustDomChildWith(this._oModel.getProperty("/element/item"));
            this._updatePreview();
        };

        TestHandler.prototype._getAllChildrenOfDom = function (oDom, oControl) {
            var aChildren = $(oDom).children();
            var aReturn = [];
            for (var i = 0; i < aChildren.length; i++) {
                var aControl = $(aChildren[i]).control();
                if (aControl.length === 1 && aControl[0].getId() === oControl.getId()) {
                    aReturn.push(aChildren[i]);
                    aReturn = aReturn.concat(this._getAllChildrenOfDom(aChildren[i], oControl));
                }
            }
            return aReturn;
        };

        TestHandler.prototype._getAllChildrenOfObject = function (oItem) {
            if (!oItem.dom) {
                return [];
            }
            return this._getAllChildrenOfDom(oItem.control.getDomRef(), oItem.control);
        };

        TestHandler.prototype._updateSubActionTypes = function () {
            var oItem = this._oModel.getProperty("/element/item");
            var sAction = this._oModel.getProperty("/element/property/actKey");
            var sDomChildWith = this._oModel.getProperty("/element/property/domChildWith");
            var oItemMeta = this._getMergedClassArray(oItem);
            var aRows = [];
            if (oItemMeta.actions[sAction]) {
                aRows = oItemMeta.actions[sAction];
            }

            //add those children which we are missing at the moment (so basically, all chidlren with the same control)
            var aSubObjects = this._getAllChildrenOfObject(oItem);
            for (var i = 0; i < aSubObjects.length; i++) {
                var sIdChild = aSubObjects[i].id.substr(oItem.control.getId().length);
                //check if sIdChild is part of our current "domChildWith"
                if (aRows.filter(function (e) { return e.domChildWith === sIdChild; }).length === 0) {
                    aRows.push({
                        text: sIdChild,
                        domChildWith: sIdChild,
                        order: 9999
                    });
                }
            }
            aRows.sort((a, b) => (a.order > b.order) ? 1 : ((b.order > a.order) ? -1 : 0));

            //check if the current value is fine..
            if (aRows.filter(function (e) { return e.domChildWith === sDomChildWith; }).length === 0) {
                sDomChildWith = aRows.length >= 0 ? aRows[0].domChildWith : "";
            }
            //we now have a valid value - check if there is any preferred value for the currently selected 
            this._oModel.setProperty("/element/subActionTypes", aRows);
        };

        //returns { ok: false/true + message }
        TestHandler.prototype._check = function (fnCallback) {
            var oItem = this._oModel.getProperty("/element/item");
            var bShowMessage = false;
            var sSelectType = this._oModel.getProperty("/element/property/selectItemBy");
            var sType = this._oModel.getProperty("/element/property/type");
            var sMessage = "";
            var sExpectedCount = this._oModel.getProperty("/element/property/assKeyMatchingCount");
            if (oItem.identifier.idGenerated == true && sSelectType === "UI5") {
                sMessage = "You are probably using a generated ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors.";
                bShowMessage = true;
            } else if (oItem.identifier.idCloned === true && sSelectType === "UI5") {
                sMessage = "You are probably using a cloned ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors.";
                bShowMessage = true;
            }
            var aFound = this._getFoundElements(0);
            if (aFound.length === 0 && sType === "ACT") {
                sMessage = "Your selected element combination does not return any selection result.";
                bShowMessage = true;
            } else if (aFound.length > 1 && sType === "ACT") {
                sMessage = "Your selected element combination returns more than the expected selection result. The test will just take the first, while first is random.";
                bShowMessage = true;
            } else if (aFound.length !== sExpectedCount && sType === "ASS") {
                sMessage = "The assert would fail, as the expected count is different than the actual count of elements.";
                bShowMessage = true;
            }
            if (sSelectType === "DOM") {
                sMessage = "Using DOM Selectors should be avoided, as you do not get any framework support.";
                bShowMessage = true;
            }
            return {
                ok: bShowMessage === false,
                message: sMessage
            };
        };

        TestHandler.prototype._checkElementNumber = function () {
            if (this._check().ok === false) {
                this._oModel.setProperty("/element/property/elementState", "Error");
            } else {
                this._oModel.setProperty("/element/property/elementState", "Success");
            }
        };

        //check if the data entered seems to be valid.. following checks are performed
        //(1) ID is used and generated
        //(2) ID is used and cloned
        //(3) DOM-ID is used (should be avoided where possible)
        //(4) No or >1 Element is selected..
        TestHandler.prototype._checkAndDisplay = function (fnCallback) {
            var oResult = this._check();

            if (oResult.ok === false) {
                MessageBox.show(oResult.message, {
                    styleClass: "sapUiCompact",
                    icon: MessageBox.Icon.WARNING,
                    title: "Are you sure about this selector?",
                    actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            fnCallback();
                        }
                    }
                });
            } else {
                fnCallback();
            }
        };

        TestHandler.prototype._testCafeGetCode = function (aElements) {
            var aCodes = [];

            //for testcafe we are returning: (1) installation instructions..
            var oCodeInstall = {
                codeName: "Installation (Non WebIDE)",
                type: "FTXT",
                order: 2,
                code: "<h3>Installation</h3>" +
                    "<p>Execute the following command-line paramters:</p>" +
                    "<code>npm install testcafe, testcafe-reporter-xunit, ui5-testcafe-selector --save-dev</code>" +
                    "<p>This will install all relevant packages for the test-automation runner.</p>" +
                    "<h3>Test-Configuration</h3>" +
                    "<p>Write a new testfile and copy/paste the code.</p>" +
                    "<h3>Running</h3>" +
                    "<p>Run via Command-Line via: <code>testcafe chrome your_test_file.js</code><br/>" +
                    "Run via Grunt using <a href=\"https://www.npmjs.com/package/grunt-testcafe\" style=\"color:green; font-weight:600;\">grunt-testcafe</a></p>"
            }
            aCodes.push(oCodeInstall);

            //(2) execute script
            var oCodeTest = {
                codeName: "Test",
                type: "CODE",
                order: 1
            };
            var sCode = "";
            var oCodeSettings = this._oModel.getProperty("/codeSettings");

            sCode = 'import { UI5Selector } from "ui5-testcafe-selector";\n';
            sCode += "fixture('" + oCodeSettings.testCategory + "')\n";
            sCode += "  .page('" + oCodeSettings.testUrl + "');\n";
            sCode += "\n";
            sCode += "test('" + oCodeSettings.testName + "', async t => {\n";
            for (var i = 0; i < aElements.length; i++) {
                var aLines = this._getCodeFromItem(aElements[i]);
                for (var j = 0; j < aLines.length; j++) {
                    sCode += "  " + aLines[j] + "\n";
                }
            }
            sCode += "});";
            oCodeTest.code = sCode;
            aCodes.push(oCodeTest);
            return aCodes;
        };

        TestHandler.prototype._updatePreview = function () {
            var oItem = this._oModel.getProperty("/element");
            oItem = this._adjustBeforeSaving(oItem);
            var aStoredItems = [].concat(this._oModel.getProperty("/elements"), [oItem]);
            this._oModel.setProperty("/codes", this._testCafeGetCode(aStoredItems));
            this._oModel.setProperty("/element/identifiedElements", this._getFoundElements(0));
            this._checkElementNumber();
        };

        TestHandler.prototype._findItemAndExclude = function (oSelector) {
            var aInformation = this._findItem(oSelector);

            //remove all items, which are starting with "testDialog"..
            var aReturn = [];
            for (var i = 0; i < aInformation.length; i++) {
                if (aInformation[i].getId().indexOf("testDialog") === -1) {
                    aReturn.push(aInformation[i]);
                }
            }
            return aReturn;
        }

        TestHandler.prototype._getFoundElements = function (iGetFullData) {
            var oDefinition = this._getSelectorDefinition(typeof oElement === "undefined" ? this._oModel.getProperty("/element") : oElement);
            var aItems = this._findItemAndExclude(oDefinition.selectorAttributes);
            var aItemsEnhanced = [];
            for (var i = 0; i < aItems.length; i++) {
                aItemsEnhanced.push(this._getElementInformation(aItems[i], aItems[i].getDomRef(), i < iGetFullData || iGetFullData === -1));
            }
            return aItemsEnhanced;
        };

        TestHandler.prototype._getAssertDefinition = function (oElement) {
            var sBasisCode = "";
            var sCode = "";
            var aAsserts = oElement.assertFilter;
            var oAssertScope = {};
            var sAssertType = oElement.property.assKey;
            var sAssertMsg = oElement.property.assertMessage;
            var aCode = [];
            var sAssertCount = oElement.property.assKeyMatchingCount;

            if (sAssertType === 'ATR') {
                sBasisCode += "getUI5(" + "({ element }) => element.";
                for (var x = 0; x < aAsserts.length; x++) {
                    oAssertScope = {}; //reset per line..
                    var oAssert = aAsserts[x];

                    var oAssertLocalScope = this._attributeTypes[oAssert.attributeType].getAssertScope(oAssertScope);
                    var oAssertSpec = this._getValueSpec(oAssert, oElement.item);
                    if (oAssertSpec === null) {
                        continue;
                    }

                    var sAssertFunc = "";
                    if (oAssert.operatorType == 'EQ') {
                        sAssertFunc = 'eql'
                    } else if (oAssert.operatorType === 'NE') {
                        sAssertFunc = 'notEql'
                    } else if (oAssert.operatorType === 'CP') {
                        sAssertFunc = 'contains'
                    } else if (oAssert.operatorType === 'NP') {
                        sAssertFunc = 'notContains'
                    }

                    var sAddCode = sBasisCode;
                    sAddCode += oAssertSpec.assert();
                    sAddCode += "))" + "." + sAssertFunc + "(" + "'" + oAssert.criteriaValue + "'";
                    if (sAssertMsg !== "") {
                        sAddCode += "," + '"' + sAssertMsg + '"';
                    }
                    sAddCode += ")";
                    aCode.push(sAddCode);
                }
            } else if (sAssertType === "EXS") {
                sCode = sBasisCode + ".exists).ok(";
                if (sAssertMsg !== "") {
                    sCode += '"' + sAssertMsg + '"';
                }
                sCode += ")";
                aCode.push(sCode);
            } else if (sAssertType === "MTC") {
                sCode = sBasisCode + ".count).eql(" + parseInt(sAssertCount, 10) + "";
                if (sAssertMsg !== "") {
                    sCode += "," + '"' + sAssertMsg + '"';
                }
                sCode += ")";
                aCode.push(sCode);
            }

            return {
                code: aCode,
                assertScope: oAssertLocalScope
            }
        };

        TestHandler.prototype._getSelectorDefinition = function (oElement) {
            var oScope = {};
            var sSelector = "";
            var sSelectorAttributes = "";
            var sSelectorAttributesStringified = null;
            var oItem = oElement.item;
            var sActType = oElement.property.actKey; //PRS|TYP
            var sSelectType = oElement.property.selectItemBy; //DOM | UI5 | ATTR
            var sSelectorExtension = oElement.property.domChildWith;

            if (sSelectType === "DOM") {
                sSelector = "Selector";
                sSelectorAttributes = '"#' + oElement.item.identifier.domId + sSelectorExtension + '"';
            } else if (sSelectType === "UI5") {
                sSelector = "UI5Selector";
                sSelectorAttributes = '"' + oElement.item.identifier.ui5Id + sSelectorExtension + '"';
            } else if (sSelectType === "ATTR") {
                sSelector = "UI5Selector";
                var aAttributes = oElement.attributeFilter;
                if (sSelectorExtension) {
                    $.extend(true, oScope, {
                        domChildWith: sSelectorExtension
                    });
                }

                for (var i = 0; i < aAttributes.length; i++) {
                    var oAttribute = aAttributes[i];
                    var oSpec = this._getValueSpec(oAttribute, oItem);
                    if (oSpec === null) {
                        continue;
                    }
                    //extent the current local scope with the code extensions..x
                    var oScopeLocal = this._attributeTypes[oAttribute.attributeType].getScope(oScope);
                    $.extend(true, oScopeLocal, oSpec.code(oAttribute.criteriaValue));
                }

                sSelectorAttributes = oScope;
                sSelectorAttributesStringified = JSON.stringify(oScope);
            }

            return {
                selectorAttributes: sSelectorAttributes,
                selectorAttributesStringified: sSelectorAttributesStringified ? sSelectorAttributesStringified : sSelectorAttributes,
                selector: sSelector
            };
        };

        TestHandler.prototype._getCodeFromItem = function (oElement) {
            var sCode = "";
            var aCode = [];
            //get the actual element - this might seem a little bit superflicious, but is very helpful for exporting/importing (where the references are gone)
            var oSelector = oElement.selector;
            var sType = oElement.property.type; // SEL | ACT | ASS
            var sActType = oElement.property.actKey; //PRS|TYP

            //(1) first: build up the actual selector
            var sSelector = "";
            var sSelectorAttributes = "";

            sSelector = oSelector.selector;
            sSelectorAttributes = oSelector.selectorAttributesStringified;
            var sSelectorFinal = sSelector + "(" + sSelectorAttributes + ")";

            var sAction = "";
            if (sType === "SEL") {
                sCode = "await " + sSelectorFinal + ";";
                aCode = [sCode];
            } else if (sType === 'ACT') {
                sCode = "await t.";
                switch (sActType) {
                    case "PRS":
                        sAction = "click";
                        break;
                    case "TYP":
                        sAction = "typeText";
                        break;
                    default:
                        return "";
                }

                sCode = sCode + sAction + "(" + sSelectorFinal;
                if (sActType == "TYP") {
                    sCode = sCode + ',"' + oElement.property.selectActInsert + '"';
                }
                sCode = sCode + ");";
                aCode = [sCode];
            } else if (sType === 'ASS') {
                for (var i = 0; i < oElement.assertion.code.length; i++) {
                    sCode = "await t." + "(" + sSelectorFinal + ")" + "." + oElement.assertion.code[i] + ";";
                    aCode.push(sCode);
                }
            }
            return aCode;
        };

        TestHandler.prototype._getValueSpec = function (oLine, oItem) {
            var aCriteriaSettings = this._criteriaTypes[oLine.criteriaType].criteriaSpec(oItem);
            for (var j = 0; j < aCriteriaSettings.length; j++) {
                if (aCriteriaSettings[j].subCriteriaType === oLine.subCriteriaType) {
                    return aCriteriaSettings[j];
                }
            }
            return null;
        };

        TestHandler.prototype._getOwnerComponent = function (oItem) {
            var sCurrentComponent = "";
            var oParent = oItem;
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            return sCurrentComponent;
        };

        TestHandler.prototype._getUi5LocalId = function (oItem) {
            var sId = oItem.getId();
            if (sId.lastIndexOf("-") !== -1) {
                return sId.substr(sId.lastIndexOf("-") + 1);
            }
            return sId;
        };

        TestHandler.prototype._getUi5Id = function (oItem) {
            //remove all component information from the control
            var oParent = oItem;
            var sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            if (!sCurrentComponent.length) {
                return oItem.getId();
            }

            var sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
        };

        TestHandler.prototype.onSelectItem = function (oEvent) {
            var oObject = oEvent.getSource().getBindingContext("viewModel").getObject();
            var oCurrentId = oObject.control;
            this._setItem(oCurrentId, oCurrentId.getDomRef());
        };

        TestHandler.prototype.onUpdatePreview = function () {
            this._updatePreview();
        };

        TestHandler.prototype.onTypeChange = function () {
            this._adjustAttributeDefaultSetting(this._oModel.getProperty("/element/item"));
            this._updatePreview();
        };

        TestHandler.prototype._setItem = function (oControl, oDomNode) {
            var oItem = this._getElementInformation(oControl, oDomNode);
            oItem.aggregationArray = [];
            oItem.parents = [];
            for (var sKey in oItem.aggregation) {
                oItem.aggregationArray.push(oItem.aggregation[sKey]);
            }
            var oItemCur = oItem.control;
            while (oItemCur) {
                oItemCur = _getParentWithDom(oItemCur, 1);
                if (!oItemCur) {
                    break;
                }
                oItem.parents.push(this._getElementInformation(oItemCur, oItemCur.getDomRef(), false));
            }

            if (this._oCurrentDomNode) {
                $(this._oCurrentDomNode).removeClass('HVRReveal');
            }
            this._oCurrentDomNode = oDomNode;
            if (this._oCurrentDomNode) {
                $(this._oCurrentDomNode).addClass('HVRReveal');
            }

            this._oModel.setProperty("/element/item", oItem);
            this._oModel.setProperty("/element/attributeFilter", []);
            this._oModel.setProperty("/element/assertFilter", []);

            this._setValidAttributeTypes();
            this._adjustDefaultSettings(oItem, oDomNode);
            this._updateValueState(oItem);
            this._updateSubActionTypes(true);
            this._updatePreview();
        };

        TestHandler.prototype._setValidAttributeTypes = function (oItem) {
            var oItem = this._oModel.getProperty("/element/item");
            var aTypes = this._oModel.getProperty("/statics/attrType");
            var aAcceptable = [];
            for (var i = 0; i < aTypes.length; i++) {
                if (this._attributeTypes[aTypes[i].key]) {
                    var oCtrl = this._attributeTypes[aTypes[i].key].getItem(oItem);
                    if (oCtrl && oCtrl.control) {
                        aAcceptable.push(aTypes[i]);
                    }
                }
            }
            this._oModel.setProperty("/dynamic/attrType", aAcceptable);
        };

        TestHandler.prototype._getMergedClassArray = function (oItem) {
            var aClassArray = this._getClassArray(oItem);
            var oReturn = { defaultAction: "", defaultAttributes: [], actions: {} };
            //merge from button to top (while higher elements are overwriting lower elements)
            for (var i = 0; i < aClassArray.length; i++) {
                var oClass = aClassArray[i];
                oReturn.actions = oReturn.actions ? oReturn.actions : [];
                oReturn.defaultAction = oClass.defaultAction ? oClass.defaultAction : oReturn.defaultAction;

                //higher attributes overrule - no merging..
                oReturn.defaultAttributes = oClass.defaultAttributes && oClass.defaultAttributes.length > 0 ? oClass.defaultAttributes : oReturn.defaultAttributes;

                for (var sAction in oClass.actions) {
                    if (typeof oReturn.actions[sAction] === "undefined") {
                        oReturn.actions[sAction] = oClass.actions[sAction];
                    } else {
                        for (var j = 0; j < oClass.actions[sAction].length; j++) {
                            //remove all elements, with the same domChildWith, higher elements are more descriptive..
                            var aExisting = oReturn.actions[sAction].filter(function (e) { return e.domChildWith === oClass.actions[sAction][j].domChildWith; });
                            if (aExisting.length) {
                                aExisting[0] = oClass.actions[sAction][j];
                            } else {
                                oReturn.actions[sAction].push(oClass.actions[sAction][j]);
                            }
                        }
                    }
                }
            }
            return oReturn;
        };

        TestHandler.prototype._getClassArray = function (oItem) {
            var oMetadata = oItem.control.getMetadata();
            var aReturn = [];
            while (oMetadata) {
                if (!oMetadata._sClassName) {
                    break;
                }
                if (this._oElementMix[oMetadata._sClassName]) {
                    aReturn.unshift(this._oElementMix[oMetadata._sClassName]);
                }
                oMetadata = oMetadata.getParent();
            };
            return JSON.parse(JSON.stringify(aReturn));
        };

        TestHandler.prototype._adjustDefaultSettings = function (oItem, oDom) {
            if (oDom) {
                this._oModel.setProperty("/element/property/domChildWith", oDom.id.substr(oItem.control.getId().length));
            }

            var oMerged = this._getMergedClassArray(oItem);
            if (oMerged.defaultAction) {
                this._oModel.setProperty("/element/property/actKey", oMerged.defaultAction);
            }

            if (oItem.identifier.idGenerated === true || oItem.identifier.idCloned === true) {
                this._oModel.setProperty("/element/property/selectItemBy", "ATTR");
            } else {
                this._oModel.setProperty("/element/property/selectItemBy", "UI5");
            }
            this._adjustAttributeDefaultSetting(oItem);

            //adjust DOM node for action type "INP"..
            this._adjustDomChildWith(oItem);
        };

        TestHandler.prototype._adjustDomChildWith = function (oItem) {
            if (this._oModel.getProperty("/element/property/actKey") === "TYP") {
                var aNode = this._getAllChildrenOfDom(oItem.control.getDomRef(), oItem.control);
                //find the first "input" or "textarea" element type
                for (var i = 0; i < aNode.length; i++) {
                    if ($(aNode[i]).is("input") || $(aNode[i]).is("textarea")) {
                        this._oModel.setProperty("/element/property/domChildWith", aNode[i].id.substr(oItem.control.getId().length));
                        this._oModel.setProperty("/element/item/dom", aNode[i]);
                        break;
                    }
                }
            } else {
                //reset to root
                this._oModel.setProperty("/element/property/domChildWith", "");
                this._oModel.setProperty("/element/item/dom", oItem.control.getDomRef());
            }
        };

        TestHandler.prototype._adjustAttributeDefaultSetting = function (oItem) {
            var sProp = this._oModel.getProperty("/element/property/selectItemBy");
            if (sProp != "ATTR") {
                this._oModel.setProperty("/element/attributeFilter", []);
            } else {
                this._findAttribute(oItem); //generate standard, or "best fitting" (whatever that is :-)
            }
        };

        TestHandler.prototype._updateValueState = function (oItem) {
            var sState = ValueState.None;
            var sStateText = "";
            if (oItem.identifier.idGenerated === true) {
                sState = ValueState.Error;
                sStateText = "The ID is most likely generated, and will not be constant. Do not use that ID (or provide a static id)."
            } else if (oItem.identifier.idCloned === true) {
                sState = ValueState.Warning;
                sStateText = "The ID is most likely referring to a clone, and might not be constant. Do not use that ID."
            }
            this._oModel.setProperty("/idQualityState", sState);
            this._oModel.setProperty("/idQualityStateText", sStateText);
        };

        TestHandler.prototype.onAddAttribute = function (oEvent) {
            this._add("/element/attributeFilter");
            this._updatePreview();
        };

        TestHandler.prototype.onRemoveAttribute = function (oEvent) {
            var aContext = sap.ui.core.Fragment.byId("testDialog", "idAttributeTable").getSelectedContexts();
            this._remove(aContext);
        };

        TestHandler.prototype.onRemoveAssertion = function (oEvent) {
            var aContext = sap.ui.core.Fragment.byId("testDialog", "idAssertionTable").getSelectedContexts();
            this._remove(aContext);
        };

        TestHandler.prototype.onFindAttribute = function (oEvent) {
            var oItem = this._oModel.getProperty("/element/item");
            this._findAttribute(oItem);
        };

        TestHandler.prototype._findAttribute = function (oItem) {
            //(1): we will ALWAYS add the property for metadata (class), as that just makes everyting so much faster and safer..
            this._oModel.setProperty("/element/attributeFilter", []);
            this._add("/element/attributeFilter");

            //(2): we add the parent or the parent of the parent id in case the ID is unique..
            if (oItem.parent.identifier.idGenerated === false && oItem.parent.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT", criteriaType: "ID", subCriteriaType: "ID" });
            } else if (oItem.parentL2.identifier.idGenerated === false && oItem.parentL2.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT", criteriaType: "ID", subCriteriaType: "ID" });
            }

            //(3): 
            var aFound = [];
            var oMerged = this._getMergedClassArray(oItem);
            if (oMerged.defaultAttributes && oMerged.defaultAttributes.length > 0) {
                //add the elements from default attributes and stop.
                for (var i = 0; i < oMerged.defaultAttributes.length; i++) {
                    this._add("/element/attributeFilter", oMerged.defaultAttributes[i]);
                }
            }
        };

        TestHandler.prototype._remove = function (aContext) {
            if (!aContext || aContext.length !== 1) {
                return;
            }
            for (var i = 0; i < aContext.length; i++) {
                var sPath = aContext[i].getPath(); //e.g. /assertion/1/
                sPath = sPath.substr(0, sPath.lastIndexOf("/"));
                var aIndex = aContext[i].getPath().split("/");
                var iIndex = aIndex[aIndex.length - 1];

                var aProp = this._oModel.getProperty(sPath);
                aProp.splice(iIndex, 1);
                this._oModel.setProperty(sPath, aProp);
            }

            this._updatePreview();
        };

        TestHandler.prototype._add = function (sPath, oTemplate) {
            var aAttributes = this._oModel.getProperty(sPath);
            oTemplate = typeof oTemplate === "undefined" ? {} : oTemplate;
            aAttributes.push({
                attributeType: oTemplate.attributeType ? oTemplate.attributeType : "OWN",
                criteriaTypes: [],
                criteriaType: oTemplate.criteriaType ? oTemplate.criteriaType : "MTA",
                subCriteriaType: oTemplate.subCriteriaType ? oTemplate.subCriteriaType : "ELM",
                criteriaValue: "",
                operatorType: oTemplate.operatorType ? oTemplate.operatorType : "EQ"
            });
            this._oModel.setProperty(sPath, aAttributes);
            this._updateAttributeTypes(this._oModel.getContext(sPath + "/" + (aAttributes.length - 1)));
        };

        TestHandler.prototype.onAddAssertion = function (oEvent) {
            this._add("/element/assertFilter");
            this._updatePreview();
        };

        TestHandler.prototype.onAttributeTypeChanged = function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("viewModel");
            this._updateAttributeTypes(oCtx);
            this._updatePreview();
        };
        TestHandler.prototype.onCriteriaTypeChanged = function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("viewModel");
            this._updateCriteriaType(oCtx);
            this._updatePreview();
        };
        TestHandler.prototype.onSubCriteriaTypeChanged = function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("viewModel");
            this._updateSubCriteriaType(oCtx);
            this._updatePreview();
        };

        TestHandler.prototype._createDialog = function () {
            if (!this._oDialog) {
                this._oDialog = sap.ui.xmlfragment({
                    fragmentContent: this._sXMLPage,
                    fragmentName: "testDialog",
                    id: "testDialog"
                }, this);
                this._oDialog.setModel(this._oModel, "viewModel");
                this._oDialog.attachBeforeClose(null, function () {
                    if (this._oCurrentDomNode) {
                        $(this._oCurrentDomNode).removeClass('HVRReveal');
                    }
                    $(".HVRReveal").removeClass('HVRReveal');
                }.bind(this));
            }
        };
        TestHandler.prototype.onClick = function (oDomNode) {
            var oControl = this._getControlFromDom(oDomNode);
            if (!oControl) {
                return;
            }
            //per default (on purpose) reset the clicked element to "root" - the user should activly (!!) set the lower aggregation as valid..
            oDomNode = oControl.getDomRef();
            $(oDomNode).addClass('HVRReveal');
            this._createDialog();

            this._oModel.setProperty("/element", JSON.parse(JSON.stringify(this._oModel.getProperty("/elementDefault"))));
            this._oModel.setProperty("/showTargetElement", true);
            this._resetCache();

            this._setItem(oControl, oDomNode);
            sap.ui.core.Fragment.byId("testDialog", "idIconTabBarNoIcons").setSelectedKey("01");
            setTimeout(function () {
                this._oDialog.open();
            }.bind(this), 0);
        };

        TestHandler.prototype._resetCache = function () {
            oTestGlobalBuffer = {
                fnGetElement: {
                    true: {},
                    false: {}
                },
                fnGetElementInfo: {
                    true: {},
                    false: {}
                },
                label: null
            };
        };

        TestHandler.prototype.switch = function () {
            this._bActive = this._bActive !== true;
            this._bStarted = this._bActive;
            if (this._bActive === false) {
                //show code after finalizing
                this.showCode();
            }
        };

        TestHandler.prototype._start = function () {
            this._bActive = true;
            this._bStarted = true;
        };
        TestHandler.prototype._stop = function () {
            this._bActive = false;
            this._bStarted = false;
            $(".HVRReveal").removeClass('HVRReveal');
        };

        TestHandler.prototype.showCode = function (sId) {
            this._bActive = false;
            this._oModel.setProperty("/showTargetElement", false);
            this._oModel.setProperty("/element/property/previewCode", this._oModel.getProperty("/completeCodeSaved"));
            this._createDialog();
            this._oDialog.open();
        };

        TestHandler.prototype.startFor = function (sId) {
            this._bActive = false;
            var oElement = document.getElementById(sId);
            if (!oElement) {
                return;
            }
            this.onClick(oElement);
        };

        TestHandler.prototype.init = function (sXMLPage) {
            this._sXMLPage = sXMLPage;
            $(document).ready(function () {
                $(document).on("keydown", function (e) {
                    if (e.ctrlKey && e.altKey && e.shiftKey && e.which == 84) {
                        this._bActive = this._bActive !== true;
                    } else if (e.keyCode == 27) {
                        this._stop(); //stop on escape
                    }
                }.bind(this));

                $('*').mouseover(function (event) {
                    if (this._bActive === false) {
                        return;
                    }
                    $(event.target).addClass('HVRReveal');
                }.bind(this));
                $('*').mouseout(function (event) {
                    if (!that._oDialog || !that._oDialog.isOpen()) {
                        $(event.target).removeClass('HVRReveal');
                    }
                }.bind(this));

                //avoid closing any popups.. this is an extremly dirty hack
                var fnOldEvent = sap.ui.core.Popup.prototype.onFocusEvent;
                var that = this;
                sap.ui.core.Popup.prototype.onFocusEvent = function (oBrowserEvent) {
                    if (that._bActive === false && (!that._oDialog || !that._oDialog.isOpen())) {
                        return fnOldEvent.apply(this, arguments);
                    }

                    var aControl = $(oBrowserEvent.target).control();
                    for (var i = 0; i < aControl.length; i++) {
                        var oElement = aControl[i];
                        while (oElement) {
                            if (oElement.getId() === that._oDialog.getId() || oElement.getId().indexOf("testDialog") !== -1) {
                                return fnOldEvent.apply(this, arguments);
                            }
                            oElement = oElement.getParent();
                        }
                    }
                    return;
                };

                $('*').on("mouseup mousedown mousemove mouseout", function (e) {
                    if (this._bActive === false) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                }.bind(this));


                $('*').click(function (event) {
                    if (this._bActive === false) {
                        return;
                    }

                    this._bActive = false;
                    this.onClick(event.target);
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                }.bind(this));
            }.bind(this));

            MessageToast.show("Testing Framework Initialized...");
        };

        TestHandler.prototype._updateAttributeTypes = function (oCtx) {
            var oAttribute = this._oModel.getProperty(oCtx.getPath());
            var oAttributeSettings = this._attributeTypes[oAttribute.attributeType];
            oAttribute.criteriaTypes = oAttributeSettings.criteriaTypes;

            //check if the current criteraType value is valid - if yes, keep it, otherwise reset it..
            if (oAttribute.criteriaTypes.filter(function (e) { return e.criteriaKey === oAttribute.criteriaType; }).length === 0) {
                oAttribute.criteriaType = oAttribute.criteriaTypes[0].criteriaKey;
            }

            this._oModel.setProperty(oCtx.getPath(), oAttribute);

            this._updateCriteriaType(oCtx);
        };

        TestHandler.prototype._updateCriteriaType = function (oCtx) {
            var oAttribute = this._oModel.getProperty(oCtx.getPath());
            var oItem = this._attributeTypes[oAttribute.attributeType].getItem(this._oModel.getProperty("/element/item"));
            var aSubCriteriaSettings = this._criteriaTypes[oAttribute.criteriaType].criteriaSpec(oItem);

            oAttribute.subCriteriaTypes = aSubCriteriaSettings;
            if (oAttribute.subCriteriaTypes.length > 0) {
                if (oAttribute.subCriteriaTypes.filter(function (e) { return e.subCriteriaType === oAttribute.subCriteriaType; }).length === 0) {
                    oAttribute.subCriteriaType = oAttribute.subCriteriaTypes[0].subCriteriaType;
                }
            } else {
                oAttribute.subCriteriaType = "";
            }

            this._oModel.setProperty(oCtx.getPath(), oAttribute);

            this._updateSubCriteriaType(oCtx);
        };

        TestHandler.prototype._updateSubCriteriaType = function (oCtx) {
            var oAttribute = this._oModel.getProperty(oCtx.getPath());
            var oItem = this._attributeTypes[oAttribute.attributeType].getItem(this._oModel.getProperty("/element/item"));

            //we need to initialize the default value, based on the subCriteriaType
            var aCriteriaSettings = this._criteriaTypes[oAttribute.criteriaType].criteriaSpec(oItem);
            for (var i = 0; i < aCriteriaSettings.length; i++) {
                if (aCriteriaSettings[i].subCriteriaType === oAttribute.subCriteriaType) {
                    oAttribute.criteriaValue = aCriteriaSettings[i].value(oItem);
                    break;
                }
            }

            this._oModel.setProperty(oCtx.getPath(), oAttribute);
        };

        TestHandler.prototype._getParentWithDom = function (oItem, iCounter, bViewOnly) {
            oItem = oItem.control.getParent();
            while (oItem && oItem.getParent) {
                if (oItem.getDomRef && oItem.getDomRef()) {
                    iCounter = iCounter - 1;
                    if (iCounter <= 0) {
                        if (bViewOnly === true && !oItem.getViewData) {
                            oItem = oItem.getParent();
                            continue;
                        }
                        return this._getElementInformation(oItem, oItem.getDomRef());
                    }
                }
                oItem = oItem.getParent();
            }
            return null;
        };

        TestHandler.prototype._lengthStatusFormatter = function (iLength) {
            return "Success";
        };

        TestHandler.prototype._getLabelForItem = function (oItem) {
            if (oItem.label) {
                return oItem.label;
            }
            var oLabel = _getLabelForItem(oItem.control);
            if (!oLabel) {
                return null;
            }
            return this._getElementInformation(oLabel, oLabel.getDomRef());
        };

        TestHandler.prototype._getCriteriaTypes = function () {
            this._criteriaTypes = {
                "ID": {
                    criteriaKey: "ID",
                    criteriaText: "Identifier",
                    criteriaSpec: function () {
                        return [{
                            subCriteriaType: "ID",
                            subCriteriaText: "Global-Id",
                            value: function (oItem) {
                                return oItem.identifier.ui5Id;
                            }.bind(this),
                            code: function (sValue) {
                                return { identifier: { ui5Id: sValue } }
                            },
                            assert: function (sValue) {
                                return "identifier.ui5Id"
                            }
                        }, {
                            subCriteriaType: "LID",
                            subCriteriaText: "Local-Id",
                            value: function (oItem) {
                                return oItem.identifier.ui5LocalId;
                            }.bind(this),
                            code: function (sValue) {
                                return { identifier: { ui5LocalId: sValue } }
                            },
                            assert: function (sValue) {
                                return "identifier.ui5LocalId"
                            }
                        }];
                    }.bind(this)
                },
                "MTA": {
                    criteriaKey: "MTA",
                    criteriaText: "Metadata",
                    criteriaSpec: function () {
                        return [{
                            subCriteriaType: "ELM",
                            subCriteriaText: "Element-Name",
                            value: function (oItem) {
                                return oItem.metadata.elementName;
                            }.bind(this),
                            code: function (sValue) {
                                return { metadata: { elementName: sValue } }
                            },
                            assert: function () {
                                return "metadata.elementName"
                            }
                        }, {
                            subCriteriaType: "CMP",
                            subCriteriaText: "Component-Name",
                            value: function (oItem) {
                                return oItem.metadata.componentName;
                            }.bind(this),
                            code: function (sValue) {
                                return { metadata: { componentName: sValue } }
                            },
                            assert: function () {
                                return "metadata.componentName"
                            }
                        }];
                    }.bind(this)
                },
                "AGG": {
                    criteriaKey: "AGG",
                    criteriaText: "Aggregation",
                    criteriaSpec: function (oItem) {
                        var aReturn = [];
                        for (var sAggregationName in oItem.aggregation) {
                            var oAggregation = oItem.aggregation[sAggregationName];
                            aReturn.push({
                                subCriteriaType: oAggregation.name + "/" + "length",
                                subCriteriaText: oAggregation.name + "/" + "length",
                                code: function (sAggregation, sValue) {
                                    var oReturn = { aggregation: {} };
                                    oReturn.aggregation[sAggregation] = { length: sValue };
                                    return oReturn;
                                }.bind(this, oAggregation.name),
                                value: function (sAggregation, oItem) {
                                    return oItem.aggregation[sAggregation].length;
                                }.bind(this, oAggregation.name),
                                assert: function (sAggregation) {
                                    return "aggregation." + sAggregation + "." + "length";
                                }.bind(this, oAggregation.name),
                            });
                        }
                        return aReturn;
                    }.bind(this)
                },
                "BDG": {
                    criteriaKey: "BDG",
                    criteriaText: "Binding-Context",
                    criteriaSpec: function (oItem) {
                        var aReturn = [];
                        for (var sModel in oItem.context) {
                            for (var sProperty in oItem.context[sModel]) {
                                if (sProperty === "__metadata") {
                                    continue;
                                }
                                aReturn.push({
                                    subCriteriaType: sModel + "/" + sProperty,
                                    subCriteriaText: sModel + "/" + sProperty,
                                    code: function (sModel, sProperty, sValue) {
                                        var oReturn = { context: {} };
                                        oReturn.context[sModel] = {};
                                        oReturn.context[sModel][sProperty] = sValue;
                                        return oReturn;
                                    }.bind(this, sModel, sProperty),
                                    value: function (sModel, sProperty, oItem) {
                                        return oItem.context[sModel][sProperty];
                                    }.bind(this, sModel, sProperty),
                                    assert: function (sModel, sProperty) {
                                        return "context." + sModel + "." + sProperty;
                                    }.bind(this, sModel, sProperty),
                                });
                            }
                        }
                        return aReturn;
                    }.bind(this)
                },
                "MODL": {
                    criteriaKey: "MODL",
                    criteriaText: "Model-Keys (Specific)",
                    criteriaSpec: function (oItemCtx) {
                        var oItem = oItemCtx.control;
                        var oMetadata = oItem.getMetadata();
                        var aReturn = [];
                        while (oMetadata) {
                            if (!oMetadata._sClassName) {
                                break;
                            }
                            var oType = _oElementModelValues[oMetadata._sClassName];
                            if (oType) {
                                for (var sModel in oType) {
                                    if (!oItem.getModel(sModel === "undefined" ? undefined : sModel)) {
                                        continue;
                                    }

                                    for (var sProperty in oType[sModel]) {
                                        var sPropertyValue = oItem.getModel(sModel === "undefined" ? undefined : sModel).getProperty(sProperty);
                                        if (typeof sPropertyValue === "undefined") {
                                            continue;
                                        }

                                        aReturn.push({
                                            subCriteriaType: sModel + "/" + sProperty,
                                            subCriteriaText: oType[sModel][sProperty],
                                            code: function (sModel, sProperty, sValue) {
                                                var oReturn = { model: {} };
                                                oReturn.model[sModel] = {};
                                                oReturn.model[sModel][sProperty] = sValue;
                                                return oReturn;
                                            }.bind(this, sModel, sProperty),
                                            value: function (sModel, sProperty, oItem) {
                                                if (!oItem.model[sModel]) {
                                                    return "";
                                                }
                                                return oItem.model[sModel][sProperty];
                                            }.bind(this, sModel, sProperty),
                                            assert: function (sModel, sProperty) {
                                                return "model." + sModel + "." + sProperty;
                                            }.bind(this, sModel, sProperty)
                                        });
                                    }
                                }
                            }
                            oMetadata = oMetadata.getParent();
                        }
                        return aReturn;
                    }.bind(this)
                },
                "ATTR": {
                    criteriaKey: "ATTR",
                    criteriaText: "Attributes",
                    criteriaSpec: function (oItem) {
                        var aReturn = [];
                        for (var sProperty in oItem.property) {
                            aReturn.push({
                                subCriteriaType: sProperty,
                                subCriteriaText: sProperty,
                                code: function (sProperty, sValue) {
                                    var oReturn = { property: {} };
                                    oReturn.property[sProperty] = sValue;
                                    return oReturn;
                                }.bind(this, sProperty),
                                value: function (subCriteriaType, oItem) {
                                    return oItem.property[subCriteriaType];
                                }.bind(this, sProperty),
                                assert: function (subCriteriaType) {
                                    return "property." + subCriteriaType;
                                }.bind(this, sProperty)
                            });
                        }
                        return aReturn;
                    }
                }
            };


            this._attributeTypes = {
                "OWN": {
                    getItem: function (oItem) { return oItem; },
                    getScope: function (oScope) { return oScope; },
                    getAssertScope: function () { return "" },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["MODL"], this._criteriaTypes["AGG"]]
                },
                "VIW": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 1, true); }.bind(this),
                    getScope: function (oScope) { oScope.view = oScope.view ? oScope.view : {}; return oScope.view; },
                    getAssertScope: function () { return "view." },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
                },
                "PRT": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 1); }.bind(this),
                    getAssertScope: function () { return "parent." },
                    getScope: function (oScope) { oScope.parent = oScope.parent ? oScope.parent : {}; return oScope.parent; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"]]
                },
                "PRT2": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 2); }.bind(this),
                    getAssertScope: function () { return "parentL2." },
                    getScope: function (oScope) { oScope.parentL2 = oScope.parentL2 ? oScope.parentL2 : {}; return oScope.parentL2; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"]]
                },
                "PRT3": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 3); }.bind(this),
                    getAssertScope: function () { return "parentL3." },
                    getScope: function (oScope) { oScope.parentL3 = oScope.parentL3 ? oScope.parentL3 : {}; return oScope.parentL3; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"]]
                },
                "PRT4": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 4); }.bind(this),
                    getAssertScope: function () { return "parentL4." },
                    getScope: function (oScope) { oScope.parentL4 = oScope.parentL4 ? oScope.parentL4 : {}; return oScope.parentL4; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"]]
                },
                "PLBL": {
                    getItem: function (oItem) { return this._getLabelForItem(oItem); }.bind(this),
                    getAssertScope: function () { return "label." },
                    getScope: function (oScope) { oScope.label = oScope.label ? oScope.label : {}; return oScope.label; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"]]
                }
            };

            this._defineElementBasedActions();
        };

        TestHandler.prototype._defineElementBasedActions = function () {
            this._oElementMix = {
                "sap.ui.core.Element": {
                    defaultAction: "PRS",
                    actions: {
                        "PRS": [{ text: "Root", domChildWith: "", order: 99 }],
                        "SEL": [{ text: "Root", domChildWith: "", order: 99 }],
                        "TYP": [{ text: "Root", domChildWith: "", order: 99 }]
                    }
                },
                "sap.m.ComboBoxBase": {
                    defaultAction: "PRS",
                    actions: {
                        "PRS": [{ text: "Arrow (Open List)", domChildWith: "-arrow", preferred: true, order: 1 }]
                    }
                },
                "sap.m.GenericTile": {
                    defaultAction: "PRS",
                    defaultAttributes: [{ attributeType: "OWN", criteriaType: "MODL", subCriteriaType: "undefined//config/navigation_semantic_action" },
                    { attributeType: "OWN", criteriaType: "MODL", subCriteriaType: "undefined//config/navigation_semantic_object" }]
                },
                "sap.m.MultiComboBox": {
                    defaultAction: "PRS",
                    actions: {
                        "PRS": [{ text: "Arrow (Open List)", domChildWith: "-arrow", preferred: true, order: 1 }]
                    }
                },
                "sap.m.Select": {
                    defaultAction: "PRS",
                    actions: {
                        "PRS": [{ text: "Arrow (Open List)", domChildWith: "-arrow", preferred: true, order: 1 }]
                    }
                },
                "sap.m.InputBase": {
                    defaultAction: "TYP",
                    actions: {
                        "TYP": [{ text: "In Input-Field", domChildWith: "-inner", preferred: true, order: 1 }]
                    }
                }
            };
        };

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        ////BEGIN STACK UI5SELECTOR
        ////CODE BELOW IS NOT ALLOWED TO ACCESS ANY THIS METHOD
        ////The code is 1:1 copied to the corresponding UI5Selector Plugin
        ////Copying is not really nice, due to different languages (!) (typescript vs js) in the exceution phase
        ////all other approaches would just take unreasonabliy more time and effort
        ///METHOD: SEARCH
        //////////////////////////////////////////////////////////////////////////////////////////////////

        TestHandler.prototype._findItem = function (id) {
            var aItem = null; //jQuery Object Array
            if (typeof sap === "undefined" || typeof sap.ui === "undefined" || typeof sap.ui.getCore === "undefined" || !sap.ui.getCore() || !sap.ui.getCore().isInitialized()) {
                return [];
            }

            if (typeof id !== "string") {
                if (JSON.stringify(id) == JSON.stringify({})) {
                    return [];
                }

                var oCoreObject = null;
                var fakePlugin = {
                    startPlugin: function (core) {
                        oCoreObject = core;
                        return core;
                    }
                };
                sap.ui.getCore().registerPlugin(fakePlugin);
                sap.ui.getCore().unregisterPlugin(fakePlugin);
                var aElements = oCoreObject.mElements;

                //search for identifier of every single object..
                var bFound = false;
                var sSelectorStringForJQuery = "";
                for (var sElement in aElements) {
                    var oItem = aElements[sElement];
                    bFound = true;
                    bFound = _checkItem(oItem, id);
                    if (bFound === false) {
                        continue;
                    }
                    if (id.label) {
                        bFound = bFound && _checkItem(_getLabelForItem(oItem), id.label);
                        if (bFound === false) {
                            continue;
                        }
                    }

                    //check parent levels..
                    if (id.parent) {
                        bFound = bFound && _checkItem(_getParentWithDom(oItem, 1), id.parent);
                        if (bFound === false) {
                            continue;
                        }
                    }
                    if (id.parentL2) {
                        bFound = bFound && _checkItem(_getParentWithDom(oItem, 2), id.parentL2);
                        if (bFound === false) {
                            continue;
                        }
                    }
                    if (id.parentL3) {
                        bFound = bFound && _checkItem(_getParentWithDom(oItem, 3), id.parentL3);
                        if (bFound === false) {
                            continue;
                        }
                    }
                    if (id.parentL4) {
                        bFound = bFound && _checkItem(_getParentWithDom(oItem, 4), id.parentL4);
                        if (bFound === false) {
                            continue;
                        }
                    }

                    if (bFound === false) {
                        continue;
                    }

                    if (!oItem.getDomRef()) {
                        continue;
                    }

                    var sIdFound = oItem.getDomRef().id;
                    if (sSelectorStringForJQuery.length) {
                        sSelectorStringForJQuery = sSelectorStringForJQuery + ",";
                    }
                    sSelectorStringForJQuery += "#" + sIdFound;
                }
                if (sSelectorStringForJQuery.length) {
                    aItem = $(sSelectorStringForJQuery);
                } else {
                    aItem = [];
                }
            } else {
                //our search for an ID is using "ends with", as we are using local IDs only (ignore component)
                //this is not really perfect for multi-component architecture (here the user has to add the component manually)
                //but sufficient for most approaches. Reason for removign component:
                //esnure testability both in standalone and launchpage enviroments
                if (id.charAt(0) === '#') {
                    id = id.substr(1); //remove the trailing "#" if any
                }
                var searchId = '*[id$=' + id + ']';
                aItem = $(searchId);
            }
            if (!aItem || !aItem.length || !aItem.control() || !aItem.control().length) {
                return [];
            } //no ui5 contol in case

            //---postprocessing - return all items..
            return aItem.control();
        };

        TestHandler.prototype._getElementInformation = function (oItem, oDomNode, bFull) {
            var oReturn = {
                property: {},
                aggregation: {},
                association: {},
                context: {},
                metadata: {},
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
                parent: {},
                parentL2: {},
                parentL3: {},
                parentL4: {},
                label: {},
                parents: [],
                control: null,
                dom: null
            };
            bFull = typeof bFull === "undefined" ? true : false;

            if (oTestGlobalBuffer["fnGetElementInfo"][bFull][oItem.getId()]) {
                return oTestGlobalBuffer["fnGetElementInfo"][bFull][oItem.getId()];
            }

            if (!oItem) {
                return oReturn;
            }

            //local methods on purpose (even if duplicated) (see above)
            oReturn = $.extend(true, oReturn, fnGetElementInformation(oItem, oDomNode, bFull));
            if (bFull === false) {
                oTestGlobalBuffer["fnGetElementInfo"][bFull][oItem.getId()] = oReturn;
                return oReturn;
            }
            //get all parents, and attach the same information in the same structure
            oReturn.parent = fnGetElementInformation(_getParentWithDom(oItem, 1));
            oReturn.parentL2 = fnGetElementInformation(_getParentWithDom(oItem, 2));
            oReturn.parentL3 = fnGetElementInformation(_getParentWithDom(oItem, 3));
            oReturn.parentL4 = fnGetElementInformation(_getParentWithDom(oItem, 4));
            oReturn.label = fnGetElementInformation(_getLabelForItem(oItem));

            oTestGlobalBuffer["fnGetElementInfo"][bFull][oItem.getId()] = oReturn;

            return oReturn;
        };

        TestHandlerSingleton = new TestHandler();
        // Listens for event from injected script

        jQuery.sap.registerModulePath("test.codeeditor", "https://sapui5.hana.ondemand.com/resources/sap/ui/codeeditor");

        return TestHandlerSingleton;
    });

    //on puprose the stuff below is local, to make the copy between the different APIs simpler (still copy & paste is shitty ofc)
    var _oElementModelValues = {
        "sap.m.GenericTile": {
            "undefined": {
                "/config/navigation_semantic_action": "Navigation-Semantic Action",
                "/config/navigation_semantic_object": "Navigation-Semantic Object",
                "/config/navigation_semantic_parameters": "Navigation-Semantic Paramters",
                "/config/navigation_target_url": "Navigation-Semantic URL"
            }
        }
    };

    //on purpose implemented as local methods
    //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)
    var _getParentWithDom = function (oItem, iCounter) {
        oItem = oItem.getParent();
        while (oItem && oItem.getParent) {
            if (oItem.getDomRef && oItem.getDomRef()) {
                iCounter = iCounter - 1;
                if (iCounter <= 0) {
                    return oItem;
                }
            }
            oItem = oItem.getParent();
        }
        return null;
    };
    var _getUi5LocalId = function (oItem) {
        var sId = oItem.getId();
        if (sId.lastIndexOf("-") !== -1) {
            return sId.substr(sId.lastIndexOf("-") + 1);
        }
        return sId;
    };

    var _getAllLabels = function () {
        if( oTestGlobalBuffer.label ) {
            return oTestGlobalBuffer.label;
        }
        oTestGlobalBuffer.label = {};
        var oCoreObject = null;
        var fakePlugin = {
            startPlugin: function (core) {
                oCoreObject = core;
                return core;
            }
        };
        sap.ui.getCore().registerPlugin(fakePlugin);
        sap.ui.getCore().unregisterPlugin(fakePlugin);
        for (var sCoreObject in oCoreObject.mElements) {
            var oObject = oCoreObject.mElements[sCoreObject];
            if (oObject.getLabelFor ) {
                oTestGlobalBuffer.label[oObject.getLabelFor()] = oObject;
            }
        }
        return oTestGlobalBuffer.label;
    };

    var _getLabelForItem = function (oItem) {
        var aItems = _getAllLabels();
        return (aItems && aItems[oItem.getId()]) ? aItems[oItem.getId()] : null;
    };


    var _getUi5Id = function (oItem) {
        //remove all component information from the control
        var oParent = oItem;
        var sCurrentComponent = "";
        while (oParent && oParent.getParent) {
            if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        if (!sCurrentComponent.length) {
            return oItem.getId();
        }

        var sId = oItem.getId();
        sCurrentComponent = sCurrentComponent + "---";
        if (sId.lastIndexOf(sCurrentComponent) !== -1) {
            return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
        }
        return sId;
    };

    var _checkItem = function (oItem, id) {
        var bFound = true;
        if (!oItem) { //e.g. parent level is not existing at all..
            return false;
        }
        if (id.metadata) {
            if (id.metadata.elementName && id.metadata.elementName !== oItem.getMetadata().getElementName()) {
                return false;
            }
            if (id.metadata.componentName && id.metadata.componentName !== _getOwnerComponent(oItem)) {
                return false;
            }
        }
        if (id.domChildWith && id.domChildWith.length > 0) {
            var oDomRef = oItem.getDomRef();
            if (!oDomRef) {
                return false;
            }

            if ($("#" + oDomRef.id + id.domChildWith).length === 0) {
                return false;
            }
        }

        if (id.model) {
            for (var sModel in id.model) {
                if (!oItem.getModel(sModel)) {
                    return false;
                }
                for (var sModelProp in id.model[sModel]) {
                    if (oItem.getModel(sModel).getProperty(sModelProp) !== id.model[sModel][sModelProp]) {
                        return false;
                    }
                }
            }
        }

        if (id.identifier) {
            if (id.identifier.ui5Id && id.identifier.ui5Id !== _getUi5Id(oItem)) {
                return false;
            }
            if (id.identifier.ui5LocalId && id.identifier.ui5LocalId !== _getUi5LocalId(oItem)) {
                return false;
            }
        }
        if (id.aggregation) {
            for (var sAggregationName in id.aggregation) {
                var oAggr = id.aggregation[sAggregationName];
                if (!oAggr.name) {
                    continue; //no sense to search without aggregation name..
                }
                if (typeof oAggr.length !== "undefined") {
                    if (oItem.getAggregation(sAggregationName).length !== oAggr.length) {
                        bFound = false;
                    }
                }
                if (bFound === false) {
                    return false;
                }
            }
        }
        if (id.context) {
            for (var sModel in id.context) {
                var oCtx = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oCtx) {
                    return false;
                }
                var oObjectCompare = oCtx.getObject();
                if (!oObjectCompare) {
                    return false;
                }
                var oObject = id.context[sModel];
                for (var sAttr in oObject) {
                    if (oObject[sAttr] !== oObjectCompare[sAttr]) {
                        return false;
                    }
                }
            }
        }
        if (id.property) {
            for (var sProperty in id.property) {
                if (!oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]) {
                    //property is not even available in that item.. just skip it..
                    bFound = false;
                    break;
                }
                var sPropertyValueItem = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
                var sPropertyValueSearch = id.property[sProperty];
                if (sPropertyValueItem !== sPropertyValueSearch) {
                    bFound = false;
                    break;
                }
            }
            if (bFound === false) {
                return false;
            }
        }
        return true;
    };

    var fnGetElementInformation = function (oItem, oDomNode, bFull) {
        var oReturn = {
            property: {},
            aggregation: [],
            association: {},
            context: {},
            model: {},
            metadata: {},
            identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
            control: null,
            dom: null
        };
        bFull = typeof bFull === "undefined" ? true : bFull;

        if (!oItem) {
            return oReturn;
        }
        if (oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()]) {
            return oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()];
        }
        if (!oDomNode) {
            oDomNode = oItem.getDomRef();
        }

        oReturn.control = oItem;
        oReturn.dom = oDomNode;
        oReturn.identifier.ui5Id = _getUi5Id(oItem);
        oReturn.identifier.ui5LocalId = _getUi5LocalId(oItem);

        //does the ui5Id contain a "-" with a following number? it is most likely a dependn control (e.g. based from aggregation or similar)
        if (RegExp("([A-Z,a-z,0-9])-([0-9])").test(oReturn.identifier.ui5Id) === true) {
            oReturn.identifier.idCloned = true;
        }
        //does the ui5id contain a "__"? it is most likely a generated id which should NOT BE USESD!!
        //check might be enhanced, as it seems to be that all controls are adding "__[CONTORLNAME] as dynamic view..
        if (oReturn.identifier.ui5Id.indexOf("__") !== -1) {
            oReturn.identifier.idGenerated = true;
        }

        if (oDomNode) {
            oReturn.identifier.domId = oDomNode.id;
        }
        oReturn.identifier.ui5AbsoluteId = oItem.getId();

        //get metadata..
        oReturn.metadata = {
            elementName: oItem.getMetadata().getElementName(),
            componentName: _getOwnerComponent(oItem)
        };

        if (bFull === false) {
            oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
            return oReturn;
        }

        //return all simple properties
        for (var sProperty in oItem.mProperties) {
            oReturn.property[sProperty] = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
        }

        //return ids for all associations - for those associations additionally push the binding context object
        //having the binding context object, can be extremly helpful, to directly get e.g. the selected item key/text (or similar)
        for (var sAssociation in oItem.mAssociations) {
            oReturn.association[sAssociation] = {
                id: oItem.mAssociations[sAssociation],
                items: []
            };
            for (var k = 0; k < oItem.mAssociations.length; k++) {
                oReturn.association[sAssociation].items.push({
                    id: oItem.mAssociations[sAssociation][k],
                    context: fnGetContexts(sap.ui.getCore().byId(oItem.mAssociations[sAssociation][k]))
                });
            }
        }

        //return all binding contexts
        oReturn.context = fnGetContexts(oItem);

        //get model information..
        var oMetadata = oItem.getMetadata();
        oReturn.model = {};
        while (oMetadata) {
            if (!oMetadata._sClassName) {
                break;
            }
            var oType = _oElementModelValues[oMetadata._sClassName];
            if (oType) {
                for (var sModel in oType) {
                    oReturn.model[sModel] = {};
                    var oCurrentModel = oItem.getModel(sModel);
                    if (!oCurrentModel) {
                        continue;
                    }
                    for (var sProperty in oType[sModel]) {
                        oReturn.model[sModel][sProperty] = oCurrentModel.getProperty(sProperty);
                    }
                }
            }
            oMetadata = oMetadata.getParent();
        }

        //return length of all aggregations
        var aMetadata = oItem.getMetadata().getAllAggregations();
        for (var sAggregation in aMetadata) {
            if (aMetadata[sAggregation].multiple === false) {
                continue;
            }
            var aAggregation = oItem["get" + sAggregation.charAt(0).toUpperCase() + sAggregation.substr(1)]();
            var oAggregationInfo = {
                rows: [],
                filled: false,
                name: sAggregation,
                length: 0
            };
            if (typeof aAggregation !== "undefined" && aAggregation !== null) {
                oAggregationInfo.filled = true;
                oAggregationInfo.length = aAggregation.length;
            }

            //for every single line, get the binding context, and the row id, which can later on be analyzed again..
            for (var i = 0; i < aAggregation.length; i++) {
                oAggregationInfo.rows.push({
                    context: fnGetContexts(aAggregation[i]),
                    ui5Id: _getUi5Id(aAggregation[i]),
                    ui5AbsoluteId: aAggregation[i].getId(),
                    control: aAggregation[i]
                });
            }
            oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
        }

        oTestGlobalBuffer["fnGetElement"][bFull][oItem.getId()] = oReturn;
        return oReturn;
    };


    //missing: get elements with same parent, to get elements "right next", "left" and on same level
    var fnGetContexts = function (oItem) {
        var oReturn = {};

        if (!oItem) {
            return oReturn;
        }

        var oModel = {};
        oModel = $.extend(true, oModel, oItem.oModels);
        oModel = $.extend(true, oModel, oItem.oPropagatedProperties.oModels);

        //second, get all binding contexts
        for (var sModel in oModel) {
            var oBindingContext = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
            if (!oBindingContext) {
                continue;
            }

            oReturn[sModel] = oBindingContext.getObject();
        }
        return oReturn;
    };

    var _getOwnerComponent = function (oParent) {
        var sCurrentComponent = "";
        while (oParent && oParent.getParent) {
            if (oParent.getController && oParent.getController() && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        return sCurrentComponent;
    };
}