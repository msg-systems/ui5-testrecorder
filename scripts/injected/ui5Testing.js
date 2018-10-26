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
            assKey: "ATR",
            assKeyMatchingCount: 1,
            assertMessage: "",
            showTargetElement: true,
            selectItemBy: "UI5",
            previewCode: "",
            completeCode: "",
            completeCodeSaved: "",
            selectActInsert: "",
            type: "SEL",
            idQualityState: ValueState.None,
            idQualityStateText: "",
            actKey: "PRS",
            codeLines: [], //currently maintained code-lines
            identifiedElements: [], //elements which are fitting to the current selector
            assertFilter: [], //table entries of asserts
            attributeFilter: [], //table entries of selectors
            item: {} //current item itself
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

    TestHandler.prototype._onSave = function () {
        this._checkAndDisplay(function () {
            var oItem = this._oModel.getProperty("/item");
            var sCodeCurrent = this._getCodeFromItem(oItem);
            var sCodeTotal = this._oModel.getProperty("/completeCodeSaved");
            sCodeTotal = sCodeTotal + sCodeCurrent + "\n";
            this._oModel.setProperty("/completeCodeSaved", sCodeTotal);
            this._oModel.setProperty("/previewCode", "");
            this._oDialog.close();

            this._executeAction(oItem);
        }.bind(this));
    };

    TestHandler.prototype._getFinalDomNode = function (oElement) {
        var sActType = this._oModel.getProperty("/actKey"); //PRS|OPT|TYP
        var sSelectType = this._oModel.getProperty("/selectItemBy"); //DOM | UI5 | ATTR
        var sExtension = this._getSelectorExtension(oElement.control, sActType, sSelectType);
        if (!sExtension.length) {
            return $(oElement.dom);
        }

        return $("#" + (oElement.dom.id + sExtension));
    };

    TestHandler.prototype._executeAction = function () {
        var sType = this._oModel.getProperty("/type");
        if (sType !== "ACT") {
            return false;
        }
        var sActType = this._oModel.getProperty("/actKey"); //PRS|OPT|TYP

        var aFound = this._getFoundElements();
        if (aFound.length === 0) {
            return false;
        }

        var oItem = aFound[0];
        if (!oItem.dom) {
            return false;
        }
        var oDom = this._getFinalDomNode(oItem);

        if (sActType === "PRS" || sActType === "OPT") {
            oDom.trigger("tap");
        } else if (sActType === "TYP") {
            var e = jQuery.Event("keypress");
            e.which = 13; // Enter
            oDom.val(this._oModel.getProperty("/selectActInsert"));
            oDom.trigger(e);
        }
    };

    //check if the data entered seems to be valid.. following checks are performed
    //(1) ID is used and generated
    //(2) ID is used and cloned
    //(3) DOM-ID is used (should be avoided where possible)
    //(4) No or >1 Element is selected..
    TestHandler.prototype._checkAndDisplay = function (fnCallback) {
        var oItem = this._oModel.getProperty("/item");
        var bShowMessage = false;
        var sSelectType = this._oModel.getProperty("/selectItemBy");
        var sType = this._oModel.getProperty("/type");
        var sMessage = "";
        var sExpectedCount = this._oModel.getProperty("/assKeyMatchingCount");
        if (oItem.identifier.idGenerated == true && sSelectType === "UI5") {
            sMessage = "You are probably using a generated ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors.";
            bShowMessage = true;
        } else if (oItem.identifier.idCloned === true && sSelectType === "UI5") {
            sMessage = "You are probably using a cloned ID which will be unstable.\nPlease provide a static id if possible, or use attribute Selectors.";
            bShowMessage = true;
        }
        var aFound = this._getFoundElements();
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

        if (bShowMessage === true) {
            MessageBox.show(sMessage, {
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

    TestHandler.prototype._getSelectorExtension = function (oItem, sActionType, sSelectionType) {
        var oMetadata = oItem.getMetadata();
        while (oMetadata) {
            if (!oMetadata._sClassName) {
                break;
            }
            var oType = this._oElementMix[oMetadata._sClassName];
            if (!oType) {
                oMetadata = oMetadata.getParent();
                continue;
            }

            var oExtension = oType[sActionType];
            if (oExtension) {
                if (sSelectionType === "DOM") {
                    return oExtension.domChildWith;
                } else if (sSelectionType === "UI5") {
                    return oExtension.domChildWith;
                } else if (sSelectionType === "ATTR") {
                    return {
                        identifier: {
                            ui5ChildDomId: oExtension.domChildWith
                        }
                    }
                }
                return "";
            }
            oMetadata = oMetadata.getParent();
        }
        return "";
    };

    TestHandler.prototype._updatePreview = function () {
        var oItem = this._oModel.getProperty("/item");

        //(1) update code
        var sCode = this._getCodeFromItem(oItem);
        var sCodeTotal = this._oModel.getProperty("/completeCodeSaved");
        sCodeTotal = sCodeTotal + sCode;
        this._oModel.setProperty("/previewCode", sCodeTotal);

        //(2) update items..
        this._oModel.setProperty("/identifiedElements", this._getFoundElements());
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

    TestHandler.prototype._getFoundElements = function () {
        var oDefinition = this._getSelectorDefinition();
        var aItems = this._findItemAndExclude(oDefinition.selectorAttributes);
        var aItemsEnhanced = [];
        for (var i = 0; i < aItems.length; i++) {
            aItemsEnhanced.push(this._getElementInformation(aItems[i], aItems[i].getDomRef()));
        }
        return aItemsEnhanced;
    };

    TestHandler.prototype._getSelectorDefinition = function () {
        var oScope = {};
        var sSelector = "";
        var sSelectorAttributes = "";
        var sSelectorAttributesStringified = null;
        var oItem = this._oModel.getProperty("/item");
        var sActType = this._oModel.getProperty("/actKey"); //PRS|OPT|TYP
        var sSelectType = this._oModel.getProperty("/selectItemBy"); //DOM | UI5 | ATTR
        var sSelectorExtension = this._getSelectorExtension(oItem.control, sActType, sSelectType);

        if (sSelectType === "DOM") {
            sSelector = "Selector";
            sSelectorAttributes = '"#' + this._oModel.getProperty("/item/identifier/domId") + sSelectorExtension + '"';
        } else if (sSelectType === "UI5") {
            sSelector = "UI5Selector";
            sSelectorAttributes = '"' + this._oModel.getProperty("/item/identifier/ui5Id") + sSelectorExtension + '"';
        } else if (sSelectType === "ATTR") {
            sSelector = "UI5Selector";
            var aAttributes = this._oModel.getProperty("/attributeFilter");
            if (sSelectorExtension) {
                $.extend(oScope, true, sSelectorExtension);
            }

            for (var i = 0; i < aAttributes.length; i++) {
                var oAttribute = aAttributes[i];
                var oLocalScope = this._attributeTypes[oAttribute.attributeType].getScope(oScope);
                var oSpec = this._getValueSpec(oAttribute);
                if (oSpec === null) {
                    continue;
                }
                //extent the current local scope with the code extensions..
                $.extend(oLocalScope, true, oSpec.code(oAttribute.criteriaValue));
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

    TestHandler.prototype._getCodeFromItem = function (oItem) {
        var sType = this._oModel.getProperty("/type"); // SEL | ACT | ASS
        var sActType = this._oModel.getProperty("/actKey"); //PRS|OPT|TYP
        var sCode = "";

        //(1) first: build up the actual selector
        var sSelector = "";
        var sSelectorAttributes = "";

        var oSelector = this._getSelectorDefinition();
        sSelector = oSelector.selector;
        sSelectorAttributes = oSelector.selectorAttributesStringified;
        var sSelectorFinal = sSelector + "(" + sSelectorAttributes + ")";

        var sAction = "";
        if (sType === "SEL") {
            sCode = "await " + sSelectorFinal + ";";
        } else if (sType === 'ACT') {
            sCode = "await t.";
            switch (sActType) {
                case "PRS":
                    sAction = "click";
                    break;
                case "OPT":
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
                sCode = sCode + ',"' + this._oModel.getProperty("/selectActInsert") + '"';
            }
            sCode = sCode + ");";
        } else if (sType === 'ASS') {
            //we must add one line per basic code..
            var aAsserts = this._oModel.getProperty("/assertFilter");
            var oAssertScope = {};

            var sBasisCode = "await t.expect(" + sSelectorFinal;
            var sAssertType = this._oModel.getProperty("/assKey");
            var sAssertMsg = this._oModel.getProperty("/assertMessage");
            var sAssertCount = this._oModel.getProperty("/assKeyMatchingCount");
            if (sAssertType === 'ATR') {
                sBasisCode += ".getUI5(" + "({ element }) => element.";
                for (var x = 0; x < aAsserts.length; x++) {
                    oAssertScope = {}; //reset per line..
                    var oAssert = aAsserts[x];
                    var oAssertLocalScope = this._attributeTypes[oAssert.attributeType].getAssertScope(oAssertScope);
                    var oAssertSpec = this._getValueSpec(oAssert);
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
                        sAddCode += "'," + '"' + sAssertMsg + '"';
                    }
                    sAddCode += ");";
                    sCode += sAddCode + "\n";
                    $.extend(oAssertLocalScope, true, oAssertSpec.assert(oAssert.criteriaValue));
                }
            } else if (sAssertType === "EXS") {
                sCode = sBasisCode + ".exists).ok(";
                if (sAssertMsg !== "") {
                    sCode += '"' + sAssertMsg + '"';
                }
                sCode += ");";
            } else if (sAssertType === "MTC") {
                sCode = sBasisCode + ".count).eql(" + parseInt(sAssertCount, 10) + "";
                if (sAssertMsg !== "") {
                    sCode += "," + '"' + sAssertMsg + '"';
                }
                sCode += ");";
            }
        }
        return sCode;
    };

    TestHandler.prototype._getValueSpec = function (oLine) {
        var aCriteriaSettings = this._criteriaTypes[oLine.criteriaType].criteriaSpec(oLine.item);
        for (var j = 0; j < aCriteriaSettings.length; j++) {
            if (aCriteriaSettings[j].subCriteriaKey === oLine.subCriteriaType) {
                return aCriteriaSettings[j];
            }
        }
        return null;
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
            if (oParent.getController && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                break;
            }
            oParent = oParent.getParent();
        }
        if (!sCurrentComponent.length) {
            return "";
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
        this._updatePreview();
    };

    TestHandler.prototype._setItem = function (oControl, oDomNode) {
        var oItem = this._getElementInformation(oControl, oDomNode);
        if (this._oCurrentDomNode) {
            $(this._oCurrentDomNode).removeClass('HVRReveal');
        }
        this._oCurrentDomNode = oDomNode;
        if (this._oCurrentDomNode) {
            $(this._oCurrentDomNode).addClass('HVRReveal');
        }

        this._oModel.setProperty("/item", oItem);
        this._oModel.setProperty("/attributeFilter", []);
        this._oModel.setProperty("/assertFilter", []);

        this._updateValueState(oItem);
        this._updatePreview();
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
        this._add("/attributeFilter");
    };

    TestHandler.prototype.onRemoveAttribute = function (oEvent) {
        var aContext = sap.ui.core.Fragment.byId("testDialog", "idAttributeTable").getSelectedContexts();
        this._remove(aContext);
    };

    TestHandler.prototype.onRemoveAssertion = function (oEvent) {
        var aContext = sap.ui.core.Fragment.byId("testDialog", "idAssertionTable").getSelectedContexts();
        this._remove(aContext);
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

    TestHandler.prototype._add = function (sPath) {
        var aAttributes = this._oModel.getProperty(sPath);
        aAttributes.push({
            attributeType: "OWN",
            criteriaTypes: [],
            criteriaType: "",
            criteriaValue: "",
            operatorType: "EQ"
        });
        this._oModel.setProperty(sPath, aAttributes);
        this._updateAttributeTypes(this._oModel.getContext(sPath + "/" + (aAttributes.length - 1)));
        this._updatePreview();
    };

    TestHandler.prototype.onAddAssertion = function (oEvent) {
        this._add("/assertFilter");
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
                fragmentName: "testDialog"
            }, this);
            this._oDialog.setModel(this._oModel, "viewModel");
            this._oDialog.attachBeforeClose(null, function () {
                if (this._oCurrentDomNode) {
                    $(this._oCurrentDomNode).removeClass('HVRReveal');
                }
                $(".HVRReveal").removeClass('HVRReveal');

                if (this._bStarted === true) {
                    this._start();
                }
            }.bind(this));
        }
    };
    TestHandler.prototype.onClick = function (oDomNode) {
        var oControl = this._getControlFromDom(oDomNode);
        if (!oControl) {
            return;
        }
        $(oDomNode).addClass('HVRReveal');

        this._createDialog();

        this._oModel.setProperty("/assKey", "ATR");
        this._oModel.setProperty("/assKeyMatchingCount", 1);
        this._oModel.setProperty("/assertMessage", "");
        this._oModel.setProperty("/selectItemBy", "UI5");
        this._oModel.setProperty("/previewCode", "");
        this._oModel.setProperty("/selectActInsert", "");
        this._oModel.setProperty("/type", "ACT");
        this._oModel.setProperty("/actKey", "PRS");
        this._oModel.setProperty("/showTargetElement", true);

        this._setItem(oControl, oDomNode);
        this._oDialog.open();
    };

    TestHandler.prototype.switch = function () {
        this._bActive = this._bActive !== true;
        this._bStarted = this._bActive;
    };

    TestHandler.prototype._start = function () {
        this._bActive = true;
        this._bStarted = true;
    };
    TestHandler.prototype._stop = function () {
        this._bActive = false;
        this._bStarted = false;
    };

    TestHandler.prototype.showCode = function (sId) {
        this._bActive = false;
        this._oModel.setProperty("/showTargetElement", false);
        this._oModel.setProperty("/previewCode", this._oModel.getProperty("/completeCodeSaved"));
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
    };

    TestHandler.prototype._updateAttributeTypes = function (oCtx) {
        var oAttribute = this._oModel.getProperty(oCtx.getPath());
        var oAttributeSettings = this._attributeTypes[oAttribute.attributeType];
        oAttribute.item = oAttributeSettings.getItem(this._oModel.getProperty("/item"));
        oAttribute.criteriaTypes = oAttributeSettings.criteriaTypes;
        oAttribute.criteriaType = oAttribute.criteriaTypes[0].criteriaKey;
        this._oModel.setProperty(oCtx.getPath(), oAttribute);

        this._updateCriteriaType(oCtx);
    };

    TestHandler.prototype._updateCriteriaType = function (oCtx) {
        var oAttribute = this._oModel.getProperty(oCtx.getPath());
        var aSubCriteriaSettings = this._criteriaTypes[oAttribute.criteriaType].criteriaSpec(oAttribute.item);

        oAttribute.subCriteriaTypes = aSubCriteriaSettings;
        if (oAttribute.subCriteriaTypes.length > 0) {
            oAttribute.subCriteriaType = aSubCriteriaSettings[0].subCriteriaKey;
        } else {
            oAttribute.subCriteriaType = "";
        }

        this._oModel.setProperty(oCtx.getPath(), oAttribute);

        this._updateSubCriteriaType(oCtx);
    };

    TestHandler.prototype._updateSubCriteriaType = function (oCtx) {
        var oAttribute = this._oModel.getProperty(oCtx.getPath());

        //we need to initialize the default value, based on the subCriteriaType
        var aCriteriaSettings = this._criteriaTypes[oAttribute.criteriaType].criteriaSpec(oAttribute.item);
        for (var i = 0; i < aCriteriaSettings.length; i++) {
            if (aCriteriaSettings[i].subCriteriaKey === oAttribute.subCriteriaType) {
                oAttribute.criteriaValue = aCriteriaSettings[i].value(oAttribute.item);
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
                        continue;
                    }
                    return this._getElementInformation(oItem, oItem.getDomRef());
                }
            }
            oItem = oItem.getParent();
        }
        return null;
    };

    TestHandler.prototype._getCriteriaTypes = function () {
        this._criteriaTypes = {
            "ID": {
                criteriaKey: "ID",
                criteriaText: "Identifier",
                criteriaSpec: function () {
                    return [{
                        subCriteriaKey: "ID",
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
                        subCriteriaKey: "LID",
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
                        subCriteriaKey: "ELM",
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
                            subCriteriaKey: oAggregation.name + "/" + "length",
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
                        for (var sProperty in oItem.context[sModel].object) {
                            if (sProperty === "__metadata") {
                                continue;
                            }
                            aReturn.push({
                                subCriteriaKey: sModel + "/" + sProperty,
                                subCriteriaText: sModel + "/" + sProperty,
                                code: function (sModel, sProperty, sValue) {
                                    var oReturn = { context: {} };
                                    oReturn.context[sModel] = { object: {} };
                                    oReturn.context[sModel].object[sProperty] = sValue;
                                    return oReturn;
                                }.bind(this, sModel, sProperty),
                                value: function (sModel, sProperty, oItem) {
                                    return oItem.context[sModel].object[sProperty];
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
                        var oType = this._oElementModelValues[oMetadata._sClassName];
                        if (oType) {
                            for (var sModel in oType) {
                                if (!oItem.getModel(sModel)) {
                                    continue;
                                }

                                for (var sProperty in oType[sModel]) {
                                    var sPropertyValue = oItem.getModel(sModel).getProperty(sProperty);
                                    if (typeof sPropertyValue === "undefined") {
                                        continue;
                                    }

                                    aReturn.push({
                                        subCriteriaKey: sModel + "/" + sProperty,
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
                            subCriteriaKey: sProperty,
                            subCriteriaText: sProperty,
                            code: function (sProperty, sValue) {
                                var oReturn = { property: {} };
                                oReturn.property[sProperty] = sValue;
                                return oReturn;
                            }.bind(this, sProperty),
                            value: function (subCriteriaKey, oItem) {
                                return oItem.property[subCriteriaKey];
                            }.bind(this, sProperty),
                            assert: function (subCriteriaKey) {
                                return "property." + subCriteriaKey;
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
            }
        };

        this._oElementModelValues = {
            "sap.m.GenericTile": {
                "undefined": {
                    "/config/navigation_semantic_action": "Navigation-Semantic Action",
                    "/config/navigation_semantic_object": "Navigation-Semantic Object",
                    "/config/navigation_semantic_parameters": "Navigation-Semantic Paramters",
                    "/config/navigation_target_url": "Navigation-Semantic URL",
                }
            }
        };

        this._oElementMix = {
            "sap.m.ComboBox": {
                "OPT": {
                    domChildWith: "-arrow"
                }
            },
            "sap.m.MultiComboBox": {
                "OPT": {
                    domChildWith: "-arrow"
                }
            },
            "sap.m.Select": {
                "OPT": {
                    domChildWith: "-arrow"
                }
            },
            "sap.m.InputBase": {
                "TYP": {
                    domChildWith: "-inner"
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

        if (typeof id !== "string") {
            if (JSON.stringify(id) == JSON.stringify({})) {
                return [];
            }

            //on purpose implemented as local methods
            //this is not readable, but is a easy approach to transform those methods to the UI5Selector Stack (one single method approach)
            var _getParentWithDom = function (oItem, iCounter, bViewOnly) {
                oItem = oItem.getParent();
                while (oItem && oItem.getParent) {
                    if (oItem.getDomRef && oItem.getDomRef()) {
                        if (bViewOnly === true && !oItem.getViewData) {
                            oItem = oItem.getParent();
                            continue;
                        }
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

            var _getUi5Id = function (oItem) {
                //remove all component information from the control
                var oParent = oItem;
                var sCurrentComponent = "";
                while (oParent && oParent.getParent) {
                    if (oParent.getController && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                        sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                        break;
                    }
                    oParent = oParent.getParent();
                }
                if (!sCurrentComponent.length) {
                    return sId;
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
                }
                if (id.identifier) {
                    if (id.identifier.ui5Id && id.identifier.ui5Id !== _getUi5Id(oItem)) {
                        return false;
                    }
                    if (id.identifier.ui5LocalId && id.identifier.ui5LocalId !== _getUi5LocalId(oItem)) {
                        return false;
                    }
                }
                if (id.model) {
                    for (var sModel in id.model) {
                        if (!oItem.getModel(sModel)) {
                            return false;
                        }
                        for (var sProperty in id.model[sModel]) {
                            if (oItem.getModel(sModel).getProperty(sProperty) !== id.model[sModel][sProperty]) {
                                return false;
                            }
                        }
                    }
                }

                if (id.aggregation) {
                    for (var sAggregation in id.aggregation) {
                        if (!oItem.getAggregation(sAggregation)) {
                            bFound = false;
                        } else if (oItem.getAggregation(sAggregation).length !== id.aggregation[sAggregation].length) {
                            bFound = false;
                        }
                        if (bFound === false) {
                            return false;
                        }
                    }
                }
                if (id.context) {
                    for (var sModel in id.context) {
                        var oCtx = oItem.getBindingContext(sModel);
                        if (!oCtx) {
                            return false;
                        }
                        var oObjectCompare = oCtx.getObject();
                        if (!oObjectCompare) {
                            return false;
                        }
                        var oObject = id.context[sModel].object;
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

            //search for identificaton of every single object..
            var bFound = false;
            for (var sElement in aElements) {
                var oItem = aElements[sElement];
                bFound = true;
                bFound = _checkItem(oItem, id);
                //check parent levels..
                if (id.parent) {
                    bFound = bFound && _checkItem(_getParentWithDom(oItem, 1), id.parent);
                }
                if (id.view) {
                    bFound = bFound && _checkItem(_getParentWithDom(oItem, 1, true), id.view);
                }
                if (id.parentL2) {
                    bFound = bFound && _checkItem(_getParentWithDom(oItem, 2), id.parentL2);
                }
                if (id.parentL3) {
                    bFound = bFound && _checkItem(_getParentWithDom(oItem, 3), id.parentL3);
                }
                if (id.parentL4) {
                    bFound = bFound && _checkItem(_getParentWithDom(oItem, 4), id.parentL4);
                }

                if (bFound === false) {
                    continue;
                }

                if (!oItem.getDomRef()) {
                    continue;
                }

                var aCurItems = $("#" + oItem.getDomRef().id);
                if (aItem) {
                    aItem = aItem.add(aCurItems);
                } else {
                    aItem = aCurItems;
                }
                if (aItem.length >= 10) {
                    break; //early exit
                }
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
        return aItem.control();
    };


    TestHandler.prototype._getElementInformation = function (oItem, oDomNode) {
        var oReturn = {
            property: {},
            aggregation: [],
            association: {},
            context: {},
            metadata: {},
            identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
            parents: [],
            children: [],
            control: null,
            dom: null
        };

        if (!oItem) {
            return oReturn;
        }

        //externalize
        var _oElementModelValues = {
            "sap.m.GenericTile": {
                "undefined": {
                    "/config/navigation_semantic_action": "Navigation-Semantic Action",
                    "/config/navigation_semantic_object": "Navigation-Semantic Object",
                    "/config/navigation_semantic_parameters": "Navigation-Semantic Paramters",
                    "/config/navigation_target_url": "Navigation-Semantic URL",
                }
            }
        };

        //local methods on purpose (even if duplicated) (see above)
        var _getUi5LocalId = function (oItem) {
            var sId = oItem.getId();
            if (sId.lastIndexOf("-") !== -1) {
                return sId.substr(sId.lastIndexOf("-") + 1);
            }
            return sId;
        };

        var _getUi5Id = function (oItem) {
            //remove all component information from the control
            var oParent = oItem;
            var sCurrentComponent = "";
            while (oParent && oParent.getParent) {
                if (oParent.getController && oParent.getController().getOwnerComponent && oParent.getController().getOwnerComponent()) {
                    sCurrentComponent = oParent.getController().getOwnerComponent().getId();
                    break;
                }
                oParent = oParent.getParent();
            }
            if (!sCurrentComponent.length) {
                return "";
            }

            var sId = oItem.getId();
            sCurrentComponent = sCurrentComponent + "---";
            if (sId.lastIndexOf(sCurrentComponent) !== -1) {
                return sId.substr(sId.lastIndexOf(sCurrentComponent) + sCurrentComponent.length);
            }
            return sId;
        };

        //missing: get elements with same parent, to get elements "right next", "left" and on same level
        var fnGetContexts = function (oItem) {
            //first, identify all models, which are theoretically available, via oItem.oModels
            var oReturn = {};

            if (!oItem) {
                return oReturn;
            }

            var oModel = {};
            oModel = $.extend(oModel, true, oItem.oModels);
            oModel = $.extend(oModel, true, oItem.oPropagatedProperties.oModels);

            //second, get all binding contexts
            for (var sModel in oModel) {
                var oBindingContext = oItem.getBindingContext(sModel === "undefined" ? undefined : sModel);
                if (!oBindingContext) {
                    continue;
                }

                oReturn[sModel] = {
                    path: oBindingContext.getPath(),
                    object: oBindingContext.getObject()
                };
            }
            return oReturn;
        };

        var fnGetElementInformation = function (oItem, oDomNode) {
            var oReturn = {
                property: {},
                aggregation: [],
                association: {},
                context: {},
                metadata: {},
                identifier: { domId: "", ui5Id: "", idCloned: false, idGenerated: false, ui5LocalId: "", ui5AbsoluteId: "" },
                control: null,
                dom: null
            };

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

            //get metadata..
            oReturn.metadata = {
                elementName: oItem.getMetadata().getElementName()
            };

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
                        ui5Control: aAggregation[i]
                    });
                }
                oReturn.aggregation[oAggregationInfo.name] = oAggregationInfo;
            }

            return oReturn;
        };

        oReturn = $.extend(oReturn, true, fnGetElementInformation(oItem, oDomNode));

        //get all parents, and attach the same information in the same structure
        var oParent = oItem.getParent();
        while (oParent) {
            if (oParent.getDomRef && oParent.getDomRef()) {
                oReturn.parents.push(fnGetElementInformation(oParent, oParent.getDomRef()));
            }
            oParent = oParent.getParent();
        }

        return oReturn;
    };

    var TestHandlerSingleton = new TestHandler();
    // Listens for event from injected script
    document.addEventListener('do-ui5-send-xml-view', function (oXMLEvent) {
        TestHandlerSingleton.init(oXMLEvent.detail);
        MessageToast.show("Testing Framework Initialized...");
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

    return TestHandlerSingleton;
});