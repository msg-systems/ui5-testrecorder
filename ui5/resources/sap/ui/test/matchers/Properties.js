/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/test/_LogCollector","sap/base/Log","sap/base/strings/capitalize","sap/ui/thirdparty/jquery"],function(_,L,c,q){"use strict";var l=L.getLogger("sap.ui.test.matchers.Properties",_.DEFAULT_LEVEL_FOR_OPA_LOGGERS);return function(p){return function(C){var i=true;q.each(p,function(P,o){var f=C["get"+c(P,0)];if(!f){i=false;l.error("Control '"+C+"' does not have a property '"+P+"'");return false;}var v=f.call(C);if(o instanceof RegExp){i=o.test(v);}else{i=v===o;}if(!i){l.debug("Control '"+C+"' property '"+P+"' has value '"+v+"' but should have value '"+o+"'");return false;}});return i;};};},true);
