/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/core/Renderer','./CalendarDateIntervalRenderer'],function(R,C){"use strict";var a=R.extend(C);a.addAttributes=function(r,c){C.addAttributes.apply(this,arguments);r.addClass("sapUiCalOneMonthInt");};return a;},true);
