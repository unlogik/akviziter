sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function(Controller, History) {
	"use strict";

	return Controller.extend("bp.controller.Accounts", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.Accounts
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf bp.view.Accounts
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf bp.view.Accounts
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf bp.view.Accounts
		 */
		//	onExit: function() {
		//
		//	}		,
		onNavBack: function() {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("overview", {}, true);
			}
		},
		onBPDetails: function(oEvent) {
			// The source is the list item that got pressed
			var oItem = oEvent.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("object", {
				objectId: oItem.getBindingContext().getProperty("Setid")
			});
		},
		onAdd: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			var oModel = this.getView().getModel();
			oModel.create("/PartnerSet", { Setid: '0', Akvid : 'AQ1', Pubid:'PB1' }, {
                async : false,
                success : function(oData, response) {
			        oRouter.navTo("object", { objectId: oData.Setid } );
                    //sSuccessMessage += oView.getModel("i18n").getProperty("NewEntry") + ": " + oData.Kjahr + " " + oData.Hjahr + "\r\n";
                },
                error : function(oError) {
                    var oResponseBody = JSON.parse(oError.response.body);
                   // console.log(oResponseBody);
                }
            });
			oRouter.navTo("AccountDetails");
		}

	});

});