/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/core/Component","sap/ui/fl/FlexControllerFactory","sap/ui/fl/Utils","sap/ui/fl/LrepConnector","sap/ui/fl/ChangePersistenceFactory","sap/ui/fl/ChangePersistence","sap/base/Log"],function(C,F,U,L,a,b,c){"use strict";var X=function(){};X.process=function(v,p){try{if(!p||p.sync){U.log.warning("Flexibility feature for applying changes on an XML view is only available for "+"asynchronous views; merge is be done later on the JS controls.");return(v);}p.viewId=p.id;var o=sap.ui.getCore().getComponent(p.componentId);if(!o){U.log.warning("View is generated without a component. Flexibility features are not possible.");return Promise.resolve(v);}var A=U.getAppComponentForControl(o);if(!U.isApplication(A.getManifestObject())){return Promise.resolve(v);}var f=U.getComponentClassName(A);var s=U.getAppVersionFromManifest(A.getManifest());var d=a.getChangePersistenceForComponent(f,s);return d.getCacheKey().then(function(g){if(!g||g===b.NOTAG){U.log.warning("No cache key could be determined for the view; flexibility XML view preprocessing is skipped. "+"The processing will be done later on the JS controls.");return Promise.resolve(v);}var h=F.create(f,s);return h.processXmlView(v,p).then(function(){U.log.debug("flex processing view "+p.id+" finished");return v;});},function(){U.log.warning("Error happens when getting flex cache key! flexibility XML view preprocessing is skipped. "+"The processing will be done later on the JS controls.");return Promise.resolve(v);});}catch(e){var E="view "+p.id+": "+e;U.log.info(E);return Promise.resolve(v);}};X.getCacheKey=function(p){var o=C.get(p.componentId);var A=U.getAppComponentForControl(o);if(U.isVariantByStartupParameter(A)){return Promise.resolve();}var f=U.getComponentClassName(A);var s=U.getAppVersionFromManifest(A.getManifest());var d=a.getChangePersistenceForComponent(f,s);return d.getCacheKey();};return X;},true);