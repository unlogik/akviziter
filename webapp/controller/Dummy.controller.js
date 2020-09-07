sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ushell/ui/launchpad/LoadingDialog"
], function(Controller, LoadingDialog) {
	"use strict";

	return Controller.extend("vl.ism.akv.cdv.controller.Dummy", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf vl.ism.akv.cdv.view.Dummy
		 */
			onInit: function() {

                //var viewHtml = new sap.ui.core.HTML().setDOMContent(resultDocument);
                //viewHtml.placeAt("SplashContainer");
                //this.getView().byId().placeAt(viewHtml);
			}

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf vl.ism.akv.cdv.view.Dummy
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf vl.ism.akv.cdv.view.Dummy
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf vl.ism.akv.cdv.view.Dummy
		 */
		//	onExit: function() {
		//
		//	}

	});

});