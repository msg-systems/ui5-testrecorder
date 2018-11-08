/*!
* SAP
* (c) Copyright 2015 SAP SE or an SAP affiliate company.
* Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
*/
(function e(t, n, r) { function s(o, u) { if (!n[o]) { if (!t[o]) { var a = typeof require == "function" && require; if (!u && a) return a(o, !0); if (i) return i(o, !0); var f = new Error("Cannot find module '" + o + "'"); throw f.code = "MODULE_NOT_FOUND", f } var l = n[o] = { exports: {} }; t[o][0].call(l.exports, function (e) { var n = t[o][1][e]; return s(n ? n : e) }, l, l.exports, e, t, n, r) } return n[o].exports } var i = typeof require == "function" && require; for (var o = 0; o < r.length; o++)s(r[o]); return s })({
    1: [function (require, module, exports) {
        (function () {
            'use strict';

            // Inject a script file in the current page
            var script = document.createElement('script');
            script.src = chrome.extension.getURL('/scripts/injected/ui5Testing.js');
            document.head.appendChild(script);

            var head = document.getElementsByTagName('head')[0];
            var link = document.createElement('link');
            link.id = "testing_ui5";
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.extension.getURL('/scripts/injected/style.css');
            link.media = 'all';
            head.appendChild(link);

            var oInitializedPromise = new Promise(function (resolve, reject) {
                document.addEventListener('do-ui5-ok', function (oXMLEvent) {
                    if (!oXMLEvent.detail.ok) {
                        reject();
                    }
                    resolve();
                });
            });
            /**
             * Delete the injected file, when it is loaded.
             */
            script.onload = function () {
                script.parentNode.removeChild(script);

                //send the data
                var sPopoverAction = "";
                var sPopover = "";
                var onDone = function () {
                    if (!(sPopover.length > 0 && sPopoverAction.length > 0)) {
                        return;
                    }
                    oInitializedPromise.then(function () {
                        document.dispatchEvent(new CustomEvent('do-ui5-send-xml-view', { detail: { popover: sPopover, settings: sPopoverAction } }));
                        document.dispatchEvent(new CustomEvent('do-ui5-start'));
                    });
                };
                var sUrl = chrome.extension.getURL('/scripts/injected/PopoverActionSettings.fragment.xml');
                var xhr = new XMLHttpRequest();
                xhr.open('GET', sUrl);
                xhr.send(null);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        sPopoverAction = xhr.responseText;
                        onDone();
                    }
                };

                var xhr2 = new XMLHttpRequest();
                sUrl = chrome.extension.getURL('/scripts/injected/Popover.fragment.xml');
                xhr2.open('GET', sUrl);
                xhr2.send(null);
                xhr2.onreadystatechange = function () {
                    if (xhr2.readyState === 4) {
                        sPopover = xhr2.responseText;
                        onDone();
                    }
                };
            };

            oInitializedPromise.then(function () {
                var oLastDom = null;
                document.addEventListener("mousedown", function (event) {
                    //right click
                    if (event.button == 2) {
                        oLastDom = event.target;
                    }
                }, true);

                chrome.runtime.onMessage.addListener(
                    function (request, sender, sendResponse) {
                        sendResponse({ ui5TestingRegistered: true });
                        if (request.startForControl) {
                            if (oLastDom) {
                                document.dispatchEvent(new CustomEvent('do-ui5-start', { detail: { domId: oLastDom.id } }));
                                return;
                            }
                        } else if (request.checkRegistration) {
                            sendResponse(true);
                            return;
                        } else if (request.showCode) {
                            document.dispatchEvent(new CustomEvent('do-show-code'));
                            return;
                        }
                        document.dispatchEvent(new CustomEvent('do-ui5-switch'));
                    });
            });
        }());

    }, {}]
}, {}, [1]);
