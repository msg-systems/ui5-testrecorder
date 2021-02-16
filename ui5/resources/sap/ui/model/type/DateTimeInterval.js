/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./DateInterval','sap/ui/core/format/DateFormat'],function(D,a){"use strict";var b=D.extend("sap.ui.model.type.DateTimeInterval",{constructor:function(){D.apply(this,arguments);this.sName="DateTimeInterval";}});b.prototype._createFormats=function(){this.oFormatOptions.interval=true;this.oOutputFormat=a.getDateTimeInstance(this.oFormatOptions);if(this.oFormatOptions.source){this.oInputFormat=a.getDateTimeInstance(this.oFormatOptions.source);}};return b;});
