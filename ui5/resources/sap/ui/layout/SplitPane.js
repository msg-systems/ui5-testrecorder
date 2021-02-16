/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./library','sap/ui/core/Element'],function(l,E){"use strict";var S=E.extend("sap.ui.layout.SplitPane",{metadata:{library:"sap.ui.layout",properties:{demandPane:{type:"boolean",group:"Behavior",defaultValue:true},requiredParentWidth:{type:"int",defaultValue:800}},defaultAggregation:"content",aggregations:{content:{type:"sap.ui.core.Control",multiple:false,singularName:"content"}}}});S.prototype.setLayoutData=function(L){var c=this.getContent();if(c){return c.setLayoutData(L);}else{return this;}};S.prototype.onLayoutDataChange=function(){var p=this.getParent();if(p){p._oSplitter._delayedResize();}};S.prototype._isInInterval=function(f){return this.getRequiredParentWidth()<=f;};return S;});
