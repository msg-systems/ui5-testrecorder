/*!
 * UI development toolkit for HTML5 (OpenUI5)
 * (c) Copyright 2009-2018 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(['./Element','./library'],function(E,l){"use strict";var T=l.TitleLevel;var a=E.extend("sap.ui.core.Title",{metadata:{library:"sap.ui.core",properties:{text:{type:"string",group:"Appearance",defaultValue:null},icon:{type:"sap.ui.core.URI",group:"Appearance",defaultValue:null},level:{type:"sap.ui.core.TitleLevel",group:"Appearance",defaultValue:T.Auto},emphasized:{type:"boolean",group:"Appearance",defaultValue:false}}}});return a;});
