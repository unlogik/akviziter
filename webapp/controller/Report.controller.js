sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function (Controller, History) {
	"use strict";

	return Controller.extend("bp.controller.Report", {
		onInit: function() {
		},
		onBeforeRendering: function() {
		},
		onAfterRendering: function () {
			this.getView().byId("dateCreated").fireChange();
		},
		onNavBack: function () {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("overview", {}, true);
			}
		},

		onTableInitialise: function (oEvent) {
			var oSmartTable = oEvent.getSource();
			var oSmartFilterBar = this.byId(oSmartTable.getSmartFilterId());
			if (oSmartFilterBar instanceof sap.ui.comp.smartfilterbar.SmartFilterBar) {
				var oCustomControl = oSmartFilterBar.getControlByKey("Crdat");
				if (oCustomControl instanceof sap.m.DatePicker) {
					var from = oCustomControl.getDateValue();
					var to = oCustomControl.getSecondDateValue();
					var filterData = oSmartFilterBar.getFilterData();
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
					oSmartFilterBar.setFilterData(filterData, true);
				}
			}
		},

		onDateChange: function (oEvent) {
			var oDatePicker = oEvent.getSource();
			var from = oDatePicker.getDateValue();
			if (from == null) {
				from = new Date();
			}
			var to = oDatePicker.getSecondDateValue();
			if (to == null) {
				to = new Date();
			}
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
		}
	});
});