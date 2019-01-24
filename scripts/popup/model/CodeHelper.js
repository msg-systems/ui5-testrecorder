sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel",
    "com/ui5/testing/model/OPA5CodeStrategy"
], function (UI5Object, JSONModel, OPA5CodeStrategy) {
    "use strict";

    var CodeHelper = UI5Object.extend("com.ui5.testing.model.CodeHelper", {
        constructor: function () {
            this._oModel = new JSONModel();
        }
    });

    CodeHelper.prototype.getFullCode = function (oCodeSettings, aElements) {
        this._oModel.setProperty("/codeSettings", oCodeSettings);
        if (oCodeSettings.language === "OPA") {
            return this._opaGetCode(oCodeSettings, aElements);;
        } else if (oCodeSettings.language === "TCF") {
            return this._testCafeGetCode(aElements);
        } else if (oCodeSettings.language === "UI5") {
            return this._ui5GetCode(aElements);
        }
        return "";
    };

    CodeHelper.prototype.getItemCode = function (sCodeLanguage, oElement) {
        if (sCodeLanguage === "OPA") {
            return this._getOPACodeFromItem(oElement);
        } else if (sCodeLanguage === "TCF") {
            return this._getCodeFromItem(oElement);
        } else if (sCodeLanguage === "UI5") {
            return this._getUI5CodeFromItem(oElement);
        }
        return [];
    };

    CodeHelper.prototype._ui5GetCode = function (aElements) {
        var aCodes = [];
        var bSupportAssistant = this._oModel.getProperty("/codeSettings/supportAssistant");

        //for testcafe we are returning: (1) installation instructions..
        var oCodeInstall = {
            codeName: "Installation (Non WebIDE)",
            type: "FTXT",
            order: 3,
            code: "<h3>Installation</h3>" +
                "<p>Execute the following command-line paramters:</p>" +
                "<code>npm install @ui5/uiveri5 -g</code>" +
                "<p>Create a new folder \"test\\e2e\"within your webapp folder</p>" +
                "<h3>Test-Configuration</h3>" +
                "<p>Write a configuration file (conf.js), and copy over the code (if not existing already)</p>" +
                "<h3>Create Test</h3>" +
                "<p>Write a test.spec.js file, and copy over the code.</p>" +
                "<h3>Running</h3>" +
                "<p>Run via Command-Line via: <code>uiveri5</code><br/>" +
                "For all details, please see the official github repository <a href=\"https://github.com/SAP/ui5-uiveri5\" style=\"color:green; font-weight:600;\">ui5-uiveri5</a></p>"
        }
        aCodes.push(oCodeInstall);

        //(2) configuration.js
        var oCodeSettings = this._oModel.getProperty("/codeSettings");
        var oCodeTest = {
            codeName: "conf.js",
            type: "CODE",
            order: 2
        };
        var sCodeConf = "exports.config = {\n";
        sCodeConf += "  profile: 'integration',\n";
        sCodeConf += "  baseUrl: '" + oCodeSettings.testUrl + "'\n";
        sCodeConf += "};";
        oCodeTest.code = sCodeConf;
        aCodes.push(oCodeTest);


        //(3) execute script
        var oCodeSpec = {
            codeName: "test.spec.js",
            type: "CODE",
            order: 1
        };
        var sCode = "";
        var oCodeSettings = this._oModel.getProperty("/codeSettings");
        var aCluster = this._groupCodeByCluster(aElements);

        sCode += "describe('test' , function () {\n";
        sCode += "\n";

        //make the rest of the OPA calls..
        for (var i = 0; i < aCluster.length; i++) {
            var aLines = [];
            sCode += "    it('Test " + i + "', function () {\n";
            for (var j = 0; j < aCluster[i].length; j++) {
                var oElement = aCluster[i][j];

                if (oElement.property.type !== "SUP") {
                    aLines = this._getUI5CodeFromItem(oElement);
                }

                for (var x = 0; x < aLines.length; x++) {
                    sCode += "        " + aLines[x] + "\n";
                }
            }

            sCode += "    });\n";
        }

        sCode += "\n});";


        oCodeSpec.code = sCode;
        aCodes.push(oCodeSpec);
        return aCodes;
    };


    CodeHelper.prototype._getSelectorToJSONStringRec = function (oObject) {
        var sStringCurrent = "";
        var bFirst = true;
        var bIsRegex = false;
        for (var s in oObject) {
            var obj = oObject[s];
            if (!bFirst) {
                sStringCurrent += ", ";
            }
            bIsRegex = false;
            bFirst = false;
            if (obj && obj.__isRegex && obj.__isRegex === true) {
                obj = obj.id;
                bIsRegex = true;
            }
            if (Array.isArray(obj)) {
                sStringCurrent += s + ":" + "[";
                for (var i = 0; i < obj.length; i++) {
                    if (i > 0) {
                        sStringCurrent += ",";
                    }
                    if (typeof obj[i] === "object") {
                        sStringCurrent += "{ ";
                        sStringCurrent += this._getSelectorToJSONStringRec(obj[i]);
                        sStringCurrent += " }";
                    } else {
                        sStringCurrent += this._getSelectorToJSONStringRec(obj[i]);
                    }
                }
                sStringCurrent += "]";
            } else if (typeof obj === "object") {
                sStringCurrent += s + ": { ";
                sStringCurrent += this._getSelectorToJSONStringRec(obj);
                sStringCurrent += " }";
            } else {
                if (this._oJSRegex.test(s) === false && bIsRegex === false) {
                    s = '"' + s + '"';
                }
                sStringCurrent += s;
                sStringCurrent += " : ";
                if (typeof obj === "boolean" || bIsRegex === true) {
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

    CodeHelper.prototype._getSelectorToJSONString = function (oObject) {
        this._oJSRegex = /^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/; //this is not perfect - we are working with predefined names, which are not getting "any" syntax though
        return "{ " + this._getSelectorToJSONStringRec(oObject) + " }";
    };

    CodeHelper.prototype._getUI5Element = function (oElement, oUI5Selector, oAssert) {
        var sElement = "element";
        var bMulti = false;
        if (oElement.property.type === 'ASS' && (oElement.assertion.assertType === "MTC" || oElement.assertion.assertType === "EXS")) {
            bMulti = true;
        }

        if (oAssert) {
            oElement.property.selectItemBy = "ATTR"; //ids are already ok - no need to adjust..
            oUI5Selector.own = oUI5Selector.own ? oUI5Selector.own : {};
            oUI5Selector.own = $.extend({}, oUI5Selector.own, oAssert.assertUI5Spec);
        }

        if (oElement.property.selectItemBy === "DOM") {
            sElement += "(by.jq('" + oUI5Selector.id + "'))";
        } else if (oElement.property.selectItemBy === "UI5") {
            if (bMulti === true) {
                sElement += ".all(by.";
            } else {
                sElement += "(by.";
            }

            sElement += "control({ id: " + oUI5Selector.own.id;
            if (oUI5Selector.own.interaction) {
                if (oUI5Selector.own.interaction.idSuffix) {
                    sElement += "," + "interaction: { idSuffix : \"" + oUI5Selector.own.interaction.idSuffix + "\" }";
                } else {
                    sElement += "," + "interaction: \"" + oUI5Selector.own.interaction + "\"";
                }
            }
            sElement += "}))";
        } else if (oElement.property.selectItemBy === "ATTR") {
            //go ahead by parentL4, L3, L2, L1 - for "cleaner" code, we will create seperate lines for every single one..
            var sParents = "";
            if (oUI5Selector.parent) {
                sParents = sElement + "(by.control( " + this._getSelectorToJSONString(oUI5Selector.parent) + "))";
            }
            if (oUI5Selector.parentL2) {
                sParents += "." + sElement + "(by.control( " + this._getSelectorToJSONString(oUI5Selector.parentL4) + "))";
            }
            if (oUI5Selector.parentL3) {
                sParents += "." + sElement + "(by.control( " + this._getSelectorToJSONString(oUI5Selector.parentL3) + "))";
            }
            if (oUI5Selector.parentL4) {
                sParents += "." + sElement + "(by.control( " + this._getSelectorToJSONString(oUI5Selector.parentL4) + "))";
            }

            //syntax: element().element().element().all(target_element)
            var sOwnElement = "control( " + this._getSelectorToJSONString(oUI5Selector.own) + "))";
            if (sParents.length && bMulti == true) {
                sElement = sParents + ".all(" + sOwnElement + ")";
            } else if (bMulti === true) {
                sElement = sElement + ".all(by." + sOwnElement;
            } else {
                sElement = sElement + "(by." + sOwnElement;
            }
        }

        return sElement;
    }

    CodeHelper.prototype._getUI5CodeFromItem = function (oElement) {
        var sCode = "";
        var aCode = [];

        //ui5-specific (1): for ui5, we must have a CONSISTENT parent handling (parentl4 is not possible without l3,l2 and l1) - we will simply add the controlType for those missing..
        var oSelector = oElement.selector;
        if (oSelector.selectorUI5.parentL4 && !oSelector.selectorUI5.parentL3) {
            oSelector.selectorUI5.parentL3 = { controlType: oElement.item.parentL3.metadata.elementName };
        }
        if (oSelector.selectorUI5.parentL3 && !oSelector.selectorUI5.parentL2) {
            oSelector.selectorUI5.parentL2 = { controlType: oElement.item.parentL2.metadata.elementName };
        }
        if (oSelector.selectorUI5.parentL2 && !oSelector.selectorUI5.parent) {
            oSelector.selectorUI5.parent = { controlType: oElement.item.parent.metadata.elementName };
        }

        var sType = oElement.property.type; // SEL | ACT | ASS
        var sActType = oElement.property.actKey; //PRS|TYP
        var oUI5Selector = oSelector.selectorUI5;

        //(1) first: build up the actual selector
        var sSelectorAttributes = "";
        var sSelectorFinal = sSelectorAttributes;

        var sDomChildWith = "";
        if (oElement.property.domChildWith.startsWith("-")) {
            sDomChildWith = oElement.property.domChildWith.substr(1);
        } else {
            sDomChildWith = oElement.property.domChildWith;
        }

        var bAddSuffix = false;
        var oInteraction = null;
        if (sType === "ACT" && sDomChildWith.length > 0) {
            oUI5Selector.own = typeof oUI5Selector.own !== "undefined" ? oUI5Selector.own : {};
            oInteraction = {
                interaction: {
                    idSuffix: sDomChildWith
                }
            }
            oUI5Selector.own.interaction = oInteraction.interaction;
            bAddSuffix = true;
        } else {
            if (oElement.defaultInteraction) {
                oUI5Selector.own.interaction = "root";
            }
        }

        var sElement = this._getUI5Element(oElement, oUI5Selector);
        var sAction = "";
        if (sType === 'ACT') {
            sCode = sElement + ".";
            switch (sActType) {
                case "PRS":
                    sAction = "click";
                    break;
                case "TYP":
                    sAction = "sendKeys";
                    break;
                default:
                    return "";
            }

            if (sActType === "TYP" && oElement.property.selectActInsert.length === 0) {
                //there is no native clearing.. :-) we have to select the next and press the delete key.. yeah
                //we do not have to check "replace text" - empty text means ALWAYS replace
                sCode = sElement + ".clear()";
                aCode.push(sCode);
            } else {
                if (sActType === "TYP" && oElement.property.actionSettings.replaceText === true) {
                    sCode = sElement + ".clear()";
                    aCode.push(sCode);
                }

                sCode = sElement + "." + sAction + "(";
                if (sActType == "TYP") {
                    sCode = sCode + "'" + oElement.property.selectActInsert + "'";
                }
                sCode = sCode + ");";
                aCode.push(sCode);
            }
        }

        if (sType === 'ASS') {
            if (oElement.assertion.assertType === "ATTR") {
                for (var i = 0; i < oElement.assertion.assertCode.length; i++) {
                    //everything which is NOT a property, must be moved..
                    var oAss = oElement.assertion.assertCode[i];

                    if (oAss.assertField.type == "property") {
                        sCode = "expect(" + sElement + ".asControl().getProperty(\"" + oAss.assertField.value + "\")).toBe(";

                        if (typeof oAss.assertValue === "boolean") {
                            sCode += oAss.assertValue;
                        } else if (typeof oAss.assertValue === "number") {
                            sCode += oAss.assertValue;
                        } else {
                            sCode += '"' + oAss.assertValue + '"';
                        }
                        sCode += ");"
                    } else {
                        //we are actually searching for "exists" now. we will hand over the attributes we are searching for into the searching handler..
                        var sElementTmp = this._getUI5Element(oElement, oUI5Selector, oAss);
                        sCode = "expect(" + sElementTmp + ".count()).toBeGreaterThan(0);";
                    }

                    aCode.push(sCode);
                }
            } else if (oElement.assertion.assertType === "EXS") {
                sCode = "expect(" + sElement + ".count()).toBeGreaterThan(0);";
                aCode = [sCode];
            } else if (oElement.assertion.assertType === "MTC") {
                sCode = "expect(" + sElement + ".count()).toBe(" + oElement.assertion.assertMatchingCount + ");";
                aCode = [sCode];
            }
        }

        return aCode;
    };

    CodeHelper.prototype._getOPACodeFromItem = function (oElement) {
        /*
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
                    sAction = "iEnterText";
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
        */
        return [new OPA5CodeStrategy().createTestStep(oElement)];
//        return aCode;
    };

    CodeHelper.prototype._testCafeGetCode = function (aElements) {
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

    CodeHelper.prototype._getCodeFromItem = function (oElement) {
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

    CodeHelper.prototype._getFirstComponent = function (aElements) {
        var sFirstPage = "";
        var sFirstComponent = "";
        for (var i = 0; i < aElements.length; i++) {
            if (aElements[i].item.metadata.componentId && sFirstComponent.length === 0) {
                sFirstComponent = aElements[i].item.metadata.componentId;
                sFirstPage = aElements[i].item.viewProperty.localViewName;
                break;
            }
        }

        return {
            page: sFirstPage,
            component: sFirstComponent
        }
    };

    CodeHelper.prototype._groupCodeByCluster = function (aElements) {
        var aCluster = [[]];
        var bNextIsBreak = false;
        var aPages = {};
        for (var i = 0; i < aElements.length; i++) {
            if (bNextIsBreak === true) {
                aCluster.push([]);
                bNextIsBreak = false;
            }
            if (typeof aPages[aElements[i].item.viewProperty.localViewName] === "undefined") {
                aPages[aElements[i].item.viewProperty.localViewName] = {
                    viewName: aElements[i].item.viewProperty.localViewName
                };
            }
            if (i < aElements.length - 1 && aElements[i].property.type === "ASS" && aElements[i + 1].property.type === "ACT") {
                bNextIsBreak = true;
            }
            aCluster[aCluster.length - 1].push(aElements[i]);
        }
        return aCluster;
    }

    CodeHelper.prototype._opaGetCode = function (oCodeSettings, aElements) {
        return new OPA5CodeStrategy().generate(oCodeSettings, aElements, this);
    };

    return new CodeHelper();
});