/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./Base','sap/m/Button'],function(B,a){"use strict";var P=B.extend("sap.ui.rta.toolbar.Personalization",{renderer:'sap.ui.rta.toolbar.BaseRenderer',type:'personalization',metadata:{events:{"exit":{},"restore":{}}},constructor:function(){B.apply(this,arguments);this.setJustifyContent("End");}});P.prototype.buildControls=function(){var c=[new a({type:"Transparent",text:this.getTextResources().getText("BTN_RESTORE"),tooltip:this.getTextResources().getText("BTN_RESTORE"),visible:true,press:this.eventHandler.bind(this,'Restore')}).data('name','restore'),new a({type:"Emphasized",text:this.getTextResources().getText("BTN_DONE"),tooltip:this.getTextResources().getText("BTN_DONE_TOOLTIP"),press:this.eventHandler.bind(this,'Exit')}).data('name','exit')];return c;};P.prototype.setUndoRedoEnabled=function(){};P.prototype.setPublishEnabled=function(){};P.prototype.setRestoreEnabled=function(e){this.getControl('restore').setEnabled(e);};return P;},true);
