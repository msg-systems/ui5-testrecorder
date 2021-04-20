/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['sap/ui/base/ManagedObject',"sap/base/security/encodeXML"],function(M,e){'use strict';var O=M.extend("sap.ui.core.support.controls.ObjectViewer",{constructor:function(){M.apply(this,arguments);this._oRenderParent=null;this._oRootObject=null;}});var r={rowstart:"<div class=\"{cssclass}\" collapsed=\"{collapsed}\" visible=\"{visible}\" style=\"padding-left:{pxlevel};margin-left: 16px;\" idx=\"{idx}\" key=\"{key}\" sectionkey=\"{sectionkey}\" level=\"level\" raise=\"_select\" hover=\"_hover\" args=\"{sectionkey},{key}\">",namestart:"<span class=\"key\" title=\"{key}\">",keyinfo:"<span class=\"keyinfo {color}\" selected=\"{selected}\" sectionkey=\"{sectionkey}\" key=\"{key}\" raise=\"_keyInfoPress\" args=\"{sectionkey},{key},{infoidx}\"  title=\"{tooltip}\" style=\"margin-right:{pxlevel}\"></span>",nameend:"{key}</span>",separator:"<span class=\"colon\">:</span>",valuestart:"<span class=\"value\" title=\"{value}\"><input {readonly} class=\"valueInput\"value=\"{value}\" raise=\"_changeValue\" args=\"{sectionkey},{key}\" autocomplete=\"off\" autocorrect=\"off\" autocapitalize=\"off\" spellcheck=\"false\">",valueend:"{value}</span>",rowend:"</div>",headerrow:"<div sectionkey=\"{sectionkey}\" collapsed=\"{collapsed}\" class=\"header\" raise=\"_toggleSection\" args=\"{sectionkey}\"><span class=\"expand\"></span>{header} ({count})</span></div>"};var I=-1;function _(o,a){I++;for(var n in o){var c=a.initialExpandedSections===null||a.initialExpandedSections.indexOf(n)===-1;a.addWithParam(r.headerrow,{idx:I,sectionkey:n,header:n,level:0,collapsed:c,count:Object.keys(o[n]).length});var C=o[n];I++;for(var m in C){a.addWithParam(r.rowstart,{idx:I,sectionkey:n,key:m,level:C._level||0,pxlevel:((C._level||0)*16)+"px",cssclass:"",visible:!c,header:n,collapsed:c});a.addWithParam(r.namestart,{key:m});var b=a.fnObjectInfos(o,n,C,m);if(b){for(var i=0;i<b.length;i++){var d=b[i];a.addWithParam(r.keyinfo,{infoidx:i+"",sectionkey:n,key:m,pxlevel:(((C[m].__level||0)*16)+3)+"px",selected:d.selected||false,color:d.color||"orange",tooltip:d.tooltip||""});}}a.addWithParam(r.nameend,{key:m});a.addWithParam(r.separator,{});a.addWithParam(r.valuestart,{value:e(String(C[m].value)),readonly:C[m].__change?"":"readonly",sectionkey:n,key:m});a.addWithParam(r.valueend,{value:e(String(C[m].value))});a.addWithParam(r.rowend,{});if("value2"in C[m]){a.addWithParam(r.rowstart,{idx:I,sectionkey:n,key:m,level:C._level||0,pxlevel:((C._level||0)*16)+"px",cssclass:"hiddenkey",visible:!c,header:n,collapsed:c});a.addWithParam(r.namestart,{key:m});var b=a.fnObjectInfos(o,n,C,m);if(b){for(var i=0;i<b.length;i++){var d=b[i];a.addWithParam(r.keyinfo,{infoidx:i+"",sectionkey:n,key:m,pxlevel:(((C[m].__level||0)*16)+3)+"px",selected:d.selected||false,color:d.color||"orange",tooltip:e(String(d.tooltip)||"")});}}a.addWithParam(r.nameend,{key:m});a.addWithParam(r.separator,{});a.addWithParam(r.valuestart,{value:e(String(C[m].value2)),readonly:"readonly",sectionkey:n,key:m});a.addWithParam(r.valueend,{value:e(String(C[m].value2))});a.addWithParam(r.rowend,{});}}}}function R(){this._aBuffer=[];var t=this;this.add=function(){t._aBuffer.push.apply(t._aBuffer,arguments);};this.addWithParam=function(s,o){for(var n in o){var a=new RegExp("\{"+n+"\}","g");s=s.replace(a,o[n]);}t.add(s);};this.toString=function(){return t._aBuffer.join("");};}O.prototype.fnSelect=function(){};O.prototype.fnHover=function(){};O.prototype.initialExpandedSections=null;O.prototype.expandedSections=[];O.prototype.setRootObject=function(o){this._oRootObject=o;};O.prototype.attachSelect=function(f){this.fnSelect=f;};O.prototype.attachHover=function(f){this.fnHover=f;};O.prototype.attachObjectInfos=function(f){this.fnObjectInfos=f;};O.prototype.attachInfoPress=function(f){this.fnInfoPress=f;};O.prototype.setInfoSelected=function(s,k,i,S){var o=this._oRenderParent.firstChild.querySelector("[args='"+s+","+k+","+i+"']");if(o){o.setAttribute("selected",S+"");}};O.prototype._keyInfoPress=function(s,k,i){i=parseInt(i,10);this.fnInfoPress(s,k,i);return true;};O.prototype._changeValue=function(s,k,v,d){if(v===undefined){return;}var o=this._oRootObject[s][k].__change(v);if(o&&o.error){d.setAttribute("error","true");d.setAttribute("title",o.error);}else{d.removeAttribute("error");if("value"in o){if(v!==""+o.value){d.setAttribute("title",v+"->"+o.value);}else{d.setAttribute("title",o.value);}d.value=o.value;}}};O.prototype._toggleSection=function(s){var S=this._oRenderParent.firstChild.querySelectorAll("[sectionkey='"+s+"']");if(S[0].getAttribute("collapsed")==="true"){for(var i=1;i<S.length;i++){S[i].setAttribute("visible","true");}S[0].setAttribute("collapsed","false");if(this.expandedSections.indexOf(s)===-1){this.expandedSections.push(s);}}else{for(var i=1;i<S.length;i++){S[i].setAttribute("visible","false");}S[0].setAttribute("collapsed","true");if(this.expandedSections.indexOf(s)>-1){this.expandedSections.splice(this.expandedSections.indexOf(s),1);}}};O.prototype._select=function(s,k){this.fnSelect(this._oRootObject[s][k],s,k);};O.prototype._hover=function(s,k){this.fnHover(this._oRootObject[s][k],s,k);};O.prototype.update=function(d){if(!d&&!this._oRenderParent){return;}if(this._oRenderParent&&d){this._oRenderParent.innerHTML="";}this._oRenderParent=d||this._oRenderParent;if(this._oRootObject){var o=new R();o.initialExpandedSections=this.initialExpandedSections;o.fnObjectInfos=this.fnObjectInfos||function(){};I=-1;o.add("<div class=\"objectviewer\" id=\""+this.getId()+"\">");if(this._oRootObject){_(this._oRootObject,o);}o.add("</div>");this._oRenderParent.innerHTML=o.toString();var t=this;this._oRenderParent.firstChild.addEventListener("click",function(E){if(E.target.tagName==="INPUT"){return;}var d=E.target,b=false,a=[];while(!b){if(d.getAttribute("raise")){if(d.getAttribute("args")){var A=d.getAttribute("args").split(",");A=A.concat(a);b=t[d.getAttribute("raise")].apply(t,A);}else{var A=[d];A=A.concat(a);b=t[d.getAttribute("raise")].apply(t,A);}}else if(d.getAttribute("reason")){a.push(d.getAttribute("reason"));}d=d.parentNode;if(d===t._oRenderParent){break;}}});this._oRenderParent.firstChild.addEventListener("mouseover",function(E){var d=E.target,b=false,a=[];while(!b){if(d.getAttribute("hover")){if(d.getAttribute("args")){var A=d.getAttribute("args").split(",");A=A.concat(a);b=t[d.getAttribute("hover")].apply(t,A);}else{var A=[d];A=A.concat(a);b=t[d.getAttribute("hover")].apply(t,A);}}else if(d.getAttribute("reason")){a.push(d.getAttribute("reason"));}d=d.parentNode;if(d===t._oRenderParent){break;}}});this._oRenderParent.firstChild.addEventListener("change",function(E){var d=E.target,b=false,a=[],v=[d.value,d];while(!b){if(d.getAttribute("raise")){if(d.getAttribute("args")){var A=d.getAttribute("args").split(",");A=A.concat(a,v);b=t[d.getAttribute("raise")].apply(t,A);}}break;}});this._oRenderParent.firstChild.addEventListener("mouseout",function(E){var d=E.target,b=false,a=[];while(!b){if(d.getAttribute("hover")){if(d.getAttribute("args")){var A=d.getAttribute("args").split(",");A=A.concat(a);b=t[d.getAttribute("hover")].apply(t,A);}else{var A=[d];A=A.concat(a);b=t[d.getAttribute("hover")].apply(t,A);}}else if(d.getAttribute("reason")){a.push(d.getAttribute("reason"));}d=d.parentNode;if(d===t._oRenderParent){break;}}});}};O.getCss=function(){return['.objectviewer {white-space: nowrap;font-family:consolas;display:block;cursor:default;width: 100%; overflow: auto; height: 100%; padding:10px; box-sizing:border-box;}','.objectviewer .key {white-space: nowrap;color: #b93232; width: 40%; overflow:hidden; display: inline-block; text-overflow: ellipsis;}','.objectviewer .hiddenkey .keyinfo{visibility:hidden}','.objectviewer .hiddenkey .colon{visibility:hidden}','.objectviewer .hiddenkey .key{visibility:hidden}','.objectviewer .value {white-space: nowrap;color: #007dc0; width: 50%; overflow:hidden; display: inline-block; text-overflow: ellipsis;}','.objectviewer .value .valueInput {font-family:consolas;border:none; padding:0; background-color:transparent;white-space: nowrap;color: #007dc0; width: 100%; overflow:hidden; display: inline-block; text-overflow: ellipsis;}','.objectviewer .value .valueInput:not([readonly])[error=\'true\'] {color:#d80000;solid 2px rgba(255, 0, 0, 0.26)}','.objectviewer .value .valueInput:not([readonly]):hover {background-color:#f5f5f5}','.objectviewer .value .valueInput:not([readonly]):focus {background-color:#fff;border:none;outline:none}','.objectviewer .colon {padding:0 6px;display: inline-block;overflow: hidden; width: 2%}','.objectviewer .header {color:#666; font-size: 14px; font-family:arial;margin: 3px 0 2px;}','.objectviewer .control .key{font-weight:bold; color:#333}','.objectviewer .control .value{font-weight:bold; color:#333}','.objectviewer .keyinfo.orange {border: 1px solid orange;}','.objectviewer .keyinfo.blue {border: 1px solid #007dc0;}','.objectviewer .keyinfo.green {border: 1px solid green;}','.objectviewer .keyinfo.red {border: 1px solid #cc1919;}','.objectviewer .keyinfo.orange[selected=\'true\'] {background-color: orange;}','.objectviewer .keyinfo.blue[selected=\'true\'] {background-color: #007dc0;}','.objectviewer .keyinfo.green[selected=\'true\'] {background-color: green;}','.objectviewer .keyinfo.red[selected=\'true\'] {background-color: #cc1919;}','.objectviewer .keyinfo {display: inline-block; border-radius: 10px; height: 10px;width: 10px;overflow: hidden; margin-right: 3px;position: relative;vertical-align: top;margin-top: 1px;}','.objectviewer .header[collapsed=\'true\'] .expand{border-color: transparent transparent transparent #cecece;border-radius: 0;border-style: solid;border-width: 4px 3px 4px 8px;height: 0;width: 0;position: relative;margin-top: 0px;margin-left: 2px;display: inline-block;}','.objectviewer [collapsed=\'false\'] .expand  {border-color: #cecece transparent transparent transparent;border-radius: 0;border-style: solid;border-width: 8px 4px 0px 4px;height: 0;width: 0;position: relative;margin-top: 0px;margin-left: 0px;margin-right: 5px;display: inline-block;}','.objectviewer [collapsed=\'true\'] .expand:hover {border-color: transparent transparent transparent #aaa;}','.objectviewer [collapsed=\'false\'] .expand:hover {border-color: #aaa transparent transparent transparent;}','.objectviewer [visible=\'false\'] {display: none}','.objectviewer .internal {opacity: 0.7}','.objectviewer .private {opacity: 0.7}','.objectviewer .default {opacity: 0.7}','.objectviewer .end { border-top:1px solid #e0e0e0; height:1px;}'].join("");};return O;});