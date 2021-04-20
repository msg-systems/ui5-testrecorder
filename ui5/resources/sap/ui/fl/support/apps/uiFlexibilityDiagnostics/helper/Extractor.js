/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/util/File","sap/ui/core/util/reflection/JsControlTreeModifier","sap/m/MessageBox","sap/ui/thirdparty/jquery"],function(F,J,M,q){"use strict";var E={};E.extractData=function(c){var e={bIsInvestigationExport:true,mControlData:{},aAppliedChanges:[],aFailedChanges:[],mChangesEntries:{},mVariantsChanges:{},sComponentName:c._mComponent.name};this._enhanceExportWithChangeData(c,e);this._enhanceExportWithVariantChangeData(c,e);this._enhanceExportWithControlData(c,e);return e;};E.getAppComponentInstance=function(c){var C;var a=q.find(".sapUiComponentContainer");a.some(function(o){var b=sap.ui.getCore().byId(o.id);var A=b&&b.getComponentInstance();if(A&&A.getMetadata().getName()===c){C=A;return true;}});return C;};E._enhanceExportWithChangeData=function(c,e){var a=E.getAppComponentInstance(e.sComponentName);q.each(c._mChangesEntries,function(C,o){e.mChangesEntries[C]={mDefinition:o._oDefinition,aControlsDependencies:[],aDependencies:[]};if(o._aDependentSelectorList){o._aDependentSelectorList.forEach(function(s){var m={bPresent:!!J.bySelector(s,a),aAppliedChanges:[],aFailedChangesJs:[],aFailedChangesXml:[]};e.mControlData[s.id]=m;});}});this._enhanceExportWithDependencyData(c,e);};E._enhanceExportWithDependencyData=function(c,e){q.each(c._mChangesInitial.mDependencies,function(C,m){e.mChangesEntries[C].aControlsDependencies=m.controlsDependencies;e.mChangesEntries[C].aDependencies=m.dependencies;});};E._enhanceExportWithVariantChangeData=function(c,e){q.each(c._mVariantsChanges,function(C,o){e.mVariantsChanges[C]={mDefinition:o._oDefinition};});};E._enhanceExportWithControlData=function(c,e){q.each(c._mChanges.mChanges,function(C,a){var m={bPresent:false,aAppliedChanges:[],aFailedChangesJs:[],aFailedChangesXml:[]};var o=sap.ui.getCore().byId(C);if(o){m.bPresent=true;if(o.data("sap.ui.fl.appliedChanges")){m.aAppliedChanges=o.data("sap.ui.fl.appliedChanges").split(",");m.aAppliedChanges.map(function(s){if(!(s in e.aAppliedChanges)){e.aAppliedChanges.push(s);}});}if(o.data("sap.ui.fl.failedChanges.js")){var f=o.data("sap.ui.fl.failedChanges.js").split(",");m.aFailedChangesJs=f;m.aFailedChangesJs.map(function(s){if(!(s in e.aFailedChanges)){e.aFailedChanges.push(s);}});}if(o.data("sap.ui.fl.failedChanges.xml")){var b=o.data("sap.ui.fl.failedChanges.xml").split(",");m.aFailedChangesXml=b;m.aFailedChangesXml.map(function(s){if(!(s in e.aFailedChanges)){e.aFailedChanges.push(s);}});}}e.mControlData[C]=m;});};E.createDownloadFile=function(o){try{var s=JSON.stringify(o);F.save(s,"flexibilityDataExtraction","json");}catch(e){M.error("The export of the flexibility data was not successful.\n"+e.message);}};return E;});