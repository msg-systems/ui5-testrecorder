/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/model/ClientTreeBinding',"sap/ui/thirdparty/jquery"],function(C,q){"use strict";var X=C.extend("sap.ui.model.xml.XMLTreeBinding");X.prototype.getNodeContexts=function(c,s,l){if(!s){s=0;}if(!l){l=this.oModel.iSizeLimit;}var a=c.getPath();if(!a.endsWith("/")){a=a+"/";}if(!a.startsWith("/")){a="/"+a;}var b=[],n={},t=this,N=this.oModel._getObject(c.getPath()),d,o;q.each(N[0].childNodes,function(e,f){if(f.nodeType==1){if(n[f.nodeName]==undefined){n[f.nodeName]=0;}else{n[f.nodeName]++;}d=a+f.nodeName+"/"+n[f.nodeName];o=t.oModel.getContext(d);if(t.oCombinedFilter&&!t.bIsFiltering){if(t.filterInfo.aFilteredContexts&&t.filterInfo.aFilteredContexts.indexOf(o)!=-1){b.push(o);}}else{b.push(o);}}});this._applySorter(b);this._setLengthCache(a,b.length);return b.slice(s,s+l);};return X;});
