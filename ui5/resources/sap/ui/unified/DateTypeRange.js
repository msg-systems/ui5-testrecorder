/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./DateRange','./library'],function(D,l){"use strict";var C=l.CalendarDayType;var a=D.extend("sap.ui.unified.DateTypeRange",{metadata:{library:"sap.ui.unified",properties:{type:{type:"sap.ui.unified.CalendarDayType",group:"Appearance",defaultValue:C.Type01}}}});return a;});
