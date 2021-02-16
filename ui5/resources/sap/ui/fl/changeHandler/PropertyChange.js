/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/thirdparty/jquery","sap/ui/fl/changeHandler/Base","sap/ui/fl/Utils","sap/base/Log"],function(q,B,F,L){"use strict";var P={};function c(C,p,v,m){try{if(F.isBinding(v)||q.isPlainObject(v)){m.setPropertyBinding(C,p,v);}else{m.setProperty(C,p,v);}}catch(e){throw new Error("Applying property changes failed: "+e);}}P.applyChange=function(C,o,p){var d=C.getDefinition();var s=d.content.property;var v=d.content.newValue;var m=p.modifier;C.setRevertData({originalValue:m.getPropertyBinding(o,s)||m.getProperty(o,s)});c(o,s,v,m);};P.revertChange=function(C,o,p){var r=C.getRevertData();if(r){var d=C.getDefinition();var s=d.content.property;var v=r.originalValue;var m=p.modifier;c(o,s,v,m);C.resetRevertData();}else{L.error("Attempt to revert an unapplied change.");return false;}return true;};P.completeChangeContent=function(C,s){var o=C.getDefinition();if(s.content){o.content=s.content;}else{throw new Error("oSpecificChangeInfo attribute required");}};return P;},true);
