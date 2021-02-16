/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/base/Object'],function(B){"use strict";var T=B.extend("sap.ui.model.Type",{constructor:function(){B.apply(this,arguments);this.sName="Type";},metadata:{"abstract":true,publicMethods:["getName"]}});T.prototype.getName=function(){return this.sName;};T.prototype.toString=function(){return"Type "+this.getMetadata().getName();};return T;});
