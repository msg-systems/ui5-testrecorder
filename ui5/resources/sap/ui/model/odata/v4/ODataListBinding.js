/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/base/Log","sap/ui/base/SyncPromise","sap/ui/model/Binding","sap/ui/model/ChangeReason","sap/ui/model/FilterOperator","sap/ui/model/FilterProcessor","sap/ui/model/FilterType","sap/ui/model/ListBinding","sap/ui/model/Sorter","sap/ui/model/odata/OperationMode","./Context","./lib/_AggregationCache","./lib/_AggregationHelper","./lib/_Cache","./lib/_GroupLock","./lib/_Helper","./ODataParentBinding","sap/ui/thirdparty/jquery"],function(L,S,B,C,F,a,b,c,d,O,e,_,f,g,h,j,k){"use strict";var s="sap.ui.model.odata.v4.ODataListBinding",m={AggregatedDataStateChange:true,change:true,dataReceived:true,dataRequested:true,DataStateChange:true,refresh:true};var l=c.extend("sap.ui.model.odata.v4.ODataListBinding",{constructor:function(M,p,o,v,i,P){c.call(this,M,p);if(p.slice(-1)==="/"){throw new Error("Invalid path: "+p);}this.oAggregation=null;this.mAggregatedQueryOptions={};this.bAggregatedQueryOptionsInitial=true;this.aApplicationFilters=j.toArray(i);l.checkCaseSensitiveFilters(this.aApplicationFilters);this.oCachePromise=S.resolve();this.sChangeReason=M.bAutoExpandSelect?"AddVirtualContext":undefined;this.aChildCanUseCachePromises=[];this.oDiff=undefined;this.aFilters=[];this.bHasAnalyticalInfo=false;this.mPreviousContextsByPath={};this.aPreviousData=[];this.oReadGroupLock=undefined;this.aSorters=j.toArray(v);this.applyParameters(jQuery.extend(true,{},P));this.oHeaderContext=this.bRelative?null:e.create(this.oModel,this,p);if(!this.bRelative||o&&!o.fetchValue){this.createReadGroupLock(this.getGroupId(),true);}this.setContext(o);M.bindingCreated(this);}});k(l.prototype);l.checkCaseSensitiveFilters=function(i){function n(o){if(o.bCaseSensitive===false){throw new Error("Filter for path '"+o.sPath+"' has unsupported value for 'caseSensitive' : false");}if(o.aFilters){l.checkCaseSensitiveFilters(o.aFilters);}if(o.oCondition){n(o.oCondition);}}i.forEach(n);};l.prototype._delete=function(G,E,o){var t=this;if(!o.isTransient()&&this.hasPendingChanges()){throw new Error("Cannot delete due to pending changes");}return this.deleteFromCache(G,E,String(o.iIndex),function(I,n){var p,i,P,r;if(I===-1){o.destroy();delete t.aContexts[-1];}else{for(i=I;i<t.aContexts.length;i+=1){o=t.aContexts[i];if(o){t.mPreviousContextsByPath[o.getPath()]=o;}}r=t.oModel.resolve(t.sPath,t.oContext);t.aContexts.splice(I,1);for(i=I;i<t.aContexts.length;i+=1){if(t.aContexts[i]){P=j.getPrivateAnnotation(n[i],"predicate");p=r+(P||"/"+i);o=t.mPreviousContextsByPath[p];if(o){delete t.mPreviousContextsByPath[p];if(o.getIndex()===i){o.checkUpdate();}else{o.setIndex(i);}}else{o=e.create(t.oModel,t,p,i);}t.aContexts[i]=o;}}}t.iMaxLength-=1;t._fireChange({reason:C.Remove});});};l.prototype.applyParameters=function(p,i){var A,o;this.checkBindingParameters(p,["$$aggregation","$$groupId","$$operationMode","$$ownRequest","$$updateGroupId"]);o=p.$$operationMode||this.oModel.sOperationMode;if(!o&&(this.aSorters.length||this.aApplicationFilters.length)){throw new Error("Unsupported operation mode: "+o);}this.sOperationMode=o;this.sGroupId=p.$$groupId;this.sUpdateGroupId=p.$$updateGroupId;this.mQueryOptions=this.oModel.buildQueryOptions(p,true);this.mParameters=p;if("$$aggregation"in p){if("$apply"in this.mQueryOptions){throw new Error("Cannot combine $$aggregation and $apply");}A=j.clone(p.$$aggregation);this.mQueryOptions.$apply=f.buildApply(A).$apply;this.oAggregation=A;}this.removeCachesAndMessages();this.fetchCache(this.oContext);this.reset(i);};l.prototype.attachEvent=function(E){if(!(E in m)){throw new Error("Unsupported event '"+E+"': v4.ODataListBinding#attachEvent");}return c.prototype.attachEvent.apply(this,arguments);};l.prototype.create=function(i){var o,v,n,G,r=this.oModel.resolve(this.sPath,this.oContext),t=this;if(!r){throw new Error("Binding is not yet resolved: "+this);}if(this.aContexts[-1]){throw new Error("Must not create twice");}this.checkSuspended();v=r.slice(1);if(this.bRelative&&this.oContext.fetchCanonicalPath){v=this.oContext.fetchCanonicalPath().then(function(p){return j.buildPath(p,t.sPath).slice(1);});}G=this.lockGroup(this.getUpdateGroupId(),true);n=this.createInCache(G,v,"",i,function(){o.destroy();delete t.aContexts[-1];t._fireChange({reason:C.Remove});}).then(function(){var p;t.iMaxLength+=1;if(t.isRefreshable()){p=t.getGroupId();if(!t.oModel.isDirectGroup(p)&&!t.oModel.isAutoGroup(p)){p="$auto";}return t.refreshSingle(o,t.lockGroup(p));}},function(E){G.unlock(true);throw E;});o=e.create(this.oModel,this,r+"/-1",-1,n);this.aContexts[-1]=o;this._fireChange({reason:C.Add});return o;};l.prototype.createContexts=function(n,o,r){var p=false,q=this.oContext,t,i,u=r.$count,I=this.aContexts.length,v=this.bLengthFinal,M=this.oModel,P=M.resolve(this.sPath,q),w,x=this;function y(N){var i;for(i=N;i<x.aContexts.length;i+=1){if(x.aContexts[i]){x.aContexts[i].destroy();}}while(N>0&&!x.aContexts[N-1]){N-=1;}x.aContexts.length=N;p=true;}for(i=n;i<n+r.length;i+=1){if(this.aContexts[i]===undefined){p=true;w=j.getPrivateAnnotation(r[i-n],"predicate");t=P+(w||"/"+i);if(t in this.mPreviousContextsByPath){this.aContexts[i]=this.mPreviousContextsByPath[t];delete this.mPreviousContextsByPath[t];this.aContexts[i].setIndex(i);this.aContexts[i].checkUpdate();}else{this.aContexts[i]=e.create(M,this,t,i);}}}if(Object.keys(this.mPreviousContextsByPath).length){sap.ui.getCore().addPrerenderingTask(function(){Object.keys(x.mPreviousContextsByPath).forEach(function(P){x.mPreviousContextsByPath[P].destroy();delete x.mPreviousContextsByPath[P];});});}if(u!==undefined){if(this.aContexts.length>u){y(u);}this.iMaxLength=u;this.bLengthFinal=true;}else{if(this.aContexts.length>this.iMaxLength){this.iMaxLength=Infinity;}if(r.length<o){this.iMaxLength=n+r.length;if(this.aContexts.length>this.iMaxLength){y(this.iMaxLength);}}if(!(n>I&&r.length===0)){this.bLengthFinal=this.aContexts.length===this.iMaxLength;}}if(this.bLengthFinal!==v){p=true;}return p;};l.prototype.destroy=function(){if(this.bHasAnalyticalInfo&&this.aContexts===undefined){return;}this.aContexts.forEach(function(o){o.destroy();});if(this.oHeaderContext){this.oHeaderContext.destroy();}if(this.aContexts[-1]){this.aContexts[-1].destroy();}this.oModel.bindingDestroyed(this);this.removeReadGroupLock();this.mAggregatedQueryOptions=undefined;this.oAggregation=undefined;this.aApplicationFilters=undefined;this.oCachePromise=S.resolve();this.oContext=undefined;this.aContexts=undefined;this.aFilters=undefined;this.oHeaderContext=undefined;this.mPreviousContextsByPath=undefined;this.aPreviousData=undefined;this.aSorters=undefined;c.prototype.destroy.apply(this);};l.prototype.doCreateCache=function(r,q,o){var A=this.oAggregation&&(this.oAggregation.groupLevels.length||f.hasMinOrMax(this.oAggregation.aggregate));q=this.inheritQueryOptions(q,o);return A?_.create(this.oModel.oRequestor,r,this.oAggregation,q,this.oModel.bAutoExpandSelect):g.create(this.oModel.oRequestor,r,q,this.oModel.bAutoExpandSelect);};l.prototype.doFetchQueryOptions=function(o){var i=this.getOrderby(this.mQueryOptions.$orderby),t=this;return this.fetchFilter(o,this.mQueryOptions.$filter).then(function(n){return t.mergeQueryOptions(t.mQueryOptions,i,n);});};l.prototype.enableExtendedChangeDetection=function(D,K){if(K!==undefined){throw new Error("Unsupported property 'key' with value '"+K+"' in binding info for "+this);}return c.prototype.enableExtendedChangeDetection.apply(this,arguments);};l.prototype.fetchFilter=function(o,i){var n,M,p;function q(u,E,W){var v,V=j.formatLiteral(u.oValue1,E),x=decodeURIComponent(u.sPath);switch(u.sOperator){case F.BT:v=x+" ge "+V+" and "+x+" le "+j.formatLiteral(u.oValue2,E);break;case F.NB:v=w(x+" lt "+V+" or "+x+" gt "+j.formatLiteral(u.oValue2,E),W);break;case F.EQ:case F.GE:case F.GT:case F.LE:case F.LT:case F.NE:v=x+" "+u.sOperator.toLowerCase()+" "+V;break;case F.Contains:case F.EndsWith:case F.NotContains:case F.NotEndsWith:case F.NotStartsWith:case F.StartsWith:v=u.sOperator.toLowerCase().replace("not","not ")+"("+x+","+V+")";break;default:throw new Error("Unsupported operator: "+u.sOperator);}return v;}function r(u,v,W){if(u.aFilters){return S.all(u.aFilters.map(function(x){return r(x,v,u.bAnd);})).then(function(x){return w(x.join(u.bAnd?" and ":" or "),W&&!u.bAnd);});}return M.fetchObject(t(u.sPath,v),p).then(function(P){var x,y,z;if(!P){throw new Error("Type cannot be determined, no metadata for path: "+p.getPath());}z=u.sOperator;if(z===F.All||z===F.Any){x=u.oCondition;y=u.sVariable;if(z===F.Any&&!x){return u.sPath+"/any()";}v=Object.create(v);v[y]=t(u.sPath,v);return r(x,v).then(function(A){return u.sPath+"/"+u.sOperator.toLowerCase()+"("+y+":"+A+")";});}return q(u,P.$Type,W);});}function t(P,u){var v=P.split("/");v[0]=u[v[0]];return v[0]?v.join("/"):P;}function w(u,W){return W?"("+u+")":u;}n=a.combineFilters(this.aFilters,this.aApplicationFilters);if(!n){return S.resolve(i);}M=this.oModel.getMetaModel();p=M.getMetaContext(this.oModel.resolve(this.sPath,o));return r(n,{},i).then(function(u){if(i){u+=" and ("+i+")";}return u;});};l.prototype.fetchValue=function(p,o,i){var t=this;return this.oCachePromise.then(function(n){var r;if(n){r=t.getRelativePath(p);if(r!==undefined){return n.fetchValue(h.$cached,r,undefined,o);}}if(t.oContext){return t.oContext.fetchValue(p,o,i);}});};l.prototype.filter=function(v,i){var n=j.toArray(v);l.checkCaseSensitiveFilters(n);this.checkSuspended();if(this.sOperationMode!==O.Server){throw new Error("Operation mode has to be sap.ui.model.odata.OperationMode.Server");}if(this.hasPendingChanges()){throw new Error("Cannot filter due to pending changes");}this.createReadGroupLock(this.getGroupId(),true);if(i===b.Control){this.aFilters=n;}else{this.aApplicationFilters=n;}this.removeCachesAndMessages();this.fetchCache(this.oContext);this.reset(C.Filter);return this;};l.prototype.getContexts=function(i,n,M){var o,p=this.oContext,q,D=false,r=false,G,P,R=!!this.sChangeReason,t,v,u=this;L.debug(this+"#getContexts("+i+", "+n+", "+M+")",undefined,s);this.checkSuspended();if(i!==0&&this.bUseExtendedChangeDetection){throw new Error("Unsupported operation: v4.ODataListBinding#getContexts,"+" first parameter must be 0 if extended change detection is enabled, but is "+i);}if(M!==undefined&&this.bUseExtendedChangeDetection){throw new Error("Unsupported operation: v4.ODataListBinding#getContexts,"+" third parameter must not be set if extended change detection is enabled");}if(this.bRelative&&!p){this.aPreviousData=[];return[];}o=this.sChangeReason||C.Change;this.sChangeReason=undefined;if(o==="AddVirtualContext"){sap.ui.getCore().addPrerenderingTask(function(){u.sChangeReason="RemoveVirtualContext";u._fireChange({reason:C.Change});u.reset(C.Refresh);},true);v=e.create(this.oModel,this,this.oModel.resolve(this.sPath,this.oContext)+"/-2",-2);return[v];}if(o==="RemoveVirtualContext"){return[];}i=i||0;n=n||this.oModel.iSizeLimit;if(!M||M<0){M=0;}t=this.aContexts[-1]?i-1:i;G=this.oReadGroupLock;this.oReadGroupLock=undefined;if(!this.bUseExtendedChangeDetection||!this.oDiff){P=this.oCachePromise.then(function(w){if(w){G=u.lockGroup(u.getGroupId(),G);return w.read(t,n,M,G,function(){D=true;u.fireDataRequested();});}else{if(G){G.unlock();}return p.fetchValue(u.sPath).then(function(x){var y;x=x||[];y=x.$count;if(t<0){x=[x[-1]].concat(x.slice(0,n-1));}else{x=x.slice(t,t+n);}x.$count=y;return{value:x};});}});if(P.isFulfilled()&&R){P=Promise.resolve(P);}P.then(function(w){var x;if(!u.bRelative||u.oContext===p){x=u.createContexts(t,n,w.value);if(u.bUseExtendedChangeDetection){u.oDiff={aDiff:u.getDiff(w.value,t),iLength:n};}if(r){if(x){u._fireChange({reason:o});}else{u.oDiff=undefined;}}}if(D){u.fireDataReceived({data:{}});}},function(E){if(D){u.fireDataReceived(E.canceled?{data:{}}:{error:E});}throw E;}).catch(function(E){if(G){G.unlock(true);}u.oModel.reportError("Failed to get contexts for "+u.oModel.sServiceUrl+u.oModel.resolve(u.sPath,u.oContext).slice(1)+" with start index "+i+" and length "+n,s,E);});r=true;}this.iCurrentBegin=t;this.iCurrentEnd=t+n;if(t===-1){q=this.aContexts.slice(0,t+n);q.unshift(this.aContexts[-1]);}else{q=this.aContexts.slice(t,t+n);}if(this.bUseExtendedChangeDetection){if(this.oDiff&&n!==this.oDiff.iLength){throw new Error("Extended change detection protocol violation: Expected "+"getContexts(0,"+this.oDiff.iLength+"), but got getContexts(0,"+n+")");}q.dataRequested=!this.oDiff;q.diff=this.oDiff?this.oDiff.aDiff:[];}this.oDiff=undefined;return q;};l.prototype.getCurrentContexts=function(){var i,n=Math.min(this.iCurrentEnd,this.iMaxLength)-this.iCurrentBegin;if(this.iCurrentBegin===-1){i=this.aContexts.slice(0,this.iCurrentBegin+n);i.unshift(this.aContexts[-1]);}else{i=this.aContexts.slice(this.iCurrentBegin,this.iCurrentBegin+n);}while(i.length<n){i.push(undefined);}return i;};l.prototype.getDependentBindings=function(){var t=this;return this.oModel.getDependentBindings(this).filter(function(D){return!(D.oContext.getPath()in t.mPreviousContextsByPath);});};l.prototype.getDiff=function(r,n){var D,N,t=this;N=r.map(function(E,i){return t.bDetectUpdates?JSON.stringify(E):t.aContexts[n+i].getPath();});D=jQuery.sap.arraySymbolDiff(this.aPreviousData,N);this.aPreviousData=N;return D;};l.prototype.getDistinctValues=function(){throw new Error("Unsupported operation: v4.ODataListBinding#getDistinctValues");};l.prototype.getFilterInfo=function(i){var o=a.combineFilters(this.aFilters,this.aApplicationFilters),r=null,n;if(o){r=o.getAST(i);}if(this.mQueryOptions.$filter){n={expression:this.mQueryOptions.$filter,syntax:"OData "+this.oModel.getODataVersion(),type:"Custom"};if(r){r={left:r,op:"&&",right:n,type:"Logical"};}else{r=n;}}return r;};l.prototype.getHeaderContext=function(){return(this.bRelative&&!this.oContext)?null:this.oHeaderContext;};l.prototype.getLength=function(){var i;if(this.bLengthFinal){i=this.iMaxLength;}else{i=this.aContexts.length?this.aContexts.length+10:0;}if(this.aContexts[-1]){i+=1;}return i;};l.prototype.getOrderby=function(o){var i=[],t=this;this.aSorters.forEach(function(n){if(n instanceof d){i.push(n.sPath+(n.bDescending?" desc":""));}else{throw new Error("Unsupported sorter: "+n+" - "+t);}});if(o){i.push(o);}return i.join(',');};l.prototype.inheritQueryOptions=function(q,o){var i;if(!Object.keys(this.mParameters).length){i=this.getQueryOptionsForPath("",o);if(q.$orderby&&i.$orderby){q.$orderby+=","+i.$orderby;}if(q.$filter&&i.$filter){q.$filter="("+q.$filter+") and ("+i.$filter+")";}q=jQuery.extend({},i,q);}return q;};l.prototype.isLengthFinal=function(){return this.bLengthFinal;};l.prototype.mergeQueryOptions=function(q,o,i){var r;function n(p,v){if(v&&(!q||q[p]!==v)){if(!r){r=q?j.clone(q):{};}r[p]=v;}}n("$orderby",o);n("$filter",i);return r||q;};l.prototype.refreshInternal=function(G){var t=this;this.createReadGroupLock(G,this.isRefreshable());this.oCachePromise.then(function(o){if(o){t.removeCachesAndMessages();t.fetchCache(t.oContext);}t.reset(C.Refresh);t.getDependentBindings().forEach(function(D){D.refreshInternal(G,false);});});};l.prototype.refreshSingle=function(o,G,A){var t=this;if(!this.isRefreshable()){throw new Error("Binding is not refreshable; cannot refresh entity: "+o);}if(this.hasPendingChangesForPath(o.getPath())){throw new Error("Cannot refresh entity due to pending changes: "+o);}return this.oCachePromise.then(function(n){var D=false,p;function q(i){if(D){t.fireDataReceived(i);}}function r(){D=true;t.fireDataRequested();}function u(){t.oModel.getDependentBindings(o).forEach(function(i){i.refreshInternal(G.getGroupId(),false);});}function v(I){var w=t.aContexts[I],i;if(I===-1){delete t.aContexts[-1];}else{t.aContexts.splice(I,1);for(i=I;i<t.aContexts.length;i+=1){if(t.aContexts[i]){t.aContexts[i].setIndex(i);}}}w.destroy();t.iMaxLength-=1;t._fireChange({reason:C.Remove});}G.setGroupId(t.getGroupId());p=(A?n.refreshSingleWithRemove(G,o.iIndex,r,v):n.refreshSingle(G,o.iIndex,r)).then(function(){q({data:{}});if(o.oBinding){o.checkUpdate();if(A){u();}}},function(E){q({error:E});throw E;}).catch(function(E){G.unlock(true);t.oModel.reportError("Failed to refresh entity: "+o,s,E);});if(!A){u();}return p;});};l.prototype.reset=function(i){var E=this.iCurrentEnd===0,t=this;if(this.aContexts){this.aContexts.forEach(function(o){t.mPreviousContextsByPath[o.getPath()]=o;});if(this.aContexts[-1]){this.aContexts[-1].destroy();}}this.aContexts=[];this.iCurrentBegin=this.iCurrentEnd=0;this.iMaxLength=Infinity;this.bLengthFinal=false;if(i&&!(E&&i===C.Change)){this.sChangeReason=i;this._fireRefresh({reason:i});}if(this.getHeaderContext()){this.oModel.getDependentBindings(this.oHeaderContext).forEach(function(o){o.checkUpdate();});}};l.prototype.resumeInternal=function(){var i=this.getDependentBindings();this.reset();this.fetchCache(this.oContext);i.forEach(function(D){D.resumeInternal(false);});this._fireChange({reason:C.Change});};l.prototype.setAggregation=function(A){this.checkSuspended();if(this.hasPendingChanges()){throw new Error("Cannot set $$aggregation due to pending changes");}if(!this.oAggregation&&"$apply"in this.mQueryOptions){throw new Error("Cannot override existing $apply : '"+this.mQueryOptions.$apply+"'");}A=j.clone(A);this.mQueryOptions.$apply=f.buildApply(A).$apply;this.oAggregation=A;this.removeCachesAndMessages();this.fetchCache(this.oContext);this.reset(C.Change);};l.prototype.setContext=function(o){var r;if(this.oContext!==o){if(this.bRelative){if(this.aContexts[-1]&&this.aContexts[-1].isTransient()){throw new Error("setContext on relative binding is forbidden if a transient "+"entity exists: "+this);}this.reset();this.fetchCache(o);if(o){r=this.oModel.resolve(this.sPath,o);if(this.oHeaderContext&&this.oHeaderContext.getPath()!==r){this.oHeaderContext.destroy();this.oHeaderContext=null;}if(!this.oHeaderContext){this.oHeaderContext=e.create(this.oModel,this,r);}}B.prototype.setContext.call(this,o);}else{this.oContext=o;}}};l.prototype.sort=function(v){this.checkSuspended();if(this.sOperationMode!==O.Server){throw new Error("Operation mode has to be sap.ui.model.odata.OperationMode.Server");}if(this.hasPendingChanges()){throw new Error("Cannot sort due to pending changes");}this.aSorters=j.toArray(v);this.removeCachesAndMessages();this.createReadGroupLock(this.getGroupId(),true);this.fetchCache(this.oContext);this.reset(C.Sort);return this;};l.prototype.updateAnalyticalInfo=function(A){var o={aggregate:{},group:{}},H=false;A.forEach(function(i){var D={};if("total"in i){if("grouped"in i){throw new Error("Both dimension and measure: "+i.name);}if(i.as){D.name=i.name;o.aggregate[i.as]=D;}else{o.aggregate[i.name]=D;}if(i.min){D.min=true;H=true;}if(i.max){D.max=true;H=true;}if(i.with){D.with=i.with;}}else if(!("grouped"in i)||i.inResult||i.visible){o.group[i.name]=D;}});this.oAggregation=o;this.changeParameters(f.buildApply(o));this.bHasAnalyticalInfo=true;if(H){return{measureRangePromise:Promise.resolve(this.oCachePromise.then(function(i){return i.getMeasureRangePromise();}))};}};return l;});