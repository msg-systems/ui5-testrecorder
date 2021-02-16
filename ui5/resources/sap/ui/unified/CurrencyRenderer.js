/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define([],function(){"use strict";var C={};C.render=function(r,c){var t=c.getTooltip_AsString();r.write("<div");r.writeControlData(c);if(t){r.writeAttributeEscaped("title",t);}r.addClass("sapUiUfdCurrency");if(c._bRenderNoValClass){r.addClass("sapUiUfdCurrencyNoVal");}r.writeClasses();r.write(">");r.write("<div");r.addClass("sapUiUfdCurrencyAlign");r.writeClasses();r.write(">");r.write("<span");r.writeAttribute("dir","ltr");r.addClass("sapUiUfdCurrencyValue");r.writeClasses();r.write(">");r.writeEscaped(c.getFormattedValue());r.write("</span>");r.write("<span");r.addClass("sapUiUfdCurrencyCurrency");r.writeClasses();r.write(">");r.writeEscaped(c._getCurrency());r.write("</span>");r.write("</div>");r.write("</div>");};return C;},true);
