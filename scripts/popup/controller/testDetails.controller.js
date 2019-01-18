sap.ui.define([
    "com/ui5/testing/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    "com/ui5/testing/model/Navigation",
    "com/ui5/testing/model/Communication",
    "com/ui5/testing/model/RecordController",
    "com/ui5/testing/model/GlobalSettings",
    "com/ui5/testing/model/ExportImport",
    "com/ui5/testing/model/CodeHelper",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessagePopover, MessageItem, Navigation, Communication, RecordController, GlobalSettings, ExportImport, CodeHelper, MessageToast) {
    "use strict";

    var TestDetails = Controller.extend("com.ui5.testing.controller.TestDetails", {
        _oModel: new JSONModel({
            codes: [],
            test: {},
            replayMode: false,
            codeSettings: {
                language: "UI5",
                testName: "",
                testCategory: "",
                testUrl: "",
                supportAssistant: false
            },
            dynamic: {
                attrType: []
            },
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
                ]
            }
        }),
        _bActive: false,
        _iGlobal: 0,
        _bStarted: false,
        _bReplayMode: false,

        onInit: function () {
            Communication.registerEvent("itemSelected", this._onItemSelected.bind(this));

            this.getView().setModel(this._oModel, "viewModel");
            this.getView().setModel(RecordController.getModel(), "recordModel");
            this.getView().setModel(Navigation.getModel(), "navModel");
            this.getView().setModel(GlobalSettings.getModel(), "settingsModel");
            this._createDialog();
            this.getOwnerComponent().getRouter().getRoute("testDetails").attachPatternMatched(this._onTestDisplay, this);
            this.getOwnerComponent().getRouter().getRoute("testDetailsCreate").attachPatternMatched(this._onTestCreate, this);
            this.getOwnerComponent().getRouter().getRoute("testDetailsCreateQuick").attachPatternMatched(this._onTestCreateQuick, this);
            this.getOwnerComponent().getRouter().getRoute("testReplay").attachPatternMatched(this._onTestReplay, this);
            
			//Why is this function subscribed?
			//sap.ui.getCore().getEventBus().subscribe("RecordController", "windowFocusLost", this._recordStopped, this); 
        },
    });

    TestDetails.prototype._replay = function () {
        var sUrl = this._oModel.getProperty("/codeSettings/testUrl");
        chrome.tabs.create({
            url: sUrl,
            active: false
        }, function (tab) {
            chrome.windows.create({
                tabId: tab.id,
                type: 'normal',
                focused: true
            }, function (fnWindow) {
                //now inject into our window..
                RecordController.injectScript(tab.id).then(function () {
                    this._bReplayMode = true;
                    this._startReplay();
                }.bind(this));

                chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
                    if (message.type === "HandshakeToWindow") {
                        chrome.runtime.sendMessage({
                            "type": "send-window-id",
                        }, function (response) {
                        });
                    }
                });
            }.bind(this));
        }.bind(this));
    };

    TestDetails.prototype._startReplay = function () {
        this._iCurrentStep = 0;
        this._updatePlayButton();
    };

    TestDetails.prototype.onReplaySingleStep = function () {
        RecordController.focusTargetWindow();
        this._executeAction().then(function () {
            this.replayNextStep();
        }.bind(this));
    };

    TestDetails.prototype._executeAction = function () {
        var aEvent = this.getModel("navModel").getProperty("/elements");
        var oElement = aEvent[this._iCurrentStep];

        return new Promise(function (resolve) {
            if (oElement.property.type !== "ACT") {
                resolve();
                return false;
            }
            this._getFoundElements(oElement).then(function (aElements) {
                if (aElements.length === 0) {
                    resolve();
                    return;
                }
                oElement.item.identifier = aElements[0].identifier;
                Communication.fireEvent("execute", {
                    element: oElement
                }).then(resolve);
            });
        }.bind(this));
    };


    TestDetails.prototype._getFoundElements = function (oElement) {
        var oDefinition = oElement.selector;

        return new Promise(function (resolve, reject) {
            this._findItemAndExclude(oDefinition.selectorAttributes).then(function (aItemsEnhanced) {
                //make an assert check..
                resolve(aItemsEnhanced);
            }.bind(this));
        }.bind(this));
    };

    TestDetails.prototype._findItemAndExclude = function (oSelector) {
        return Communication.fireEvent("find", oSelector);
    }

    TestDetails.prototype.replayNextStep = function () {
        var aEvent = this.getModel("navModel").getProperty("/elements");
        this._iCurrentStep += 1;
        this._updatePlayButton();
        if (this._iCurrentStep >= aEvent.length) {
            this._bReplayMode = false;
            this.getModel("viewModel").setProperty("/replayMode", false);
            RecordController.startRecording();
            this.getRouter().navTo("testDetails", {
                TestId: this.getModel("navModel").getProperty("/test/uuid")
            });
        }
    };

    TestDetails.prototype._updatePlayButton = function () {
        var aElement = this.getModel("navModel").getProperty("/elements");
        for (var i = 0; i < aElement.length; i++) {
            aElement[i].showPlay = i === this._iCurrentStep;
        }
        this.getModel("navModel").setProperty("/elements", aElement);
    };

    TestDetails.prototype.uuidv4 = function () {
        var sStr = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        }) + this._iGlobal;
        this._iGlobal = this._iGlobal + 1;
        return sStr;
    };

    TestDetails.prototype._createDialog = function () {
        this._oRecordDialog = sap.ui.xmlfragment(
            "com.ui5.testing.fragment.RecordDialog",
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
        ExportImport.save(oSave);
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

    TestDetails.prototype._onTestCreateQuick = function (oEvent) {
        this._bCreateMode = true;
        this._bQuickMode = true;
        this._initTestCreate(true);
    };

    TestDetails.prototype._onTestCreate = function (oEvent) {
        this._bCreateMode = true;
        this._bQuickMode = false;
        this._initTestCreate(false);
    };

    TestDetails.prototype._initTestCreate = function (bImmediate) {
        this._oModel.setProperty("/replayMode", false);

        this.getModel("navModel").setProperty("/test", {
            uuid: this.uuidv4(),
            createdAt: new Date().getTime()
        });
        this._oModel.setProperty("/codeSettings/language", this.getModel("settingsModel").getProperty("/settings/defaultLanguage"));
        Communication.fireEvent("getwindowinfo").then(function (oData) {
            if (!oData) {
                return;
            }
            this._oModel.setProperty("/codeSettings/testName", oData.title);
            this._oModel.setProperty("/codeSettings/testCategory", oData.title);
            this._oModel.setProperty("/codeSettings/testUrl", oData.url);
            RecordController.startRecording(bImmediate);
            this.getRouter().navTo("testDetails", {
                TestId: this.getModel("navModel").getProperty("/test/uuid")
            });
        }.bind(this));
    }

    TestDetails.prototype._onItemSelected = function (oData) {
        if (this._bReplayMode === true) {
            return; //NO!
        }

        Navigation.setSelectedItem(oData);
        RecordController.focusPopup();

        if (this._bQuickMode !== true) {
            this.getRouter().navTo("elementCreate", {
                TestId: this.getModel("navModel").getProperty("/test/uuid"),
                ElementId: oData.identifier.ui5AbsoluteId
            });
        } else {
            this.getRouter().navTo("elementCreateQuick", {
                TestId: this.getModel("navModel").getProperty("/test/uuid"),
                ElementId: oData.identifier.ui5AbsoluteId
            });
        }
    };

    TestDetails.prototype._onTestReplay = function (oEvent) {
        this._bCreateMode = false;
        var sTargetUUID = oEvent.getParameter("arguments").TestId;
        var sCurrentUUID = this.getModel("navModel").getProperty("/test/uuid");
        if (sTargetUUID == this._oTestId && this._oModel.getProperty("/replayMode") === true) {
            if (this.getModel("navModel").getProperty("/elements/" + this._iCurrentStep + "/stepExecuted") === true) {
                this.replayNextStep();
            }
            return;
        }
        this._oModel.setProperty("/replayMode", true);

        this._oTestId = sTargetUUID;
        this._iCurrentStep = 0;
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
                this._updatePlayButton();
                this._replay();
            }.bind(this));
        } else {
            this._updatePreview();
            this._updatePlayButton();
            this._replay();
        }
    };

    TestDetails.prototype._onTestDisplay = function (oEvent) {
        this._bCreateMode = false;
        this._oModel.setProperty("/replayMode", false);
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

    TestDetails.prototype._updatePreview = function () {
        var aStoredItems = this.getModel("navModel").getProperty("/elements");
        this._oModel.setProperty("/codes", CodeHelper.getFullCode(this.getModel("viewModel").getProperty("/codeSettings"), aStoredItems));
    };
    TestDetails.prototype.onContinueRecording = function () {
        this._oRecordDialog.open();
        RecordController.startRecording();
    };


    TestDetails.prototype.onDeleteStep = function (oEvent) {
        var aItem = oEvent.getSource().getBindingContext("navModel").getPath().split("/");
        var sNumber = parseInt(aItem[aItem.length - 1], 10);
        var aElements = this.getModel("navModel").getProperty("/elements");
        aElements.splice(sNumber, 1);
        this.getModel("navModel").setProperty("/elements", aElements);

        this._updatePlayButton();
    };

    TestDetails.prototype.onReplayAll = function (oEvent) {
        var sUrl = this._oModel.getProperty("/codeSettings/testUrl");
        chrome.permissions.request({
            permissions: ['tabs'],
            origins: [sUrl]
        }, function (granted) {
            if (granted) {
                this.getRouter().navTo("testReplay", {
                    TestId: this.getModel("navModel").getProperty("/test/uuid")
                });
            }
        }.bind(this));
    };

    TestDetails.prototype.onExport = function () {
        var oSave = {
            versionId: "0.2.0",
            codeSettings: this._oModel.getProperty("/codeSettings"),
            elements: this.getModel("navModel").getProperty("/elements"),
            test: this.getModel("navModel").getProperty("/test")
        };
        var vLink = document.createElement('a'),
            vBlob = new Blob([JSON.stringify(oSave, null, 2)], { type: "octet/stream" }),
            vName = 'export.json',
            vUrl = window.URL.createObjectURL(vBlob);
        vLink.setAttribute('href', vUrl);
        vLink.setAttribute('download', vName);
        vLink.click();
    };

    TestDetails.prototype.onEditStep = function (oEvent) {
        //set the current step on not activate..
        this.getModel("navModel").setProperty("/elements/" + this._iCurrentStep + "/stepExecuted", false)
        this.getRouter().navTo("elementDisplay", {
            TestId: this.getModel("navModel").getProperty("/test/uuid"),
            ElementId: this._iCurrentStep
        });
    };

    TestDetails.prototype.onExpandControl = function (oEvent) {
        var oPanel = oEvent.getSource().getParent();
        oPanel.setExpanded(oPanel.getExpanded() === false);
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