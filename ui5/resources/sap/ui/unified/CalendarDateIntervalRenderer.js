/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/core/Renderer','./CalendarRenderer'],function(R,C){"use strict";var a=R.extend(C);a.renderCalContentOverlay=function(){};a.renderCalContentAndArrowsOverlay=function(r,c,i){if(c.getPickerPopup()){r.write("<div id=\""+i+"-contentOver\" class=\"sapUiCalContentOver\" style=\"display:none;\"></div>");}};a.addAttributes=function(r,c){r.addClass("sapUiCalInt");r.addClass("sapUiCalDateInt");var d=c._getDays();if(d>c._getDaysLarge()){r.addClass("sapUiCalIntLarge");}if(d>c._iDaysMonthHead){r.addClass("sapUiCalIntHead");}};return a;},true);
