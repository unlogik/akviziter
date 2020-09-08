sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function (Controller, History) {
	"use strict";

	return Controller.extend("vl.ism.akv.cdv.controller.Report", {
		onInit: function() {
		},
		onBeforeRendering: function() {
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
		onSFBInit: function(oEvent){
			var oSmartFilterBar = oEvent.getSource(); 
			if (oSmartFilterBar instanceof sap.ui.comp.smartfilterbar.SmartFilterBar) {
				var oCustomControl = oSmartFilterBar.getControlByKey("Crdat");
				oCustomControl.setDisplayFormat("dd.MM.yyyy");
			}
			var oModel = this.getView().getModel();
			var filterData = {
				"Crdat": {
					"low": oModel.getProperty("/UserSet('CURRENT')/DateFrom"),
					"high": oModel.getProperty("/UserSet('CURRENT')/DateTo")
				}
			};
			if(filterData.Crdat.low === undefined){
				oModel.read("/UserSet('CURRENT')",{
					success: (oResponse) => {
						var filterData = {
							"Crdat": {
								"low": oModel.getProperty("/UserSet('CURRENT')/DateFrom"),
								"high": oModel.getProperty("/UserSet('CURRENT')/DateTo")
							}
						};
						oSmartFilterBar.setFilterData(filterData, true);
						oSmartFilterBar.search();
					}
				});

			}else{
				oSmartFilterBar.setFilterData(filterData, true);
			}
		},

		// onDateChange: function (oEvent) {
		// 	var oDatePicker = oEvent.getSource();
		// 	var from = oDatePicker.getDateValue();
		// 	if (from == null) {
		// 		from = new Date();
		// 	}
		// 	var to = oDatePicker.getSecondDateValue();
		// 	if (to == null) {
		// 		to = new Date();
		// 	}
		// 	var oFilter = this.getView().byId("sf_Report");
		// 	var filterData = oFilter.getFilterData();
		// 	if (filterData) {
		// 		filterData.Crdat = {
		// 			"low": from,
		// 			"high": to
		// 		};
		// 	} else {
		// 		filterData = {
		// 			"Crdat": {
		// 				"low": from,
		// 				"high": to
		// 			}
		// 		};
		// 	}
		// 	oFilter.setFilterData(filterData, true);
		// }
	});
});