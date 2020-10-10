sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/json/JSONModel"
], function (UI5Object, JSONModel) {
    "use strict";

    var GlobalSettings = UI5Object.extend("com.ui5.testing.model.GlobalSettings", {
        /**
         * Constructor
         */
        constructor: function () {
            var oJSON = {
                settings: {
                    defaultLanguage: "UI5",
                    defaultNatLanguage: "EN",
                    defaultAuthentification: "NONE"
                },
                settingsDefault: {
                    replayType: 0,
                    defaultLanguage: "UI5",
                    defaultNatLanguage: "EN",
                    defaultAuthentification: "NONE"
                },
                authentification: [{
                    key: "NONE",
                    text: "None"
                }, {
                    key: "FIORI",
                    text: "Fiori Launchpad"
                }],
                codeLanguages: [
                    {
                        key: "UI5",
                        text: "UIVeri5"
                    },
                    {
                        key: "TCF",
                        text: "Testcafe"
                    },
                    {
                        key: "OPA",
                        text: "OPA5"
                    }/*,
                    {
                        key: "NAT",
                        text: "Natural (Experimental)"
                    }*/
                ],
                naturalLanguages: [
                    {
                        key: "EN",
                        text: "English"
                    },
                    {
                        key: "DE",
                        text: "German"
                    }
                ],
                replayModes: [
                    {
                        key: 0,
                        mode: "Manual"
                    },
                    {
                        key: 4,
                        mode: "Slow (2 sec.)"
                    },
                    {
                        key: 2,
                        mode: "Medium (1 sec.)"
                    },
                    {
                        key: 1,
                        mode: "Fast (0.5 sec.)"
                    }
                ]
            };
            this._oModel = new JSONModel(oJSON);
            this._initSettings();
            this.load();
        }
    });

    GlobalSettings.prototype.getModel = function () {
        return this._oModel;
    };

    GlobalSettings.prototype.load = function () {
        chrome.storage.local.get(["settings"], function (data) {
            this._oModel.setProperty("/settings", JSON.parse(JSON.stringify(this._oModel.getProperty("/settingsDefault"))));
            if (data && data.settings) {
                this._oModel.setProperty("/settings/defaultReplayType", data.settings.defaultReplayType);
                this._oModel.setProperty("/settings/defaultLanguage", data.settings.defaultLanguage);
                this._oModel.setProperty("/settings/defaultNatLanguage", data.settings.defaultNatLanguage);
            }
        }.bind(this));
    };

    GlobalSettings.prototype.save = function () {
        var oData = this._oModel.getProperty("/settings");
        chrome.storage.local.set({ "settings": oData }, function (data) {
        });
    };

    GlobalSettings.prototype.getCriteriaTypes = function () {
        return this._criteriaTypes;
    };


    GlobalSettings.prototype.getAttributeTypes = function () {
        return this._attributeTypes;
    };

    GlobalSettings.prototype.getElementMix = function () {
        return this._oElementMix;
    };

    GlobalSettings.prototype._initSettings = function () {
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
                        },
                        code: function (sValue) {
                            return { identifier: { ui5Id: sValue } };
                        },
                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            iValue = typeof iValue === "undefined" ? this.value(oItem) : iValue;
                            oAdjust.id = {
                                id: new RegExp(iValue + "$").toString(),
                                __isRegex: true
                            };
                        },
                        assert: function (sValue) {
                            return "identifier.ui5Id";
                        }
                    }, {
                        subCriteriaType: "LID",
                        subCriteriaText: "Local-Id",
                        value: function (oItem) {
                            return oItem.identifier.ui5LocalId;
                        },
                        code: function (sValue) {
                            return { identifier: { ui5LocalId: sValue } };
                        },
                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            iValue = typeof iValue === "undefined" ? this.value(oItem) : iValue;
                            oAdjust.id = {
                                id: new RegExp(iValue + "$").toString(),
                                __isRegex: true
                            };
                        },
                        assert: function (sValue) {
                            return "identifier.ui5LocalId";
                        },
                        assertField: function (sValue) {
                            return {
                                type: "id"
                            };
                        }
                    }];
                }
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
                        },
                        code: function (sValue) {
                            return { metadata: { elementName: sValue } };
                        },

                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            iValue = typeof iValue === "undefined" ? this.value(oItem) : iValue;
                            oAdjust.controlType = iValue;
                        },
                        assert: function () {
                            return "metadata.elementName";
                        },
                        assertField: function (sValue) {
                            return {
                                type: "elementName"
                            };
                        }
                    }, {
                        subCriteriaType: "CMP",
                        subCriteriaText: "Component-Name",
                        value: function (oItem) {
                            return oItem.metadata.componentName;
                        },
                        code: function (sValue) {
                            return { metadata: { componentName: sValue } };
                        },
                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            //not possible..
                        },
                        assert: function () {
                            return "metadata.componentName";
                        },
                        assertField: function (sValue) {
                            return {
                                type: "componentName"
                            };
                        }
                    }];
                }
            },
            "VIW": {
                criteriaKey: "VIW",
                criteriaText: "View-Data",
                criteriaSpec: function () {
                    return [{
                        subCriteriaType: "VIWNM",
                        subCriteriaText: "View-Name",
                        value: function (oItem) {
                            return oItem.viewProperty.viewName;
                        },
                        code: function (sValue) {
                            return { viewProperty: { viewName: sValue } };
                        },
                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            oAdjust.viewName = iValue;
                        },
                        assert: function () {
                            return "viewProperty.viewName";
                        },
                        assertField: function (sValue) {
                            return {
                                type: "viewName"
                            };
                        }
                    }, {
                        subCriteriaType: "VIWLNM",
                        subCriteriaText: "Local-View-Name",
                        value: function (oItem) {
                            return oItem.viewProperty.localViewName;
                        },
                        code: function (sValue) {
                            return { viewProperty: { localViewName: sValue } };
                        },
                        getUi5Spec: function (oAdjust, oItem, iValue) {
                            iValue = typeof iValue === "undefined" ? this.value(oItem) : iValue;
                            oAdjust.viewName = new RegExp(iValue + "$").toString();
                        },
                        assert: function () {
                            return "viewProperty.localViewName";
                        },
                        assertField: function (sValue) {
                            return {
                                type: "localViewName"
                            };
                        }
                    }];
                }
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
                            aggregationName: oAggregation.name,
                            code: function (sAggregation, sValue) {
                                var oReturn = { aggregation: {} };
                                oReturn.aggregation[sAggregation] = { length: sValue };
                                return oReturn;
                            }.bind(this, oAggregation.name),
                            value: function (sAggregation, oItem) {
                                return oItem.aggregation[sAggregation].length;
                            }.bind(this, oAggregation.name),

                            getUi5Spec: function (oAdjust, oItem, iValue) {
                                iValue = typeof iValue === "undefined" ? this.value(oItem) : iValue;
                                if (iValue === 0) {
                                    oAdjust.aggregationEmpty = {
                                        name: this.aggregationName
                                    };
                                } else {
                                    oAdjust.aggregationLengthEquals = {
                                        name: this.aggregationName,
                                        value: iValue
                                    };
                                }
                            },
                            assert: function (sAggregation) {
                                return "aggregation." + sAggregation + "." + "length";
                            }.bind(this, oAggregation.name),
                            assertField: function (sValue) {
                                return {
                                    type: "aggregation"
                                };
                            }
                        });
                    }
                    return aReturn;
                }.bind(this)
            },
            //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
            /*@Adrian - Start
            "MODL": {
                criteriaKey: "MODL",
                criteriaText: "Model-Keys (Specific)",
                criteriaSpec: function (oItem) {
                    var oMetadata = oItem.classArray;
                    var aReturn = [];
                    for (var i = 0; i < oMetadata.length; i++) {
                        var sElementName = oMetadata[i].elementName;
                        /*
                        var oType = _oElementModelValues[sElementName];

                        if (oType) {
                            for (var sModel in oType) {

                                if (!oItem.model[sModel === "undefined" ? undefined : sModel]) {
                                    continue;
                                }

                                for (var sProperty in oType[sModel]) {
                                    var sPropertyValue = oItem.model[sModel === "undefined" ? undefined : sModel][sProperty];
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
                                        getUi5Spec: function (oAdjust, oItem, iValue) {
                                            return ""; //not really possible
                                        },
                                        assert: function (sModel, sProperty) {
                                            return "model." + sModel + "." + sProperty;
                                        }.bind(this, sModel, sProperty),
                                        assertField: function (sValue) {
                                            return {
                                                type: "prop"
                                            }
                                        }
                                    });
                                }
                            }
                        }//
                    }
                    return aReturn;
                }
            },
            @Adrian - End*/

            "BNDX": {
                criteriaKey: "BNDX",
                //criteriaText: "Binding Context",
                criteriaText: "Binding Path",
                criteriaSpec: function (oItem) {
                    var aReturn = [];
                    for (var sBinding in oItem.bindingContext) {
                        aReturn.push({
                            subCriteriaType: sBinding,
                            subCriteriaText: sBinding,
                            bindingRef: oItem.bindingContext[sBinding],
                            code: function (sBinding, sValue) {
                                var oReturn = { bindingContext: {} };
                                oReturn.bindingContext[sBinding] = sValue;
                                return oReturn;
                            }.bind(this, sBinding),
                            getUi5Spec: function (oAdjust, oItem, iValue) {
                                oAdjust.bindingPath = typeof oAdjust.bindingPath != "undefined" ? oAdjust.bindingPath : {};
                                oAdjust.bindingPath = {
                                    path: this.bindingRef
                                };

                                if (this.subCriteriaType !== "undefined") {
                                    oAdjust.bindingPath.model = this.subCriteriaType;
                                }
                            },
                            value: function (subCriteriaType, oItem) {
                                return oItem.bindingContext[subCriteriaType];
                            }.bind(this, sBinding),
                            assert: function (subCriteriaType) {
                                return "bindingContext." + subCriteriaType;
                            }.bind(this, sBinding),
                            assertField: function (sValue) {
                                return {
                                    type: "bindingContext"
                                }
                            }
                        });
                    }
                    return aReturn;
                }
            },
            "BDG": {
                criteriaKey: "BDG",
                //criteriaText: "Model-Context Values",
                criteriaText: "Binding Context",
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
                                getUi5Spec: function (oAdjust, oItem, iValue) {
                                    return ""; //not really possible right?
                                },
                                assert: function (sModel, sProperty) {
                                    return "context." + sModel + "." + sProperty;
                                }.bind(this, sModel, sProperty),
                                assertField: function (sValue) {
                                    return {
                                        type: "context"
                                    }
                                }
                            });
                        }
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
                            getUi5Spec: function (oAdjust, oItem, iValue) {
                                //restriction: maximum one binding path apperently?
                                iValue = typeof iValue === "undefined" ? this.value(oItem, sProperty) : iValue;

                                oAdjust.properties = typeof oAdjust.properties != "undefined" ? oAdjust.properties : [];
                                var oProp = {};
                                oProp[this.subCriteriaType] = iValue;
                                oAdjust.properties.push(oProp);
                            },
                            assert: function (subCriteriaType) {
                                return "property." + subCriteriaType;
                            }.bind(this, sProperty),
                            assertField: function (sValue) {
                                return {
                                    type: "property",
                                    value: this.subCriteriaType
                                };
                            }
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
                getAssertScope: function () { return ""; },
                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["MODL"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"], this._criteriaTypes["VIW"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["VIW"]]
            },
            "VIW": {
                getItem: function (oItem) { return oItem.view; },
                getScope: function (oScope) { oScope.view = oScope.view ? oScope.view : {}; return oScope.view; },
                getAssertScope: function () { return "view."; },
                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "PRT": {
                getItem: function (oItem) { return oItem.parent; },
                getAssertScope: function () { return "parent."; },
                getScope: function (oScope) { oScope.parent = oScope.parent ? oScope.parent : {}; return oScope.parent; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "PRT2": {
                getItem: function (oItem) { return oItem.parentL2; },
                getAssertScope: function () { return "parentL2."; },
                getScope: function (oScope) { oScope.parentL2 = oScope.parentL2 ? oScope.parentL2 : {}; return oScope.parentL2; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "PRT3": {
                getItem: function (oItem) { return oItem.parentL3; },
                getAssertScope: function () { return "parentL3."; },
                getScope: function (oScope) { oScope.parentL3 = oScope.parentL3 ? oScope.parentL3 : {}; return oScope.parentL3; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "PRT4": {
                getItem: function (oItem) { return oItem.parentL4; },
                getAssertScope: function () { return "parentL4."; },
                getScope: function (oScope) { oScope.parentL4 = oScope.parentL4 ? oScope.parentL4 : {}; return oScope.parentL4; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "PLBL": {
                getItem: function (oItem) { return oItem.label; },
                getAssertScope: function () { return "label."; },
                getScope: function (oScope) { oScope.label = oScope.label ? oScope.label : {}; return oScope.label; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            },
            "MCMB": {
                getItem: function (oItem) {
                    return oItem.itemdata;
                },
                getScope: function (oScope) { oScope.itemdata = oScope.itemdata ? oScope.itemdata : {}; return oScope.itemdata; },
                getAssertScope: function () { return "itemdata."; },

                //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                //criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"], this._criteriaTypes["BNDG"]]
                criteriaTypes: [this._criteriaTypes["ID"], this._criteriaTypes["BNDX"], this._criteriaTypes["ATTR"], this._criteriaTypes["BDG"], this._criteriaTypes["MTA"], this._criteriaTypes["AGG"]]
            }
        };

        this._oElementMix = {
            "sap.m.StandardListItem": {
                defaultAttributes: function (oItem) {
                    //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                    if (!oItem.itemdata || !oItem.itemdata.identifier || !oItem.itemdata.identifier.ui5Id) {
                        return [];
                    }
                    if (!oItem.itemdata.identifier.ui5Id.length) {
                        return [];
                    }
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
            "sap.m.List": {
                defaultInteraction: "root"
            },
            "sap.m.MultiInput": {
                defaultInteraction: "root",
                defaultEnter: true
            },
            "sap.m.Button": {
                defaultAction: "PRS",
                preferredProperties: ["text", "icon"],
                defaultAttributes: function (oItem) {
                    var aReturn = [];
                    if (oItem.binding.text) {
                        aReturn.push({ attributeType: "OWN", criteriaType: "BDG", subCriteriaType: "text" });
                    }
                    if (oItem.binding.icon) {
                        aReturn.push({ attributeType: "OWN", criteriaType: "BDG", subCriteriaType: "icon" });
                    } else if (oItem.property.icon) {
                        aReturn.push({ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "icon" });
                    }
                    if (oItem.binding.tooltip) {
                        aReturn.push({ attributeType: "OWN", criteriaType: "BDG", subCriteriaType: "tooltip" });
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
                    //@Adrian - Fix bnd-ctxt uiveri5 2019/06/25
                    //return [{ attributeType: "OWN", criteriaType: "ATTR", subCriteriaType: "key" }];
                    //the KEY attribute is better in case the item is bound against a JSON list binding..
                    var bPropertyIsBetter = true;
                    if (oItem.binding.key) {
                        //for odata we will access the actual key...
                        if (oItem.binding.key.jsonBinding === false) {
                            bPropertyIsBetter = false;
                        }
                    }
                    return [{ attributeType: "OWN", criteriaType: bPropertyIsBetter ? "ATTR" : "BDG", subCriteriaType: "key" }];
                }
            },
            "sap.m.Link": {
                defaultAttributes: function (oItem) {
                    //if the text is static --> take the binding with priority..
                    if (oItem.binding && oItem.binding["text"] && oItem.binding["text"].static === true) {
                        return [{ attributeType: "OWN", criteriaType: "BDG", subCriteriaType: "text" }];
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
                defaultAttributes: [{ attributeType: "PRT2", criteriaType: "ATTR", subCriteriaType: "target" },
                { attributeType: "PRT2", criteriaType: "MTA", subCriteriaType: "ELM" }]
            },
            "sap.m.MultiComboBox": {
                defaultAction: "PRS",
                actions: {
                    "PRS": [{ text: "Arrow (Open List)", domChildWith: "-arrow", preferred: true, order: 1 }]
                }
            },
            "sap.m.Text": {
                preferredProperties: ["text"],
                preferredType: "ASS"
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
            "sap.ui.table.Row": {
                cloned: true,
                defaultAction: "PRS",
                actions: {
                    "PRS": [{ text: "On Selection-Area", domChildWith: "-col0", preferred: true, order: 1 }]
                }
            },
            "sap.m.SearchField": {
                defaultAction: [{ domChildWith: "-search", action: "PRS" },
                { domChildWith: "-reset", action: "PRS" },
                { domChildWith: "", action: "TYP" }]
            }
        };
    };

    return new GlobalSettings();
});