sap.ui.define([
    "com/ui5/testing/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    "com/ui5/testing/model/Navigation",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/RecordController",
    "com/ui5/testing/model/GlobalSettings",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessagePopover, MessageItem, Navigation, Communication, RecordController, GlobalSettings, MessageToast) {
    "use strict";

    var TestDetails = Controller.extend("com.ui5.testing.controller.TestDetails", {
        _oModel: new JSONModel({
            codes: [],
            test: {},
            codeSettings: {
                language: "TCF",
                testName: "",
                testCategory: "",
                testUrl: "",
                supportAssistant: false
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
                supportRules: [],
                type: [
                    { key: "ACT", text: "Action" },
                    { key: "ASS", text: "Assert" },
                    { key: "SUP", text: "Support Assistant" }
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
            }
        }),
        _bActive: false,
        _bStarted: false,

        onInit: function () {
            Communication.registerEvent("itemSelected", this._onItemSelected.bind(this));

            this.getView().setModel(this._oModel, "viewModel");
            this.getView().setModel(RecordController.getModel(), "recordModel");
            this.getView().setModel(Navigation.getModel(), "navModel");
            this.getView().setModel(GlobalSettings.getModel(), "settingsModel");
            this._createDialog();
            this.getOwnerComponent().getRouter().getRoute("testDetails").attachPatternMatched(this._onTestDisplay, this);
            this.getOwnerComponent().getRouter().getRoute("testDetailsCreate").attachPatternMatched(this._onTestCreate, this);
            sap.ui.getCore().getEventBus().subscribe("RecordController", "windowFocusLost", this._recordStopped, this);
        }
    });

    TestDetails.prototype._recordStopped = function () {
        var dialog = new Dialog({
            title: 'Browser Window closed',
            type: 'Message',
            state: 'Error',
            content: new Text({
                text: 'The recorded browser window focus is lost - please do not close during recording.'
            }),
            beginButton: new Button({
                text: 'OK',
                press: function () {
                    dialog.close();
                    this.getRouter().navTo("start");
                }.bind(this)
            }),
            afterClose: function () {
                dialog.destroy();
            }
        });

        dialog.open();
    };

    TestDetails.prototype.uuidv4 = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    TestDetails.prototype._createDialog = function () {
        this._oRecordDialog = sap.ui.xmlfragment(
            "com.ui5.testing.view.RecordDialog",
            this
        );
        this._oRecordDialog.setModel(this._oModel, "viewModel");
        this._oRecordDialog.setModel(RecordController.getModel(), "recordModel");
    };

    TestDetails.prototype.onRecord = function () {
        RecordController.startRecording();
    };

    TestDetails.prototype.onSave = function () {
        //save /codesettings & /test & navModel>/elements - optimiazion potential..
        var oSave = {
            codeSettings: this._oModel.getProperty("/codeSettings"),
            elements: this.getModel("navModel").getProperty("/elements"),
            test: this.getModel("navModel").getProperty("/test")
        };

        var aExisting = [];
        chrome.storage.local.get(["items"], function (items) {
            if (items && items.items) {
                aExisting = items.items;
            }
            //check if we are already existing (do not add twice to the array..)
            if (aExisting.filter(function (obj) { if (obj == oSave.test.uuid) { return true; } return false }).length === 0) {
                aExisting.push(oSave.test.uuid);
                chrome.storage.local.set({ "items": aExisting });
            }
            var oStore = {};
            oStore[oSave.test.uuid] = JSON.stringify(oSave);
            chrome.storage.local.set(oStore, function () {
                MessageToast.show("Saved in local Storage");
            });
        });
    };

    TestDetails.prototype.onDelete = function (oEvent) {
        var sId = this.getModel("navModel").getProperty("/test/uuid");
        var aExisting = [];
        chrome.storage.local.get(["items"], function (items) {
            if (items && items.items) {
                aExisting = items.items;
            }
            //check if we are already existing (do not add twice to the array..)
            var iIndex = aExisting.indexOf(sId);
            if (iIndex === -1) {
                return;
            }
            aExisting.splice(iIndex, 1);
            chrome.storage.local.set({ "items": aExisting });
            chrome.storage.local.remove(sId);
            this.getRouter().navTo("start");
        }.bind(this));
    };


    TestDetails.prototype.onNavBack = function () {
        RecordController.stopRecording();
        this._oRecordDialog.close();
        this.getRouter().navTo("start");
    };

    TestDetails.prototype.onStopRecord = function () {
        RecordController.stopRecording();
        this._oRecordDialog.close();
    };

    TestDetails.prototype._onTestCreate = function (oEvent) {
        this._bCreateMode = true;
        this.getModel("navModel").setProperty("/test", {
            uuid: this.uuidv4(),
            createdAt: new Date().getTime()
        });
        this._oModel.setProperty("/codeSettings/language", this.getModel("settingsModel").getProperty("/settings/defaultLanguage"));
        Communication.fireEvent("getwindowinfo").then(function (oData) {
            this._oModel.setProperty("/codeSettings/testName", oData.title);
            this._oModel.setProperty("/codeSettings/testCategory", oData.title);
            this._oModel.setProperty("/codeSettings/testUrl", oData.url);
            RecordController.startRecording();
            this.getRouter().navTo("testDetails", {
                TestId: this.getModel("navModel").getProperty("/test/uuid")
            });
        }.bind(this));
    };

    TestDetails.prototype._onItemSelected = function (oData) {
        Navigation.setSelectedItem(oData);
        RecordController.focusPopup();

        this.getRouter().navTo("elementCreate", {
            TestId: this.getModel("navModel").getProperty("/test/uuid"),
            ElementId: oData.identifier.ui5AbsoluteId
        });
    };

    TestDetails.prototype._onTestDisplay = function (oEvent) {
        this._bCreateMode = false;
        var sTargetUUID = oEvent.getParameter("arguments").TestId;
        var sCurrentUUID = this.getModel("navModel").getProperty("/test/uuid");
        if (sCurrentUUID !== sTargetUUID) {
            //we have to read the current data..
            chrome.storage.local.get(sTargetUUID, function (oSave) {
                if (!oSave[sTargetUUID]) {
                    this.getRouter().navTo("start");
                    return;
                }
                oSave = JSON.parse(oSave[sTargetUUID]);
                this._oModel.setProperty("/codeSettings", oSave.codeSettings);
                this.getModel("navModel").setProperty("/elements", oSave.elements);
                this.getModel("navModel").setProperty("/elementLength", oSave.elements.length);
                this.getModel("navModel").setProperty("/test", oSave.test);
                this._updatePreview();
            }.bind(this));
        } else if (this.getModel("recordModel").getProperty("/recording") === true) {
            setTimeout(function () {
                this._oRecordDialog.open();
            }.bind(this), 100);
        }
        this._updatePreview();
    };

    TestDetails.prototype.onShowActionSettings = function (oEvent) {
        this._createActionPopover();
        this._oPopoverAction.openBy(oEvent.getSource());
    };

    TestDetails.prototype._initMessagePopover = function () {
    };



    TestDetails.prototype._testCafeGetCode = function (aElements) {
        var aCodes = [];
        var bSupportAssistant = this._oModel.getProperty("/codeSettings/supportAssistant");

        //for testcafe we are returning: (1) installation instructions..
        var oCodeInstall = {
            codeName: "Installation (Non WebIDE)",
            type: "FTXT",
            order: 2,
            code: "<h3>Installation</h3>" +
                "<p>Execute the following command-line paramters:</p>" +
                "<code>npm install testcafe testcafe-reporter-xunit ui5-testcafe-selector --save-dev</code>" +
                "<p>This will install all relevant packages for the test-automation runner.</p>" +
                "<h3>Test-Configuration</h3>" +
                "<p>Write a new testfile and copy/paste the code. The file can both be a typescript or a javascript file.</p>" +
                "<h3>Running</h3>" +
                "<p>Run via Command-Line via: <code>testcafe chrome your_test_file.js/ts</code><br/>" +
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
        var bSupportAssistantNeeded = bSupportAssistant;
        var bSelectorNeeded = false;
        for (var i = 0; i < aElements.length; i++) {
            if (aElements[i].property.type === "SUP") {
                bSupportAssistantNeeded = true;
            }
            if (aElements[i].property.actionSettings.blur === true) {
                bSelectorNeeded = true;
            }
        }

        sCode = 'import { UI5Selector ' + (bSupportAssistantNeeded ? ", utils " : "") + '} from "ui5-testcafe-selector";\n';
        if (bSelectorNeeded === true) {
            sCode += 'import { Selector } from "testcafe";\n';
        }
        sCode += "fixture('" + oCodeSettings.testCategory + "')\n";
        sCode += "  .page('" + oCodeSettings.testUrl + "');\n";
        sCode += "\n";
        sCode += "test('" + oCodeSettings.testName + "', async t => {\n";
        var sCurrentHash = null;
        var bVariableInitialized = false;
        var bHashChanged = true;
        for (var i = 0; i < aElements.length; i++) {
            var aLines = [];
            if (aElements[i].property.type !== "SUP") {
                aLines = this._getCodeFromItem(aElements[i]);
            }

            if (sCurrentHash === null || sCurrentHash !== aElements[i].hash) {
                if (sCurrentHash !== null) {
                    sCode = sCode + "\n  //new route:" + aElements[i].hash + "\n";
                }
                sCurrentHash = aElements[i].hash;
                bHashChanged = true;
            }

            if ((bHashChanged === true && bSupportAssistant) || aElements[i].property.type === "SUP") {
                sCode += "  " + (bVariableInitialized === false ? "var " : "") + "oSupportAssistantResult = await utils.supportAssistant(t, '" + aElements[i].item.metadata.componentName + "' );\n";
                sCode += "  " + "await t.expect(oSupportAssistantResult.High.length).eql(0);\n";
                bVariableInitialized = true;
            }

            for (var j = 0; j < aLines.length; j++) {
                sCode += "  " + aLines[j] + "\n";
            }
        }
        sCode += "});";
        oCodeTest.code = sCode;
        aCodes.push(oCodeTest);
        return aCodes;
    };


    TestDetails.prototype._opaGetCode = function (aElements) {
        var aCodes = [];
        var bSupportAssistant = this._oModel.getProperty("/codeSettings/supportAssistant");

        //for testcafe we are returning: (1) installation instructions..
        var oCodeInstall = {
            codeName: "Usage",
            type: "FTXT",
            order: 2,
            code: "<h3>t.b.d.</h3>"
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

        sCode = 'sap.ui.define([;\n';
        sCode += '    "sap/ui/test/opaQunit"\n';
        sCode += '], function (opaTest) {\n';
        sCode += '    "use strict";\n\n';
        sCode += '    QUnit.module("' + oCodeSettings.testCategory + '");\n\n';

        //group elements by assertions (Given, When, Then)
        var aCluster = [[]];
        var bNextIsBreak = false;
        var sFirstComponent = "";
        var sFirstPage = "";
        var aPages = {};
        var oFirstComponent = null;
        for (var i = 0; i < aElements.length; i++) {
            if (bNextIsBreak === true) {
                aCluster.push([]);
                bNextIsBreak = false;
            }
            if (aElements[i].item.metadata.componentId && sFirstComponent.length === 0) {
                oFirstComponent = aElements[i].item.metadata;
                sFirstComponent = aElements[i].item.metadata.componentId;
                sFirstPage = aElements[i].item.viewProperty.localViewName;
            }
            if ( typeof aPages[aElements[i].item.viewProperty.localViewName] === "undefined" ) {
                aPages[aElements[i].item.viewProperty.localViewName] = {
                    viewName: aElements[i].item.viewProperty.localViewName
                };
            }
            if (i < aElements.length - 1 && aElements[i].property.type === "ASS" && aElements[i + 1].property.type === "ACT") {
                bNextIsBreak = true;
            }
            aCluster[aCluster.length - 1].push(aElements[i]);
        }

        //make an initialization call...
        //load the data sources..
        var oMockConfig = {};
        for (var sDS in oFirstComponent.componentDataSource) {
            var oDS = oFirstComponent.componentDataSource[sDS];
        }

        sCode += '    opaTest("Initialize the Application", function (Given, When, Then) {\n';
        sCode += '        Given.onThe' + sFirstPage + 'Page.iInitializeMockServer().iStartMockServer().\n        iStartTheApp("' + sFirstComponent + '", { hash: "' + aElements[0].hash + '" });\n\n';
        sCode += '        When.onThe' + sFirstPage + 'Page.iLookAtTheScreen();\n\n';
        sCode += '        Then.onThe' + sFirstPage + 'Page.theViewShouldBeVisible();\n';
        sCode += '    });\n\n'

        //make the rest of the OPA calls..
        for (var i = 0; i < aCluster.length; i++) {
            var aLines = [];
            sCode += "    opaTest('Test " + i + "', function (Given, When, Then) {\n";
            for (var j = 0; j < aCluster[i].length; j++) {
                var oElement = aCluster[i][j];

                if (oElement.property.type !== "SUP") {
                    aLines = this._getOPACodeFromItem(oElement);
                }

                for (var x = 0; x < aLines.length; x++) {
                    sCode += "        " + aLines[x] + "\n";
                }
            }

            sCode += "    });\n";
        }

        sCode += "});";
        oCodeTest.code = sCode;
        aCodes.push(oCodeTest);

        //create a code per view..
        for ( var sPage in aPages ) {
            var oPage = aPages[sPage];
            sCode = "sap.ui.define([\n";
            sCode += '  "sap/ui/test/Opa5",\n';
            sCode += '  "com/ui5/testing/PageBase"\n';
            sCode += '], function (Opa5, Common) {\n';
            sCode += '   "use strict";\n';
            sCode += '   Opa5.createPageObjects({\n';
            sCode += '      onThe' + sPage + 'Page: {\n';
            sCode += '         baseClass: Common,\n';
            sCode += '         viewName: "' + sPage + '",\n';
            sCode += '         actions: {},\n';
            sCode += '         assertions: {},\n';
            sCode += '      });\n';
            sCode += '   });\n';
            sCode += '}';
            aCodes.push({
                codeName: "Page Code (" + sPage + ")",
                code: sCode,
                type: "CODE",
                order: 2
            });
        }

        aCodes = aCodes.sort(function (aObj, bObj) {
            if (aObj.order <= bObj.order) {
                return -1;
            }
            return 1;
        });
        return aCodes;
    };

    TestDetails.prototype._updatePreview = function () {
        var aStoredItems = this.getModel("navModel").getProperty("/elements");

        var sCodeLanguage = this._oModel.getProperty("/codeSettings/language");
        if (sCodeLanguage === "OPA") {
            this._oModel.setProperty("/codes", this._opaGetCode(aStoredItems));
        } else {
            //testcafe by default
            this._oModel.setProperty("/codes", this._testCafeGetCode(aStoredItems));
        }
    };

    TestDetails.prototype.onContinueRecording = function () {
        this._oRecordDialog.open();
        RecordController.startRecording();
    };

    TestDetails.prototype._showItemControl = function (oControl) {
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

    TestDetails.prototype._getAssertDefinition = function (oElement) {
        var sBasisCode = "";
        var sCode = "";
        var aAsserts = oElement.assertFilter;
        var oAssertScope = {};
        var sAssertType = oElement.property.assKey;
        var sAssertMsg = oElement.property.assertMessage;
        var aCode = [];
        var sAssertCount = oElement.property.assKeyMatchingCount;
        var aReturnCodeSimple = [];

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
                var sAssertCode = oAssertSpec.assert();
                sAddCode += sAssertCode;

                aReturnCodeSimple.push({
                    assertType: oAssert.operatorType,
                    assertLocation: sAssertCode,
                    assertValue: oAssert.criteriaValue
                });

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
            assertType: sAssertType,
            assertMsg: sAssertMsg,
            assertCode: aReturnCodeSimple,
            assertMatchingCount: sAssertCount,
            assertScope: oAssertLocalScope
        }
    };

    TestDetails.prototype._getSelectorToJSONStringRec = function (oObject) {
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

    TestDetails.prototype._getSelectorToJSONString = function (oObject) {
        this._oJSRegex = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/; //this is not perfect - we are working with predefined names, which are not getting "any" syntax though
        return "{ " + this._getSelectorToJSONStringRec(oObject) + " }";
    };

    TestDetails.prototype._getOPACodeFromItem = function (oElement) {
        var sCode = "";
        var aCode = [];

        var oSelector = oElement.selector;
        var sType = oElement.property.type; // SEL | ACT | ASS
        var sActType = oElement.property.actKey; //PRS|TYP

        //(1) first: build up the actual selector
        var sSelectorAttributes = "";

        sSelectorAttributes = oSelector.selectorAttributesStringified;
        var sSelectorFinal = sSelectorAttributes;
        if (!oElement.item.viewProperty.localViewName) {
            oElement.item.viewProperty.localViewName = "Unknown";
        }
        var sCurrentPage = oElement.item.viewProperty.localViewName;
        sCurrentPage = "onThe" + sCurrentPage + "Page";

        var sAction = "";
        if (sType === 'ACT') {
            sCode = "When." + sCurrentPage + ".";
            switch (sActType) {
                case "PRS":
                    sAction = "iPressElement";
                    break;
                case "TYP":
                    sAction = "iPressElement";
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
            if (oElement.assertion.assertType === "ATTR") {
                for (var i = 0; i < oElement.assertion.assertCode.length; i++) {
                    var oAss = oElement.assertion.assertCode[i];

                    // we could make 100 of mock methods here to make that more OPA style.. but...ya..
                    sCode = "Then." + sCurrentPage + ".theExpactationIs(" + sSelectorFinal + ",'" + oAss.assertLocation + "','" + oAss.assertType + "',";

                    if (typeof oAss.assertValue === "boolean") {
                        sCode += oAss.assertValue;
                    } else if (typeof oAss.assertValue === "number") {
                        sCode += oAss.assertValue;
                    } else {
                        sCode += '"' + oAss.assertValue + '"';
                    }
                    sCode += ");"

                    aCode.push(sCode);
                }
            } else if (oElement.assertion.assertType === "EXS") {
                sCode = "Then." + sCurrentPage + ".theElementIsExisting(" + sSelectorFinal + ");"
                aCode = [sCode];
            } else if (oElement.assertion.assertType === "MTC") {
                sCode = "Then." + sCurrentPage + ".theElementIsExistingNTimes(" + sSelectorFinal + "," + oElement.assertion.assertMatchingCount + ");"
                aCode = [sCode];
            }
        }

        return aCode;
    };

    TestDetails.prototype.onDeleteStep = function (oEvent) {
        var aItem = oEvent.getSource().getBindingContext("navModel").getPath().split("/");
        var sNumber = parseInt(aItem[aItem.length - 1], 10);
        var aElements = this.getModel("navModel").getProperty("/elements");
        aElements.splice(sNumber, 1);
        this.getModel("navModel").setProperty("/elements", aElements);
    };

    TestDetails.prototype.onReplayAll = function (oEvent) {
        var sUrl = this._oModel.getProperty("/codeSettings/testUrl");
        chrome.tabs.create({
            url: sUrl,
            active: true
        }, function (tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'normal',
                focused: true
            }, function (oWindow) {
                RecordController._sTabId = tab.id;
                Communication._sTabId = tab.id;
                Communication._oWindowId = oWindow.id;
                RecordController.initializePromises();
                RecordController._injectIntoTab(tab.id, sUrl);
                RecordController._oInitializedPromise.then(function () {
                    debugger;
                });

            }.bind(this));
        }.bind(this));
    };

    TestDetails.prototype.onEditStep = function (oEvent) {
        //var oItem = oEvent.getSource().getBindingContext("navModel").getObject();
        //this._onItemSelected( oItem.item );
    };

    TestDetails.prototype._getCodeFromItem = function (oElement) {
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

            if (sActType === "TYP" && oElement.property.selectActInsert.length === 0) {
                //there is no native clearing.. :-) we have to select the next and press the delete key.. yeah
                //we do not have to check "replace text" - empty text means ALWAYS replace
                sCode = "await t.selectText(" + sSelectorFinal + ");";
                aCode = [sCode];
                sCode = "await t.pressKey('delete');"
                aCode.push(sCode);
            } else {
                sCode = sCode + sAction + "(" + sSelectorFinal;
                if (sActType == "TYP") {
                    sCode = sCode + ',"' + oElement.property.selectActInsert + '"';
                    if (oElement.property.actionSettings.pasteText === true || oElement.property.actionSettings.testSpeed !== 1 || oElement.property.actionSettings.replaceText === true) {
                        sCode += ", { paste: " + oElement.property.actionSettings.pasteText + ", speed: " + oElement.property.actionSettings.testSpeed + ", replace: " + oElement.property.actionSettings.replaceText + " }"
                    }
                }
                sCode = sCode + ");";
                aCode = [sCode];
            }
        } else if (sType === 'ASS') {
            for (var i = 0; i < oElement.assertion.code.length; i++) {
                sCode = "await t." + "expect(" + sSelectorFinal + oElement.assertion.code[i] + ";";
                aCode.push(sCode);
            }
        }

        if (oElement.property.actionSettings.blur) {
            aCode.push('await t.click(Selector(".sapUiBody"));'); //this is just a dummy.. a utils method fireing a "blur" would be better..
        }

        return aCode;
    };

    TestDetails.prototype.onUpdatePreview = function () {
        this._updatePreview();
    };

    TestDetails.prototype.showCode = function (sId) {
        this._bShowCodeOnly = true;
    };


    TestDetails.prototype._lengthStatusFormatter = function (iLength) {
        return "Success";
    };

    return TestDetails;
});