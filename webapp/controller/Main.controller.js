sap.ui.define([
		'jquery.sap.global',
		'sap/ui/core/mvc/Controller',
		'sap/m/Popover',
		'sap/m/Button'
	], function(jQuery, Controller, Popover, Button) {
	"use strict";

	return Controller.extend("bp.controller.Main", {
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.App
		 */
		onInit: function() {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
		},
		
		onSelect   : function (oEvent) {
			var item = oEvent.getParameter('item');
			var id = item.getKey();	
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo(id);
		},
		
		onSideNavButtonPress : function(event) {
/*			var navigationList = this.getView().byId('navigationList');
			var expanded = !navigationList.getExpanded();
			navigationList.setExpanded(expanded);*/
			var viewId = this.getView().getId();
			var toolPage = sap.ui.getCore().byId(viewId + "--toolPage");
			//var sideExpanded = toolPage.getSideExpanded();

			toolPage.setSideExpanded(!toolPage.getSideExpanded());
		}		
	});
});