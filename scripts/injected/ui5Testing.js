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
        'sap/m/MessagePopover',
        'sap/m/MessageItem',
        "sap/m/MessageBox"
    ], function (Object, JSONModel, MessageToast, ValueState, MessagePopover, MessageItem, MessageBox) {
        "use strict";

        var TestHandler = Object.extend("com.tru.TestHandler", {
            _oDialog: null,
            _oModel: new JSONModel({
                element: {
                    property: {}, //properties
                    item: {}, //current item itself,
                    attributeFilter: [], //table entries of selectors
                    assertFilter: [], //table entries of asserts,
                    messages: []
                },
                elements: [],
                elementLength: 0,
                elementDefault: {
                    property: {
                        assKeyMatchingCount: 1,
                        elementState: "Success",
                        assKey: "EXS",
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
                    testName: document.title,
                    testCategory: document.title,
                    testUrl: window.location.href
                },
                dynamic: {
                    attrType: []
                },
                codeLanguages: [
                    {
                        key: "TCF",
                        text: "Testcafe"
                    },
                    {
                        key: "NGT",
                        text: "Nightwatch"
                    },
                    {
                        key: "PTC",
                        text: "Protractor"
                    },
                    {
                        key: "OPA",
                        text: "OPA5"
                    }
                ],
                statics: {
                    type: [
                        { key: "ACT", text: "Action" },
                        { key: "ASS", text: "Assert" },
                    ],
                    action: [
                        { key: "PRS", text: "Press" },
                        { key: "TYP", text: "Type Text" }
                    ],
                    assertType: [
                        { key: "ATTR", text: "Attributes" },
                        { key: "EXS", text: "Exists" },
                        { key: "MTC", text: "Matching Count" },
                    ],
                    selType: [
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
                        { key: "MCMB", text: "Item-Data" },
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
                selectMode: true, //are we within selection or within code check
                completeCode: "",
                completeCodeSaved: "",
                ratingOfAttributes: 3,
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
                this._initMessagePopover();
            }
        });

        TestHandler.prototype._initMessagePopover = function () {
            var oMessageTemplate = new MessageItem({
                type: '{viewModel>type}',
                title: '{viewModel>title}',
                description: '{viewModel>description}',
                subtitle: '{viewModel>subtitle}'
            });

            this._oMessagePopover = new MessagePopover({
                items: {
                    path: 'viewModel>/element/messages',
                    template: oMessageTemplate
                }
            });

            this._oMessagePopoverAssert = new MessagePopover({
                items: {
                    path: 'viewModel>assertMessages',
                    template: oMessageTemplate
                }
            });

            this._oMessagePopover.setModel(this._oModel, "viewModel");
            this._oMessagePopoverAssert.setModel(this._oModel, "viewModel");

            var oTemplateCtx = new sap.m.ColumnListItem({
                type: "Active",
                cells: [
                    new sap.m.ObjectIdentifier({ title: '{viewModel>typeTxt}' }),
                    new sap.m.ObjectIdentifier({ title: '{viewModel>attribute}' }),
                    new sap.m.Text({ text: '{viewModel>valueToString}' }),
                    new sap.m.ObjectNumber({
                        visible: '{viewModel>/element/itemCloned}',
                        number: '{viewModel>importance}',
                        state: '{viewModel>numberState}',
                        unit: '%'
                    }),
                ]
            });
            this._oTableContext = new sap.m.Table({
                mode: "MultiSelect",
                itemPress: function (oEvent) {
                    oEvent.getSource().setSelected(oEvent.getSource().getSelected() === false);
                },
                columns: [
                    new sap.m.Column({ header: new sap.m.Text({ text: "Type" }) }),
                    new sap.m.Column({ header: new sap.m.Text({ text: "Name" }) }),
                    new sap.m.Column({ header: new sap.m.Text({ text: "Value" }) }),
                    new sap.m.Column({ visible: '{viewModel>/element/itemCloned}', header: new sap.m.Text({ text: "Expected Quality" }) }),
                ],
                items: {
                    path: 'viewModel>/element/possibleContext',
                    template: oTemplateCtx
                }
            });

            this._oSelectDialog = new sap.m.Dialog({
                contentHeight: "75%",
                contentWidth: "40%",
                id: "tstDialog",
                title: "Please specifiy a unique combination",
                content: new sap.m.VBox({
                    items: [
                        new sap.m.SearchField({
                            liveChange: function (oEvent) {
                                var sSearch = oEvent.getParameter("newValue");
                                if (!sSearch || !sSearch.length) {
                                    this._oTableContext.getBinding("items").filter([]);
                                } else {
                                    this._oTableContext.getBinding("items").filter([
                                        new sap.ui.model.Filter({
                                            and: false,
                                            filters: [
                                                new sap.ui.model.Filter({
                                                    path: "typeTxt",
                                                    operator: sap.ui.model.FilterOperator.Contains,
                                                    value1: sSearch
                                                }),
                                                new sap.ui.model.Filter({
                                                    path: "attribute",
                                                    operator: sap.ui.model.FilterOperator.Contains,
                                                    value1: sSearch
                                                }),
                                                new sap.ui.model.Filter({
                                                    path: "valueToString",
                                                    operator: sap.ui.model.FilterOperator.Contains,
                                                    value1: sSearch
                                                })]
                                        })
                                    ]);
                                }
                            }.bind(this)
                        }),
                        this._oTableContext
                    ]
                }),
                beginButton: new sap.m.Button({
                    text: 'Close',
                    press: function () {
                        this._oSelectDialog.close();
                    }.bind(this)
                }),
                endButton: new sap.m.Button({
                    text: 'Save',
                    press: function () {
                        var aItems = this._oTableContext.getSelectedItems();
                        if (aItems && aItems.length) {
                            for (var j = 0; j < aItems.length; j++) {
                                var oBndgCtxObj = aItems[j].getBindingContext("viewModel").getObject();
                                this._add("/element/attributeFilter", { attributeType: "OWN", criteriaType: oBndgCtxObj.type, subCriteriaType: oBndgCtxObj.bdgPath });
                            }
                            this._updatePreview();
                        }
                        this._oSelectDialog.close();
                    }.bind(this)
                })
            });

            this._oSelectDialog.addStyleClass("sapUiSizeCompact");
        };

        TestHandler.prototype._getControlFromDom = function (oDomNode) {
            var oControls = $(oDomNode).control();
            if (!oControls || !oControls.length) {
                return null;
            }
            return oControls[0];
        };

        TestHandler.prototype._onClose = function () {
            this._oDialog.close();
            this._start();
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

        TestHandler.prototype._onSaveAndFinish = function () {
            this._save(function () {
                this.showCode();
            }.bind(this));
        };
        
        TestHandler.prototype._onCloseAndRestart = function() {
            this._oDialog.close();
            this._oModel.setProperty("/elements", []);
            this._start();
        };

        TestHandler.prototype._onSave = function () {
            this._save(function() {
                if (this._bStarted === true) {
                    this._start();
                }
            }.bind(this));
        };

        TestHandler.prototype._save = function(fnCallback) {
            this._checkAndDisplay(function () {
                this._oDialog.close();

                var aElements = this._oModel.getProperty("/elements");
                var oCurrentElement = this._oModel.getProperty("/element");
                aElements.push(this._adjustBeforeSaving(oCurrentElement));
                this._oModel.setProperty("/elements", aElements);

                this._oModel.setProperty("/codes", this._testCafeGetCode(this._oModel.getProperty("/elements")));
                this._oModel.setProperty("/elementLength", aElements.length);
                this._executeAction(this._oModel.getProperty("/element"));
                fnCallback();
            }.bind(this));
        };

        TestHandler.prototype._getFinalDomNode = function (oElement) {
            var sExtension = this._oModel.getProperty("/element/property/domChildWith");
            if (!sExtension.length) {
                return $(oElement.control.getDomRef());
            }

            return $("*[id$='" + (oElement.control.getDomRef().id + sExtension) + "']");
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

                var event = new KeyboardEvent('keydown', {
                    view: window,
                    keyCode: 13,
                    key: "Enter",
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event;
                oDom.get(0).dispatchEvent(event);
                /*
                var event = new KeyboardEvent('input', {
                    view: window,
                    data: '',
                    bubbles: true,
                    cancelable: true
                });
                event.originalEvent = event;
                oDom.get(0).dispatchEvent(event);*/
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
                        text: ($(aSubObjects[i]).is("input") || $(aSubObjects[i]).is("textarea")) ? "In Input-Field" : sIdChild,
                        domChildWith: sIdChild,
                        order: 9999
                    });
                }
            }
            aRows.sort((a, b) => (a.order > b.order) ? 1 : ((b.order < a.order) ? -1 : 0));

            //check if the current value is fine..
            if (aRows.filter(function (e) { return e.domChildWith === sDomChildWith; }).length === 0) {
                sDomChildWith = aRows.length >= 0 ? aRows[0].domChildWith : "";
                this._oModel.setProperty("/element/property/domChildWith", sDomChildWith);
            }
            //we now have a valid value - check if there is any preferred value for the currently selected 
            this._oModel.setProperty("/element/subActionTypes", aRows);
        };

        //returns { ok: false/true + message }
        TestHandler.prototype._check = function (fnCallback) {
            var oReturn = this._getAttributeRating();

            return {
                rating: oReturn.rating,
                message: oReturn.messages.length ? oReturn.messages[0].description : "",
                messages: oReturn.messages
            };
        };

        TestHandler.prototype._checkElementNumber = function () {
            var oCheck = this._check();
            if (oCheck.rating === 5) {
                this._oModel.setProperty("/element/property/elementState", "Success");
            } else if (oCheck.rating >= 2) {
                this._oModel.setProperty("/element/property/elementState", "Warning");
            } else {
                this._oModel.setProperty("/element/property/elementState", "Error");
            }
        };

        TestHandler.prototype.onExplain = function (oEvent) {
            this._oMessagePopover.toggle(oEvent.getSource());
        }

        //check if the data entered seems to be valid.. following checks are performed
        //(1) ID is used and generated
        //(2) ID is used and cloned
        //(3) DOM-ID is used (should be avoided where possible)
        //(4) No or >1 Element is selected..
        TestHandler.prototype._checkAndDisplay = function (fnCallback) {
            var oResult = this._check();

            if (oResult.rating !== 5) {
                MessageBox.show(oResult.message, {
                    styleClass: "sapUiCompact",
                    icon: MessageBox.Icon.WARNING,
                    title: "There are open issues - Are you sure you want to save?",
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
            var aStoredItems = [];
            if (this._bShowCodeOnly === false) {
                aStoredItems = aStoredItems.concat(this._oModel.getProperty("/elements"), [oItem]);
            } else {
                aStoredItems = this._oModel.getProperty("/elements");
            }
            this._oModel.setProperty("/codes", this._testCafeGetCode(aStoredItems));
            var aElements = this._getFoundElements(0);
            this._oModel.setProperty("/element/identifiedElements", aElements);
            if (aElements.length !== 1) {
                //we are only expanding, in case we are in ACTION mode - reason: the user has to do sth. in case we are in action mode, as only one can be selected..
                if (this._oModel.getProperty("/element/property/type") !== 'ASS') {
                    sap.ui.core.Fragment.byId("testDialog", "atrElementsPnl").setExpanded(true);
                }
            }
            this._checkElementNumber();
            this._resumePerformanceBindings();
        };

        TestHandler.prototype._findItemAndExclude = function (oSelector) {
            var sStringified = JSON.stringify(oSelector);
            var aInformation = [];
            if (!oTestGlobalBuffer["findItem"][sStringified]) {
                oTestGlobalBuffer["findItem"][sStringified] = this._findItem(oSelector);
            }
            aInformation = oTestGlobalBuffer["findItem"][sStringified];

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
            if (this._oModel.getProperty("/element/property/type") === 'ASS' &&
                this._oModel.getProperty("/element/property/assKey") === 'ATTR') {
                iGetFullData = -1;
            }
            for (var i = 0; i < aItems.length; i++) {
                aItemsEnhanced.push(this._getElementInformation(aItems[i], aItems[i].getDomRef(), i < iGetFullData || iGetFullData === -1));
            }

            //append information about assertions..
            if (this._oModel.getProperty("/element/property/type") === 'ASS' &&
                this._oModel.getProperty("/element/property/assKey") === 'ATTR') {
                var oAssertDef = this._oModel.getProperty("/element/assertFilter");
                for (var i = 0; i < aItemsEnhanced.length; i++) {
                    var bFound = false;
                    var aAllErrors = [];
                    //check for every single assert, and store result..
                    for (var j = 0; j < oAssertDef.length; j++) {
                        var bFoundSingle = false;
                        var oAssertScope = {};
                        var oAssert = oAssertDef[j];
                        var sAssertLocalScope = this._attributeTypes[oAssert.attributeType].getAssertScope(oAssertScope);
                        var oAssertSpec = this._getValueSpec(oAssert, aItemsEnhanced[i]);
                        if (!oAssertSpec) {
                            continue; //non valid line..
                        }
                        var sAssert = sAssertLocalScope + oAssertSpec.assert();
                        var aSplit = sAssert.split(".");
                        var oCurItem = aItemsEnhanced[i];
                        var sCurrentError = "";
                        for (var x = 0; x < aSplit.length; x++) {
                            if (typeof oCurItem[aSplit[x]] === "undefined") {
                                bFoundSingle = true;
                                break;
                            }
                            oCurItem = oCurItem[aSplit[x]];
                        }
                        if (bFoundSingle === false) {
                            //depending on the operator, all ok or nothing ok :-)
                            if (oAssert.operatorType === "EQ" && oAssert.criteriaValue !== oCurItem) {
                                bFoundSingle = true;
                                sCurrentError = "Value " + oAssert.criteriaValue + " of " + sAssert + " does not match " + oCurItem;
                            } else if (oAssert.operatorType === "NE" && oAssert.criteriaValue === oCurItem) {
                                bFoundSingle = true;
                                sCurrentError = "Value " + oAssert.criteriaValue + " of " + sAssert + " does match " + oCurItem;
                            } else if (oAssert.operatorType === "CP" || oAssert.operatorType === "NP") {
                                //convert both to string if required..
                                var sStringContains = oAssert.criteriaValue;
                                var sStringCheck = oCurItem;
                                if (typeof sStringCheck !== "string") {
                                    sStringCheck = sStringCheck.toString();
                                }
                                if (typeof sStringContains !== "string") {
                                    sStringContains = sStringContains.toString();
                                }
                                if (sStringCheck.indexOf(sStringContains) === -1 && oAssert.operatorType === "CP") {
                                    bFoundSingle = true;
                                } else if (sStringCheck.indexOf(sStringContains) !== -1 && oAssert.operatorType === "NP") {
                                    bFoundSingle = true;
                                }
                            }
                        }
                        oAssert.assertionOK = bFoundSingle === false;
                        if (bFoundSingle === true) {
                            bFound = true;
                            aAllErrors.push({
                                description: sCurrentError,
                                title: "Assertion Error",
                                subtitle: sCurrentError,
                                type: "Error"
                            });
                        }
                    }
                    aItemsEnhanced[i].assertMessages = aAllErrors;
                    aItemsEnhanced[i].assertionOK = bFound === false;
                }
            }
            return aItemsEnhanced;
        };

        TestHandler.prototype.onShowItemGlobal = function () {
            var oItem = this._oModel.getProperty("/element/item");
            this._showItemControl(oItem.control);
        };

        TestHandler.prototype.onShowItem = function (oEvent) {
            var oObj = oEvent.getSource().getBindingContext("viewModel").getObject();
            if (!oObj.control) {
                return;
            }
            this._showItemControl(oObj.control);
        };

        TestHandler.prototype._showItemControl = function (oControl) {
            var oJQ = $(oControl.getDomRef());
            var oJQDialog = $(this._oDialog.getDomRef());
            var oOldWithControl = $(".HVRReveal");
            oOldWithControl.removeClass("HVRReveal");
            oJQ.addClass("HVRReveal");

            oJQDialog.fadeOut(function () {
                oJQDialog.delay(500).fadeIn(function () {
                    oJQ.removeClass("HVRReveal");
                    oOldWithControl.addClass("HVRReveal");
                });
            });
        };

        TestHandler.prototype.onShowAssertionIssue = function (oEvent) {
            this._oMessagePopoverAssert.setBindingContext(oEvent.getSource().getBindingContext("viewModel"), "viewModel");
            this._oMessagePopoverAssert.toggle(oEvent.getSource());
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

            if (sAssertType === 'ATTR') {
                sBasisCode += ".getUI5(" + "({ element }) => element.";
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

        TestHandler.prototype._getSelectorToJSONStringRec = function (oObject) {
            var sStringCurrent = "";
            var bFirst = true;
            for (var s in oObject) {
                var obj = oObject[s];
                if (!bFirst) {
                    sStringCurrent += ", ";
                }
                bFirst = false;
                if (Array.isArray(obj)) {
                    sStringCurrent += "[";
                    for (var i = 0; i < obj.length; i++) {
                        if (i > 0) {
                            sStringCurrent += ",";
                        }
                        sStringCurrent += this._getSelectorToJSONStringRec(obj[i]);
                    }
                    sStringCurrent += "]";
                } else if (typeof obj === "object") {
                    sStringCurrent += s + ": { ";
                    sStringCurrent += this._getSelectorToJSONStringRec(obj);
                    sStringCurrent += " }";
                } else {
                    if (this._oJSRegex.test(s) === false) {
                        s = '"' + s + '"';
                    }
                    sStringCurrent += s;
                    sStringCurrent += " : ";
                    if (typeof obj === "boolean") {
                        sStringCurrent += obj;
                    } else if (typeof obj === "number") {
                        sStringCurrent += obj;
                    } else {
                        sStringCurrent += '\"' + obj + '"';
                    }
                }
            }
            return sStringCurrent;
        };

        TestHandler.prototype.onChangeCriteriaValue = function (oEvent) {
            //reformat to have the correct data type..
            var oAttributeCtx = oEvent.getSource().getBindingContext("viewModel");
            var oAttribute = oAttributeCtx.getObject();
            var oScope = this._oModel.getProperty("/element/item");
            var oSubScope = this._attributeTypes[oAttribute.attributeType].getScope(oScope);

            if (oAttribute.criteriaType === "ATTR") {
                //get the corresponding value from metadata..
                if (oSubScope.metadata && oSubScope.metadata.elementName) {
                    var oElement = jQuery.sap.getObject(oSubScope.metadata.elementName);
                    if (oElement) {
                        var oMetadata = oElement.getMetadata();
                        if (oMetadata) {
                            var oType = oMetadata.getProperty(oAttribute.subCriteriaType);
                            if (oType) {
                                oAttribute.criteriaValue = oType.getType().parseValue(oAttribute.criteriaValue);
                                this._oModel.setProperty(oAttributeCtx.getPath() + "/criteriaValue", oAttribute.criteriaValue);
                            }
                        }
                    }
                }
            } else if (oAttribute.criteriaType === "AGG") {
                //we anyways only have length for the moment - change it to integer..
                this._oModel.setProperty(oAttributeCtx.getPath() + "/criteriaValue", parseInt(oAttribute.criteriaValue, 10));
            }
            this.onUpdatePreview();
        };

        TestHandler.prototype._getSelectorToJSONString = function (oObject) {
            this._oJSRegex = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/; //this is not perfect - we are working with predefined names, which are not getting "any" syntax though
            return "{ " + this._getSelectorToJSONStringRec(oObject) + " }";
        };

        TestHandler.prototype._getSelectorDefinition = function (oElement) {
            var oScope = {};
            var sSelector = "";
            var sSelectorAttributes = "";
            var sSelectorAttributesStringified = null;
            var sSelectorAttributesBtf = "";
            var oItem = oElement.item;
            var sActType = oElement.property.actKey; //PRS|TYP
            var sSelectType = oElement.property.selectItemBy; //DOM | UI5 | ATTR
            var sSelectorExtension = oElement.property.domChildWith;

            if (sSelectType === "DOM") {
                sSelector = "Selector";
                sSelectorAttributes = '#' + oElement.item.identifier.domId + sSelectorExtension;
                sSelectorAttributesStringified = '"' + sSelectorAttributes + '"';
            } else if (sSelectType === "UI5") {
                sSelector = "UI5Selector";
                sSelectorAttributes = oElement.item.identifier.ui5Id + sSelectorExtension;
                sSelectorAttributesStringified = '"' + sSelectorAttributes + '"';
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
                    //get the current item..
                    var oItemLocal = this._attributeTypes[oAttribute.attributeType].getItem(oItem);
                    var oSpec = this._getValueSpec(oAttribute, oItemLocal);
                    if (oSpec === null) {
                        continue;
                    }
                    //extent the current local scope with the code extensions..x
                    var oScopeLocal = this._attributeTypes[oAttribute.attributeType].getScope(oScope);
                    $.extend(true, oScopeLocal, oSpec.code(oAttribute.criteriaValue));
                }

                sSelectorAttributes = oScope;
                sSelectorAttributesStringified = this._getSelectorToJSONString(oScope); //JSON.stringify(oScope);
                sSelectorAttributesBtf = JSON.stringify(oScope, null, 2);
            }

            return {
                selectorAttributes: sSelectorAttributes,
                selectorAttributesStringified: sSelectorAttributesStringified ? sSelectorAttributesStringified : sSelectorAttributes,
                selectorAttributesBtf: sSelectorAttributesBtf,
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
                    sCode = "await t." + "expect(" + sSelectorFinal + oElement.assertion.code[i] + ";";
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
            sap.ui.core.Fragment.byId("testDialog", "atrElementsPnl").setExpanded(false);
            this._adjustAttributeDefaultSetting(this._oModel.getProperty("/element/item"));
            this._updatePreview();
        };

        TestHandler.prototype._suspendPerformanceBindings = function () {
            sap.ui.core.Fragment.byId("testDialog", "idAttributeTable").getBinding("items").suspend();
            sap.ui.core.Fragment.byId("testDialog", "idAssertionTable").getBinding("items").suspend();
            sap.ui.core.Fragment.byId("testDialog", "tblIdentifiedElements").getBinding("items").suspend();
            sap.ui.core.Fragment.byId("testDialog", "tblPerformedSteps").getBinding("items").suspend();
        }
        TestHandler.prototype._resumePerformanceBindings = function () {
            sap.ui.core.Fragment.byId("testDialog", "idAttributeTable").getBinding("items").resume();
            sap.ui.core.Fragment.byId("testDialog", "idAssertionTable").getBinding("items").resume();
            sap.ui.core.Fragment.byId("testDialog", "tblIdentifiedElements").getBinding("items").resume();
            sap.ui.core.Fragment.byId("testDialog", "tblPerformedSteps").getBinding("items").resume();
            sap.ui.core.Fragment.byId("testDialog", "attrObjectStatus").getBinding("text").refresh(true);
        }

        TestHandler.prototype._getPropertiesInArray = function (oObj) {
            var i = 0;
            for (var sAttr in oObj) {
                if (sAttr.indexOf("_") === 0) {
                    continue;
                }
                i += 1;
            }
            return i;
        };

        TestHandler.prototype._setUniqunessInformationElement = function (oItem) {
            var iUniqueness = 0;
            var oMerged = this._getMergedClassArray(oItem);
            oItem.uniquness = {
                property: {},
                context: {},
                binding: {}
            };

            //create uniquness for properties..
            var oObjectProps = {};
            var oObjectCtx = {};
            if (oItem.parent && oItem.parent.control && oItem.control.sParentAggregationName && oItem.control.sParentAggregationName.length > 0) {
                //we are an item..get all children of my current level, to search for identical items..
                var aItems = oItem.parent.control.getAggregation(oItem.control.sParentAggregationName);
                if (!aItems) {
                    return oItem;
                }
                for (var i = 0; i < aItems.length; i++) {
                    if (aItems[i].getMetadata().getElementName() !== oItem.control.getMetadata().getElementName()) {
                        continue;
                    }
                    for (var sModel in oItem.context) {
                        if (!oObjectCtx[sModel]) {
                            oObjectCtx[sModel] = {
                            };
                        }
                        var oCtx = aItems[i].getBindingContext(sModel === "undefined" ? undefined : sModel);
                        if (!oCtx) {
                            continue;
                        }
                        var oCtxObject = oCtx.getObject();

                        for (var sCtx in oItem.context[sModel]) {
                            var sValue = null;
                            sValue = oCtxObject[sCtx];
                            if (!oObjectCtx[sModel][sCtx]) {
                                oObjectCtx[sModel][sCtx] = {
                                    _totalAmount: 0
                                };
                            }
                            if (!oObjectCtx[sModel][sCtx][sValue]) {
                                oObjectCtx[sModel][sCtx][sValue] = 0;
                            }
                            oObjectCtx[sModel][sCtx][sValue] = oObjectCtx[sModel][sCtx][sValue] + 1;
                            oObjectCtx[sModel][sCtx]._totalAmount = oObjectCtx[sModel][sCtx]._totalAmount + 1;
                        }
                        for (var sCtx in oItem.context[sModel]) {
                            oObjectCtx[sModel][sCtx]._differentValues = this._getPropertiesInArray(oObjectCtx[sModel][sCtx]);
                        }
                    }
                    for (var sProperty in oItem.property) {
                        var sGetter = "get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1);
                        if (!oObjectProps[sProperty]) {
                            oObjectProps[sProperty] = {
                                _totalAmount: 0
                            };
                        }
                        var sValue = aItems[i][sGetter]();
                        if (!oObjectProps[sProperty][sValue]) {
                            oObjectProps[sProperty][sValue] = 0;
                        }
                        oObjectProps[sProperty][sValue] = oObjectProps[sProperty][sValue] + 1;
                        oObjectProps[sProperty]._totalAmount = oObjectProps[sProperty]._totalAmount + 1;
                    }
                    for (var sProperty in oItem.property) {
                        oObjectProps[sProperty]._differentValues = this._getPropertiesInArray(oObjectProps[sProperty]);
                    }
                }
            }

            for (var sAttr in oItem.property) {
                iUniqueness = 0;
                var oAttrMeta = oItem.control.getMetadata().getProperty(sAttr);
                if (oAttrMeta.defaultValue && oAttrMeta.defaultValue === oItem.property[sAttr]) {
                    iUniqueness = 0;
                } else {
                    //we know the total amount, and the amount of our own property + the general "diversity" of that column
                    //we can use our own property, to identify the uniquness of it
                    //+ use the diversity, to check if we are in some kinda "key" field..
                    if (oMerged.cloned === true) {
                        if (oObjectProps[sAttr]._totalAmount === oObjectProps[sAttr]._differentValues) {
                            //seems to be a key field.. great
                            iUniqueness = 100;
                        } else {
                            iUniqueness = ((oObjectProps[sAttr]._totalAmount + 1 - oObjectProps[sAttr][oItem.property[sAttr]]) / oObjectProps[sAttr]._totalAmount) * 90;
                        }
                    } else {
                        //binding is certainly very good - increase
                        if (oMerged.preferredProperties.indexOf(sAttr) !== -1) {
                            iUniqueness = 100;
                        } else if (oItem.binding[sAttr]) { //binding exists.. make it a little better...
                            iUniqueness = 50;
                        } else {
                            iUniqueness = 0;
                        }
                    }
                }
                oItem.uniquness.property[sAttr] = parseInt(iUniqueness, 10);
            }

            for (var sAttr in oItem.binding) {
                iUniqueness = 0;
                if (oMerged.cloned === true) {
                    //we are > 0 - our uniquness is 0, as bindings as MOST CERTAINLY not done per item (but globally)
                    iUniqueness = 0;
                } else {
                    //check if the binding is a preferred one (e.g. for label and similar)
                    iUniqueness = oItem.uniquness.property[sAttr];
                    if (oMerged.preferredProperties.indexOf(sAttr) !== -1) {
                        //binding is certainly very good - increase
                        iUniqueness = 100;
                    }
                }
                oItem.uniquness.binding[sAttr] = parseInt(iUniqueness, 10);
            }

            for (var sModel in oItem.context) {
                oItem.uniquness.context[sModel] = {};
                for (var sAttr in oItem.context[sModel]) {
                    if (oMerged.cloned === true) {
                        if (oObjectCtx[sModel][sAttr]._totalAmount === oObjectCtx[sModel][sAttr]._differentValues) {
                            iUniqueness = 100;
                        } else {
                            iUniqueness = ((oObjectCtx[sModel][sAttr]._totalAmount + 1 - oObjectCtx[sModel][sAttr][oItem.context[sModel][sAttr]]) / oObjectCtx[sModel][sAttr]._totalAmount) * 90;
                        }
                        oItem.uniquness.context[sModel][sAttr] = parseInt(iUniqueness, 10);
                    } else {
                        //check if there is a binding referring to that element..
                        var bFound = false;
                        for (var sBndg in oItem.binding) {
                            if (oItem.binding[sBndg].path === sAttr) {
                                oItem.uniquness.context[sModel][sAttr] = oItem.uniquness.binding[sBndg]; //should be pretty good - we are binding on it..
                                bFound = true;
                                break;
                            }
                        }
                        if (bFound === false) {
                            //there is no binding, but we have a binding context - theoretically, we could "check the uniquness" as per the data available
                            //to really check the uniquness here, would require to scan all elements, and still wouldn't be great
                            //==>just skip
                            oItem.uniquness.context[sModel][sAttr] = 0;
                        }
                    }
                }
            }
            return oItem;
        };

        TestHandler.prototype._setUniqunessInformation = function (oItem) {
            oItem = this._setUniqunessInformationElement(oItem);
            return oItem;
        }

        TestHandler.prototype._setItem = function (oControl, oDomNode, oOriginalDomNode) {
            this._suspendPerformanceBindings();

            var oItem = this._getElementInformation(oControl, oDomNode);
            oItem = this._setUniqunessInformation(oItem);
            oOriginalDomNode = oOriginalDomNode ? oOriginalDomNode : oDomNode;
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
            this._adjustDefaultSettings(oItem, oDomNode, oOriginalDomNode);
            this._updateValueState(oItem);
            this._updateSubActionTypes(true);
            this._updatePreview();

            this._resumePerformanceBindings();
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
            var oReturn = { defaultAction: { "": "" }, askForBindingContext: false, preferredProperties: [], cloned: false, defaultAttributes: [], actions: {} };
            //merge from button to top (while higher elements are overwriting lower elements)
            for (var i = 0; i < aClassArray.length; i++) {
                var oClass = aClassArray[i];
                oReturn.actions = oReturn.actions ? oReturn.actions : [];
                if (!oClass.defaultAction) {
                    oClass.defaultAction = [];
                } else if (typeof oClass.defaultAction === "string") {
                    oClass.defaultAction = [{
                        domChildWith: "", action: oClass.defaultAction
                    }];
                }
                oReturn.cloned = oClass.cloned === true ? true : oReturn.cloned;
                oReturn.preferredProperties = oReturn.preferredProperties.concat(oClass.preferredProperties ? oClass.preferredProperties : []);
                var aElementsAttributes = [];

                for (var j = 0; j < oClass.defaultAction.length; j++) {
                    oReturn.defaultAction[oClass.defaultAction[j].domChildWith] = oClass.defaultAction[j];
                }

                if (typeof oClass.defaultAttributes === "function") {
                    aElementsAttributes = oClass.defaultAttributes(oItem);
                } else if (oClass.defaultAttributes) {
                    aElementsAttributes = oClass.defaultAttributes;
                }
                oReturn.defaultAttributes = oReturn.defaultAttributes.concat(aElementsAttributes);

                oReturn.askForBindingContext = typeof oClass.askForBindingContext !== "undefined" && oReturn.askForBindingContext === false ? oClass.askForBindingContext : oReturn.askForBindingContext;
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
            return $.extend(true, [], aReturn);
        };

        TestHandler.prototype._adjustDefaultSettings = function (oItem, oDom, oDomOriginal) {
            var oMerged = this._getMergedClassArray(oItem);

            var sStringDomNodeOriginal = oDomOriginal.id.substr(oItem.control.getId().length);
            if (oMerged.defaultAction[sStringDomNodeOriginal]) {
                this._oModel.setProperty("/element/property/actKey", oMerged.defaultAction[sStringDomNodeOriginal].action);
                this._oModel.setProperty("/element/property/domChildWith", sStringDomNodeOriginal);
            } else {
                this._oModel.setProperty("/element/property/actKey", oMerged.defaultAction[""].action);
                this._oModel.setProperty("/element/property/domChildWith", "");
            }

            if (oItem.identifier.idGenerated === true || oItem.identifier.idCloned === true) {
                this._oModel.setProperty("/element/property/selectItemBy", "ATTR");
            } else {
                this._oModel.setProperty("/element/property/selectItemBy", "UI5");
            }

            if (this._getFoundElements().length > 1 && this._oModel.setProperty("/element/property/selectItemBy") === "UI5") {
                this._oModel.setProperty("/element/property/selectItemBy", "ATTR"); //change to attributee in case id is not sufficient..
            }

            this._findBestAttributeDefaultSetting(oItem, false);

            //adjust DOM node for action type "INP"..
            this._adjustDomChildWith(oItem);
        };

        TestHandler.prototype._findBestAttributeDefaultSetting = function (oItem, bForcePopup) {
            this._adjustAttributeDefaultSetting(oItem);

            //in case we still have >1 item - change to
            if (this._oModel.getProperty("/element/property/selectItemBy") === "ATTR" &&
                ((this._getFoundElements().length > 1 && this._oModel.getProperty("/element/property/type") === 'ACT') || bForcePopup === true)) {
                //ok - we are still not ready - let's check if we are any kind of item, which is requiring the user to ask for binding context information..
                //work on our binding context information..
                var oItem = this._oModel.getProperty("/element/item");
                var aList = [];
                if (!jQuery.isEmptyObject(oItem.context)) {
                    for (var sModel in oItem.context) {
                        for (var sAttribute in oItem.context[sModel]) {
                            if (typeof oItem.context[sModel][sAttribute] !== "object") {
                                aList.push({
                                    type: "BDG",
                                    typeTxt: "Context",
                                    bdgPath: sModel + "/" + sAttribute,
                                    attribute: sAttribute,
                                    value: oItem.context[sModel][sAttribute],
                                    importance: oItem.uniquness.context[sModel][sAttribute],
                                    valueToString: oItem.context[sModel][sAttribute].toString ? oItem.context[sModel][sAttribute].toString() : oItem.context[sModel][sAttribute]
                                });
                            }
                        }
                    }
                }
                if (!jQuery.isEmptyObject(oItem.binding)) {
                    for (var sAttr in oItem.binding) {
                        if (typeof oItem.binding[sAttr].path !== "object") {
                            aList.push({
                                type: "BNDG",
                                typeTxt: "Binding",
                                bdgPath: sAttr,
                                attribute: sAttr,
                                importance: oItem.uniquness.binding[sAttr],
                                value: oItem.binding[sAttr].path,
                                valueToString: oItem.binding[sAttr].path
                            });
                        }
                    }
                }
                if (!jQuery.isEmptyObject(oItem.property)) {
                    for (var sAttr in oItem.property) {
                        if (typeof oItem.property[sAttr] !== "object") {
                            aList.push({
                                type: "ATTR",
                                typeTxt: "Property",
                                bdgPath: sAttr,
                                attribute: sAttr,
                                importance: oItem.uniquness.property[sAttr],
                                value: oItem.property[sAttr],
                                valueToString: oItem.property[sAttr].toString ? oItem.property[sAttr].toString() : oItem.property[sAttr]
                            });
                        }
                    }
                }
                var oMerged = this._getMergedClassArray(oItem);
                this._oModel.setProperty("/element/itemCloned", oMerged.cloned);
                if (oMerged.cloned === true) {
                    aList = aList.sort(function (aObj, bObj) {
                        if (aObj.importance <= bObj.importance) {
                            return 1;
                        }
                        return -1;
                    });
                }

                for (var i = 0; i < aList.length; i++) {
                    aList[i].numberState = "Error";
                    if (aList[i].importance >= 80) {
                        aList[i].numberState = "Success";
                    } else if (aList[i].importance >= 60) {
                        aList[i].numberState = "Warning";
                    }
                }
                if (aList.length > 0) {
                    this._oModel.setProperty("/element/possibleContext", aList);
                    this._oTableContext.removeSelections();
                    this._oSelectDialog.setModel(this._oModel, "viewModel")
                    this._oSelectDialog.open();
                }
            }
        };

        TestHandler.prototype._adjustDomChildWith = function (oItem) {
            var oMerged = this._getMergedClassArray(oItem);
            //check if there is any preferred action, and that action is actually available..
            var oPropAction = oMerged.actions[this._oModel.getProperty("/element/property/actKey")];
            if (oPropAction) {
                var sPrefDomChildWith = "";
                for (var i = 0; i < oPropAction.length; i++) {
                    if (oPropAction[i].preferred === true) {
                        sPrefDomChildWith = oPropAction[i].domChildWith;
                        break;
                    }
                }
                if (sPrefDomChildWith.length) {
                    var sId = '#' + oItem.control.getId() + sPrefDomChildWith;
                    if ($(sId).length) {
                        this._oModel.setProperty("/element/property/domChildWith", sPrefDomChildWith);
                        this._oModel.setProperty("/element/item/dom", $(sId).get(0));
                        return;
                    }
                }
            }

            var sStringDomNodeOriginal = this._oModel.getProperty("/element/property/domChildWith");
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
                //set to root, in case we are not allowed to work on that node..
                if (!oMerged.defaultAction[sStringDomNodeOriginal]) {
                    this._oModel.setProperty("/element/property/domChildWith", "");
                }
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
            sap.ui.core.Fragment.byId("testDialog", "atrElementsPnl").setExpanded(true);
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
            this._findBestAttributeDefaultSetting(oItem, true);
        };

        TestHandler.prototype._findAttribute = function (oItem) {
            this._oModel.setProperty("/element/attributeFilter", []);

            var bSufficientForStop = false;
            //(1): we will ALWAYS add the property for metadata (class), as that just makes everyting so much faster and safer..
            this._add("/element/attributeFilter");

            //(2) add our LOCAL Id in case the local id is ok..
            if (oItem.identifier.ui5LocalId && oItem.identifier.localIdClonedOrGenerated === false) {
                this._add("/element/attributeFilter", { attributeType: "OWN", criteriaType: "ID", subCriteriaType: "LID" });
                bSufficientForStop = true;
            }

            if (this._getFoundElements().length === 1 && bSufficientForStop === true) { //early exit if possible - the less attributes the better..
                return;
            }
            //(3): we add the parent or the parent of the parent id in case the ID is unique..
            if (oItem.parent.identifier.ui5Id.length && oItem.parent.identifier.idGenerated === false && oItem.parent.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT", criteriaType: "ID", subCriteriaType: "ID" });
                bSufficientForStop = true;
            } else if (oItem.parentL2.identifier.ui5Id.length && oItem.parentL2.identifier.idGenerated === false && oItem.parentL2.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT2", criteriaType: "ID", subCriteriaType: "ID" });
                bSufficientForStop = true;
            } else if (oItem.parentL3.identifier.ui5Id.length && oItem.parentL3.identifier.idGenerated === false && oItem.parentL3.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT3", criteriaType: "ID", subCriteriaType: "ID" });
                bSufficientForStop = true;
            } else if (oItem.parentL4.identifier.ui5Id.length && oItem.parentL4.identifier.idGenerated === false && oItem.parentL4.identifier.idCloned === false) {
                this._add("/element/attributeFilter", { attributeType: "PRT4", criteriaType: "ID", subCriteriaType: "ID" });
                bSufficientForStop = true;
            }
            var oMerged = this._getMergedClassArray(oItem);
            if (oMerged.cloned === true) {
                bSufficientForStop = false;
            }

            //(4): now let's go for element specific attributes
            if (oMerged.defaultAttributes && oMerged.defaultAttributes.length > 0) {
                //add the elements from default attributes and stop.
                for (var i = 0; i < oMerged.defaultAttributes.length; i++) {
                    this._add("/element/attributeFilter", oMerged.defaultAttributes[i]);
                }
            }
            if (this._getFoundElements().length === 1) { //early exit if possible - the less attributes the better..
                return;
            }

            //(5): now add the label text if possible and static..
            if (oItem.label &&
                oItem.label.binding && oItem.label.binding.text && oItem.label.binding.text.static === true) {
                this._add("/element/attributeFilter", { attributeType: "PLBL", criteriaType: "BNDG", subCriteriaType: "text" });
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
            this._getAttributeRating();
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
            this._getAttributeRating();
        };

        TestHandler.prototype.onAddAssertion = function (oEvent) {
            //most certainly we want to "overwach" an attribute.. nothing else make too much sense..
            this._add("/element/assertFilter", { attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "" });

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
        TestHandler.prototype.onClick = function (oDomNode, bAssertion) {
            var oControl = this._getControlFromDom(oDomNode);
            if (!oControl) {
                return;
            }
            //per default (on purpose) reset the clicked element to "root" - the user should activly (!!) set the lower aggregation as valid..
            var oOriginalDomNode = oDomNode;
            oDomNode = oControl.getDomRef();
            $(oDomNode).addClass('HVRReveal');
            this._createDialog();

            this._oModel.setProperty("/element", JSON.parse(JSON.stringify(this._oModel.getProperty("/elementDefault"))));
            if (bAssertion === true) {
                this._oModel.setProperty("/element/property/type", "ASS");
            }
            this._oModel.setProperty("/selectMode", true);
            sap.ui.core.Fragment.byId("testDialog", "atrElementsPnl").setExpanded(false);
            this._bShowCodeOnly = false;
            this._resetCache();
            this._oDialog.open();

            //in case we are actually a "local-id", and we do NOT have "sParentAggregationName" set, and our parent is undefined
            //this means that we are actually a dumbshit (100% depending) child control - we will move up in that case..
            if (!oControl.getParent() && !oControl.sParentAggregationName && RegExp("([A-Z,a-z,0-9])-([A-Z,a-z,0-9])").test(oControl.getId()) === true) {
                var sItem = oControl.getId().substring(0, oControl.getId().lastIndexOf("-"));
                var oCtrlTest = sap.ui.getCore().byId(sItem);
                if (oCtrlTest) {
                    oControl = oCtrlTest;
                    oDomNode = oControl.getDomRef();
                }
            }
            this._setItem(oControl, oDomNode, oOriginalDomNode);

            //in case we are in "TYP" after opening, set focus to input field..
            var oInput = sap.ui.core.Fragment.byId("testDialog", "inpTypeText");
            var oConfirm = sap.ui.core.Fragment.byId("testDialog", "btSave");
            if (this._oModel.getProperty("/element/property/actKey") === "TYP") {
                this._oDialog.setInitialFocus(oInput);
            } else {
                //if rating = 5 --> save
                if (this._oModel.getProperty("/element/ratingOfAttributes") === 5 ) {
                    this._oDialog.setInitialFocus(oConfirm);
                }
            }
        };

        TestHandler.prototype._resetCache = function () {
            oTestGlobalBuffer = {
                fnGetElement: {
                    true: {},
                    false: {}
                },
                findItem: {},
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
            this._bShowCodeOnly = true;
            this._oModel.setProperty("/selectMode", false);
            this._createDialog();
            this._oDialog.open();
            this._updatePreview();
            $(".HVRReveal").removeClass('HVRReveal');
        };

        TestHandler.prototype.startFor = function (sId) {
            this._bActive = false;
            var oElement = document.getElementById(sId);
            if (!oElement) {
                return;
            }
            this.onClick(oElement, false);
        };

        TestHandler.prototype.init = function (sXMLPage) {
            this._sXMLPage = sXMLPage;
            $(document).ready(function () {
                var that = this;

                //create our global overlay..
                /*
                this._oGlobalOverlay = jQuery('<div id="tstUI5Overlay" class="HVRPlayStopOverlay"> </div>');
                this._oGlobalOverlay.appendTo(document.body);
                this._initGlobalOverlay();*/

                $(document).on("keydown", function (e) {
                    if (e.ctrlKey && e.altKey && e.shiftKey && e.which == 84) {
                        this._bActive = this._bActive !== true;
                    } else if (e.keyCode == 27) {
                        if (!(that._oDialog && that._oDialog.isOpen())) {
                            this._stop(); //stop on escape
                        }
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
                sap.ui.core.Popup.prototype.onFocusEvent = function (oBrowserEvent) {
                    if (that._bActive === false) {
                        if (!(that._oDialog && that._oDialog.isOpen())) {
                            return fnOldEvent.apply(this, arguments);
                        }
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
                    if (this._oDialog && this._oDialog.isOpen()) {
                        return;
                    }

                    this._bActive = false;
                    this.onClick(event.target, event.ctrlKey === true);
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
            //update the value for every single sub critriay type..
            for (var i = 0; i < oAttribute.subCriteriaTypes.length; i++) {
                var sStringTrimmed = oAttribute.subCriteriaTypes[i].value(oItem);
                if ( sStringTrimmed === null || typeof sStringTrimmed === "undefined" ) {
                    continue;
                }
                if (typeof sStringTrimmed !== "string") {
                    if (!sStringTrimmed.toString) {
                        continue;
                    }
                    sStringTrimmed = sStringTrimmed.toString();
                }
                var sStringUntrimmed = sStringTrimmed;
                if (sStringTrimmed.length > 15) {
                    sStringTrimmed = sStringTrimmed.substring(0, 15) + "(...)";
                }
                oAttribute.subCriteriaTypes[i].calculatedValueUnres = sStringUntrimmed;
                oAttribute.subCriteriaTypes[i].calculatedValue = sStringTrimmed;
            }

            this._oModel.setProperty(oCtx.getPath(), oAttribute);

            this._updateSubCriteriaType(oCtx);
        };

        TestHandler.prototype._getAttributeRating = function (oAttr) {
            var aAttributes = this._oModel.getProperty("/element/attributeFilter");
            var aAssertions = this._oModel.getProperty("/element/assertFilter");
            var oItem = this._oModel.getProperty("/element/item");
            var oElement = this._oModel.getProperty("/element");
            var iGrade = 5; //we are starting with a 5..
            var aMessages = [];
            var aFound = this._getFoundElements();
            var sType = oElement.property.type; // SEL | ACT | ASS
            var sAssType = oElement.property.assKey; // SEL | ACT | ASS
            var sSelectType = oElement.property.selectItemBy; //DOM | UI5 | ATTR
            var sExpectedCount = this._oModel.getProperty("/element/property/assKeyMatchingCount");

            if (oItem.identifier.idGenerated == true && sSelectType === "UI5") {
                aMessages.push({
                    type: "Error",
                    title: "ID generated",
                    subtitle: "Used identifer is cloned (not static)",
                    description: "You are probably using a cloned ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors."
                });
            } else if (oItem.identifier.idCloned === true && sSelectType === "UI5") {
                iGrade = 2;
                aMessages.push({
                    type: "Error",
                    title: "ID generated",
                    subtitle: "Used identifer is generated (not static)",
                    description: "You are probably using a cloned ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors."
                });
            }
            if (aFound.length === 0 && (sType === "ACT" || (sAssType === "EXS" && sType === "ASS"))) {
                iGrade = 1;
                aMessages.push({
                    type: "Error",
                    title: "No Item Found",
                    subtitle: "Your Action will not be executed",
                    description: "You have maintained an action to be executed. For the selected attributes/id however no item is found in the current screen. The action will therefore not work."
                });
            } else if (aFound.length > 1 && sType === "ACT") {
                iGrade = 1;
                aMessages.push({
                    type: "Error",
                    title: ">1 Item Found",
                    subtitle: "Your Action will be executed randomly",
                    description: "Your selector is returning " + aFound.length + " items. The action will be executed on the first found. That is normally an error - only in very few cases (e.g. identical launchpad tiles), that might be acceptable."
                });
            } else if (aFound.length !== sExpectedCount && sType === "ASS" && sAssType == "MTC") {
                iGrade = 1;
                aMessages.push({
                    type: "Warning",
                    title: "Assert will fail",
                    subtitle: aFound.length + " items found differs from " + sExpectedCount,
                    description: "Your selector is returning " + aFound.length + " items. The maintained assert will fail, as the expected value is different"
                });
            }

            //check the attributes.. for attributes we are at least expecting ONE element with a static id..
            var bFound = false;
            if (sSelectType === "ATTR") {
                for (var i = 0; i < aAttributes.length; i++) {
                    if (aAttributes[i].subCriteriaType === "LID" || aAttributes[i].subCriteriaType === "ID") {
                        bFound = true;
                        break;
                    }
                }
                if (bFound === false) {
                    iGrade = iGrade - 1;
                    aMessages.push({
                        type: "Warning",
                        title: "No ID in Properties",
                        subtitle: "At least one identifier is strongly recommended",
                        description: "Please provide a identifier - at least one of the parent levels, which is static."
                    });
                }

                bFound = false;
                for (var i = 0; i < aAttributes.length; i++) {
                    if (aAttributes[i].subCriteriaType === "LID" || aAttributes[i].subCriteriaType === "ID") {
                        //check if the corresponding id is generic.. if yes, we also have an issue..
                        var oSubScope = this._attributeTypes[aAttributes[i].attributeType].getScope(oItem);
                        if (oSubScope.metadata && (oSubScope.metadata.idCloned === true || oSubScope.metadata.idGenerated === true)) {
                            bFound = true;
                            break;
                        }
                    }
                }
                if (bFound === true) {
                    iGrade = iGrade - 2;
                    aMessages.push({
                        type: "Warning",
                        title: "Generic or Cloned ID",
                        subtitle: "You are using a generic or cloned ID",
                        description: "One of the attributes is using a generic or cloned identifier."
                    });
                }

                bFound = false;
                for (var i = 0; i < aAttributes.length; i++) {
                    if (aAttributes[i].criteriaType === "BDG") {
                        bFound = true;
                        break;
                    }
                }
                if (bFound === true) {
                    aMessages.push({
                        type: "Information",
                        title: "Binding Context",
                        subtitle: "Is the binding context static?",
                        description: "When using a binding context, please ensure that the value behind is either static, or predefined by your test."
                    });
                }
                bFound = false;
                for (var i = 0; i < aAttributes.length; i++) {
                    if (aAttributes[i].criteriaType === "ATTR") {
                        if (aAttributes[i].subCriteriaType === "title" || aAttributes[i].subCriteriaType === "text") {
                            bFound = true;
                        }
                        break;
                    }
                }
                if (bFound === true) {
                    iGrade = iGrade - 1;
                    aMessages.push({
                        type: "Warning",
                        title: "Text Attribute",
                        subtitle: "Is the attribute static?",
                        description: "You are binding against a text/title property. Are you sure that this text is not language specific and might destroy the test in other languages? Use Binding Path for text for i18n texts instead."
                    });
                }
            }

            //check of assertions..
            if (sType === "ASS" && sAssType === "ATTR") {
                //check if any have assertionOK = false..
                bFound = false;
                for (var i = 0; i < aAssertions.length; i++) {
                    if (aAssertions[i].assertionOK === false) {
                        bFound = true;
                    }
                }

                if (bFound === true) {
                    sap.ui.core.Fragment.byId("testDialog", "pnlFoundElements").setExpanded(true);
                    iGrade = 1;
                    aMessages.push({
                        type: "Error",
                        title: "Assert is failing",
                        subtitle: "At least one assert is failing",
                        description: "At least one of the maintained assert attribute checks is failing. This also wont work within the actual test run later on. Please fix that."
                    });
                }
            }

            if (iGrade < 0) {
                iGrade = 0;
            }
            this._oModel.setProperty("/element/messages", aMessages);
            this._oModel.setProperty("/element/ratingOfAttributes", iGrade);
            return {
                rating: iGrade,
                messages: aMessages
            }
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

        TestHandler.prototype._getItemDataForItem = function (oItem) {
            var oCustom = _getItemForItem(oItem.control);
            if (oCustom) {
                return this._getElementInformation(oCustom, null);
            } else {
                return null;
            }
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
                "BNDG": {
                    criteriaKey: "BNDG",
                    criteriaText: "Binding Path",
                    criteriaSpec: function (oItem) {
                        var aReturn = [];
                        for (var sBinding in oItem.binding) {
                            aReturn.push({
                                subCriteriaType: sBinding,
                                subCriteriaText: sBinding,
                                code: function (sBinding, sValue) {
                                    var oReturn = { binding: {} };
                                    oReturn.binding[sBinding] = {
                                        path: sValue
                                    };
                                    return oReturn;
                                }.bind(this, sBinding),
                                value: function (subCriteriaType, oItem) {
                                    return oItem.binding[subCriteriaType].path;
                                }.bind(this, sBinding),
                                assert: function (subCriteriaType) {
                                    return "binding." + subCriteriaType + ".path";
                                }.bind(this, sBinding)
                            });
                        }
                        return aReturn;
                    }
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
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["MODL"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                },
                "VIW": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 1, true); }.bind(this),
                    getScope: function (oScope) { oScope.view = oScope.view ? oScope.view : {}; return oScope.view; },
                    getAssertScope: function () { return "view." },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                },
                "PRT": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 1); }.bind(this),
                    getAssertScope: function () { return "parent." },
                    getScope: function (oScope) { oScope.parent = oScope.parent ? oScope.parent : {}; return oScope.parent; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"], this._criteriaTypes["BNDG"]]
                },
                "PRT2": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 2); }.bind(this),
                    getAssertScope: function () { return "parentL2." },
                    getScope: function (oScope) { oScope.parentL2 = oScope.parentL2 ? oScope.parentL2 : {}; return oScope.parentL2; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"], this._criteriaTypes["BNDG"]]
                },
                "PRT3": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 3); }.bind(this),
                    getAssertScope: function () { return "parentL3." },
                    getScope: function (oScope) { oScope.parentL3 = oScope.parentL3 ? oScope.parentL3 : {}; return oScope.parentL3; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"], this._criteriaTypes["BNDG"]]
                },
                "PRT4": {
                    getItem: function (oItem) { return this._getParentWithDom(oItem, 4); }.bind(this),
                    getAssertScope: function () { return "parentL4." },
                    getScope: function (oScope) { oScope.parentL4 = oScope.parentL4 ? oScope.parentL4 : {}; return oScope.parentL4; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"], this._criteriaTypes["BNDG"]]
                },
                "PLBL": {
                    getItem: function (oItem) { return this._getLabelForItem(oItem); }.bind(this),
                    getAssertScope: function () { return "label." },
                    getScope: function (oScope) { oScope.label = oScope.label ? oScope.label : {}; return oScope.label; },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MODL"], this._criteriaTypes["MTA"], this._criteriaTypes["BNDG"]]
                },
                "MCMB": {
                    getItem: function (oItem) {
                        return this._getItemDataForItem(oItem);
                    }.bind(this),
                    getScope: function (oScope) { oScope.itemdata = oScope.itemdata ? oScope.itemdata : {}; return oScope.itemdata; },
                    getAssertScope: function () { return "itemdata." },
                    criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                },
            };

            this._defineElementBasedActions();
        };

        TestHandler.prototype._defineElementBasedActions = function () {
            this._oElementMix = {
                "sap.m.StandardListItem": {
                    defaultAttributes: function (oItem) {
                        return [{ attributeType: "MCMB", criteriaType: "ATTR", subCriteriaType: "key" }];
                    }
                },
                "sap.ui.core.Element": {
                    defaultAction: "PRS",
                    actions: {
                        "PRS": [{ text: "Root", domChildWith: "", order: 99 }],
                        "TYP": [{ text: "Root", domChildWith: "", order: 99 }]
                    }
                },
                "sap.ui.core.Icon": {
                    preferredProperties: ["src"],
                    defaultAttributes: function (oItem) {
                        return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "src" }];
                    }
                },
                "sap.m.ObjectListItem": {
                    cloned: true,
                    preferredProperties: ["title"]
                },
                "sap.m.Button": {
                    defaultAction: "PRS",
                    preferredProperties: ["text", "icon"],
                    defaultAttributes: function (oItem) {
                        var aReturn = [];
                        if (oItem.binding.text) {
                            aReturn.push({ attributeType: "OWN", criteriaType: "BNDG", subCriteriaType: "text" });
                        }
                        if (oItem.binding.icon) {
                            aReturn.push({ attributeType: "OWN", criteriaType: "BNDG", subCriteriaType: "icon" });
                        } else if (oItem.property.icon) {
                            aReturn.push({ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "icon" });
                        }
                        if (oItem.binding.tooltip) {
                            aReturn.push({ attributeType: "OWN", criteriaType: "BNDG", subCriteriaType: "tooltip" });
                        }
                        return aReturn;
                    }
                },
                "sap.m.ListItemBase": {
                    cloned: true,
                    askForBindingContext: true
                },
                "sap.ui.core.Item": {
                    cloned: true,
                    defaultAttributes: function (oItem) {
                        return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "key" }];
                    }
                },
                "sap.m.Link": {
                    defaultAttributes: function (oItem) {
                        //if the text is static --> take the binding with priority..
                        if (oItem.binding && oItem.binding["text"] && oItem.binding["text"].static === true) {
                            return [{ attributeType: "OWN", criteriaType: "BNDG", subCriteriaType: "text" }];
                        } else if (oItem.property.text && oItem.property.text.length > 0) {
                            return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "text" }];
                        } else if (oItem.property.text && oItem.property.text.length > 0) {
                            return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "target" }];
                        } else if (oItem.property.text && oItem.property.text.length > 0) {
                            return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "href" }];
                        }
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
                "sap.m.Text": {
                    preferredProperties: ["text"]
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
                },
                "sap.m.SearchField": {
                    defaultAction: [{ domChildWith: "-search", action: "PRS" },
                    { domChildWith: "-reset", action: "PRS" },
                    { domChildWith: "", action: "TYP" }]
                },
                "sap.ui.table.Row": {
                    cloned: true
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
                    if (id.itemdata) {
                        bFound = bFound && _checkItem(_getItemForItem(oItem), id.itemdata);
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
                    sSelectorStringForJQuery += "*[id$='" + sIdFound + "']";
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
                var searchId = "*[id$='" + id + "']";
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
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", localIdClonedOrGenerated: false, ui5AbsoluteId: "" },
                parent: {},
                parentL2: {},
                parentL3: {},
                parentL4: {},
                itemdata: {},
                label: {},
                parents: [],
                control: null,
                dom: null
            };
            bFull = typeof bFull === "undefined" ? true : bFull;

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
            oReturn.parent = fnGetElementInformation(_getParentWithDom(oItem, 1), bFull);
            oReturn.parentL2 = fnGetElementInformation(_getParentWithDom(oItem, 2), bFull);
            oReturn.parentL3 = fnGetElementInformation(_getParentWithDom(oItem, 3), bFull);
            oReturn.parentL4 = fnGetElementInformation(_getParentWithDom(oItem, 4), bFull);
            oReturn.label = fnGetElementInformation(_getLabelForItem(oItem), bFull);
            oReturn.itemdata = fnGetElementInformation(_getItemForItem(oItem), bFull);

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

    var _getItemForItem = function (oItem) {
        //(0) check if we are already an item - no issue than..
        if (oItem instanceof sap.ui.core.Item) {
            return oItem;
        }

        //(1) check by custom data..
        if (oItem.getCustomData()) {
            for (var i = 0; i < oItem.getCustomData().length; i++) {
                var oObj = oItem.getCustomData()[i].getValue();
                if (oObj instanceof sap.ui.core.Item) {
                    return oObj;
                }
            }
        }

        //(2) no custom data? search for special cases
        //2.1: Multi-Combo-Box
        var oPrt = _getParentWithDom(oItem, 3);
        if (oPrt && oPrt.getMetadata().getElementName() === "sap.m.MultiComboBox") {
            if (oPrt._getItemByListItem) {
                var oCtrl = oPrt._getItemByListItem(oItem);
                if (oCtrl) {
                    return oCtrl;
                }
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
        if (oTestGlobalBuffer.label) {
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
            if (oObject.getMetadata()._sClassName === "sap.m.Label") {
                var oLabelFor = oObject.getLabelFor ? oObject.getLabelFor() : null;
                if (oLabelFor) {
                    oTestGlobalBuffer.label[oLabelFor] = oObject; //always overwrite - i am very sure that is correct
                } else {
                    //yes.. labelFor is maintained in one of 15 cases (fuck it)
                    //for forms it seems to be filled "randomly" - as apparently no developer is maintaing that correctly
                    //we have to search UPWARDS, and hope we are within a form.. in that case, normally we can just take all the fields aggregation elements
                    if (oObject.getParent() && oObject.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                        //ok.. we got luck.. let's assign all fields..
                        var oFormElementFields = oObject.getParent().getFields();
                        for (var j = 0; j < oFormElementFields.length; j++) {
                            if (!oTestGlobalBuffer.label[oFormElementFields[j].getId()]) {
                                oTestGlobalBuffer.label[oFormElementFields[j].getId()] = oObject;
                            }
                        }
                    }
                }
            }
        }

        //most simple approach is done.. unfortunatly hi
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
            if ($("*[id$='" + oDomRef.id + id.domChildWith + "']").length === 0) {
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

        if (id.binding) {
            for (var sBinding in id.binding) {
                var oAggrInfo = oItem.getBindingInfo(sBinding);
                if (!oAggrInfo) {
                    //SPECIAL CASE for sap.m.Label in Forms, where the label is actually bound against the parent element (yay)
                    if (oItem.getMetadata().getElementName() === "sap.m.Label") {
                        if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                            var oParentBndg = oItem.getParent().getBinding("label");
                            if (!oParentBndg || oParentBndg.getPath() !== id.binding[sBinding].path) {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                } else {
                    var oBinding = oItem.getBinding(sBinding);
                    if (!oBinding) {
                        if (oAggrInfo.path !== id.binding[sBinding].path) {
                            return false;
                        }
                    } else {
                        if (oBinding.getPath() !== id.binding[sBinding].path) {
                            return false;
                        }
                    }
                }
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
            binding: {},
            context: {},
            model: {},
            metadata: {},
            identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", localIdClonedOrGenerated: false, ui5AbsoluteId: "" },
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
        } else {
            //check as per metadata..
            var oMetadata = oItem.getMetadata();
            while (oMetadata) {
                if (!oMetadata._sClassName) {
                    break;
                }
                if (["sap.ui.core.Item", "sap.ui.table.Row", "sap.m.ObjectListItem"].indexOf(oMetadata._sClassName) !== -1) {
                    oReturn.identifier.idCloned = true;
                }
                oMetadata = oMetadata.getParent();
            }
        }
        //does the ui5id contain a "__"? it is most likely a generated id which should NOT BE USESD!!
        //check might be enhanced, as it seems to be that all controls are adding "__[CONTORLNAME] as dynamic view..
        if (oReturn.identifier.ui5Id.indexOf("__") !== -1) {
            oReturn.identifier.idGenerated = true;
        }
        if (oDomNode) {
            oReturn.identifier.domId = oDomNode.id;
        }
        if (oReturn.identifier.idCloned === true || oReturn.identifier.ui5LocalId.indexOf("__") !== -1) {
            oReturn.identifier.localIdClonedOrGenerated = true;
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

        //bindings..
        for (var sBinding in oItem.mBindingInfos) {
            var oBinding = oItem.getBinding(sBinding);
            if (oBinding) {
                oReturn.binding[sBinding] = {
                    path: oBinding.sPath && oBinding.getPath(),
                    "static": oBinding.oModel && oBinding.getModel() instanceof sap.ui.model.resource.ResourceModel
                };
            } else {
                var oBindingInfo = oItem.getBindingInfo(sBinding);
                if (!oBindingInfo) {
                    continue;
                }
                if (oBindingInfo.path) {
                    oReturn.binding[sBinding] = {
                        path: oBindingInfo.path,
                        "static": true
                    };
                } else if (oBindingInfo.parts && oBindingInfo.parts.length > 0) {
                    for (var i = 0; i < oBindingInfo.parts.length; i++) {
                        if (!oBindingInfo.parts[i].path) {
                            continue;
                        }
                        if (!oReturn.binding[sBinding]) {
                            oReturn.binding[sBinding] = { path: oBindingInfo.parts[i].path, "static": true };
                        } else {
                            oReturn.binding[sBinding].path += ";" + oBindingInfo.parts[i].path;
                        }
                    }
                }
            }
        }

        //very special for "sap.m.Label"..
        if (oReturn.metadata.elementName === "sap.m.Label" && !oReturn.binding.text) {
            if (oItem.getParent() && oItem.getParent().getMetadata()._sClassName === "sap.ui.layout.form.FormElement") {
                var oParentBndg = oItem.getParent().getBinding("label");
                if (oParentBndg) {
                    oReturn.binding["text"] = {
                        path: oParentBndg.sPath && oParentBndg.getPath(),
                        "static": oParentBndg.oModel && oParentBndg.getModel() instanceof sap.ui.model.resource.ResourceModel
                    };
                }
            }
        }


        //return all simple properties
        for (var sProperty in oItem.mProperties) {
            oReturn.property[sProperty] = oItem["get" + sProperty.charAt(0).toUpperCase() + sProperty.substr(1)]();
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
}