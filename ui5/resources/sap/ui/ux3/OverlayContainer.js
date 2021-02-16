/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['jquery.sap.global','./Overlay','./library',"./OverlayContainerRenderer"],function(q,O,l,a){"use strict";var b=O.extend("sap.ui.ux3.OverlayContainer",{metadata:{library:"sap.ui.ux3",defaultAggregation:"content",aggregations:{content:{type:"sap.ui.core.Control",multiple:true,singularName:"content"}}}});b.prototype._setFocusLast=function(){var f=this.$("content").lastFocusableDomRef();if(!f&&this.getCloseButtonVisible()){f=this.getDomRef("close");}else if(!f&&this.getOpenButtonVisible()){f=this.getDomRef("openNew");}q.sap.focus(f);};b.prototype._setFocusFirst=function(){if(this.getOpenButtonVisible()){q.sap.focus(this.getDomRef("openNew"));}else if(this.getCloseButtonVisible()){q.sap.focus(this.getDomRef("close"));}else{q.sap.focus(this.$("content").firstFocusableDomRef());}};return b;},true);
