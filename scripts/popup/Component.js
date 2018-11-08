sap.ui.define([
    'sap/ui/core/UIComponent',
], function (UIComponent) {
    'use strict';

    return UIComponent.extend('com.ui5.testing.Component', {
        metadata: {
            manifest: 'json'
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();
        },

        destroy: function () {
            UIComponent.prototype.destroy.apply(this, arguments);
        },
        
        getContentDensityClass: function () {
            return 'sapUiSizeCompact';
        }

    });
});