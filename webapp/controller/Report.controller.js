sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function(Controller, History) {
	"use strict";

	return Controller.extend("bp.controller.Report", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.App
		 */
		//	onInit: function() {
		//
		//	},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf bp.view.App
		 */
		/*		onBeforeRendering: function() {
				},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf bp.view.App
		 */
		onAfterRendering: function() {
			this.getView().byId("dateCreated").fireChange();
		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf bp.view.App
		 */
		//	onExit: function() {
		//
		//	}
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

		onBeforeRebindTable: function(oEvent) {
			// Get bindinParams Object, which includes filters
			var oBindingParams = oEvent.getParameter("bindingParams");
			// Create the aFilters array
			//var aFilters = oBindingParams.filters;
			// Create the table object
			var oSmartTable = oEvent.getSource();
			// Get the SmartFilterBarID
			var oSmartFilterBar = this.byId(oSmartTable.getSmartFilterId());
			if (oSmartFilterBar instanceof sap.ui.comp.smartfilterbar.SmartFilterBar) {
				var oCustomControl = oSmartFilterBar.getControlByKey("Crdat");
				if (oCustomControl instanceof sap.m.DatePicker) {
					var from = oCustomControl.getDateValue();
					var to = oCustomControl.getSecondDateValue();
					oBindingParams.filters.push(new sap.ui.model.Filter("Crdat", "BT", from, to ));
				}
			}
		},

		onDateChange: function(oEvent) {
			var oDatePicker = oEvent.getSource();
			var from = oDatePicker.getDateValue();
			var to = oDatePicker.getSecondDateValue();
			var oFilter = this.getView().byId("sf_Report");
			var filterData = oFilter.getFilterData();
			if (filterData) {
				filterData.Crdat = {
					"low": from,
					"high": to
				};
			} else {
				filterData = {
					"Crdat": {
						"low": from,
						"high": to
					}
				};
			}
			oFilter.setFilterData(filterData, true);
			var newFilter = new sap.ui.model.Filter("Crdat", sap.ui.model.FilterOperator.BT, from, to);
		}

	});

});