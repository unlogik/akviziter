sap.ui.define([
	"bp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/ui/model/Filter"
], function(BaseController, JSONModel, History, MessageToast, Filter) {
	"use strict";

	return BaseController.extend("bp.controller.AccountDetails", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.view.AccountDetails
		 */

		onInit: function() {
			this.sCityCode = null;
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function() {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			});

			// Set the initial form to be the display one
			this._showFormFragment("Display");
			var oModel = this.getOwnerComponent().getModel();
			var oSelect = this.getView().byId("__ShipTo_Title");
			/*.setModel(oModel);*/
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf bp.view.view.AccountDetails
		 */
		//	onBeforeRendering: function() {
		//
		//	},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf bp.view.view.AccountDetails
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf bp.view.view.AccountDetails
		 */
		// 			onExit: function() {
		// 		this._toggleButtonsAndView(false);
		// 			},

		onNavBack: function() {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("overview", {}, true);
			}
			this._toggleButtonsAndView(false);
		},
		/**
		 * Event handler for press event on object identifier.
		 * opens detail popover from component to show product dimensions.
		 * @public
		 */
		onShowDetailPopover: function(oEvent) {
			// fetch and bind popover
			var oPopover = this._getPopover();
			oPopover.bindElement(oEvent.getSource().getBindingContext().getPath());

			// open it at the current position
			var oOpener = oEvent.getParameter("domRef");
			oPopover.openBy(oOpener);
		},

		/**
		 * Event handler for the custom rating control.
		 * It is called when the user changed the rating value and pressed the rate button
		 * @public
		 */
		onRatingChanged: function(oEvent) {
			var iValue = oEvent.getParameter("value"),
				sMessage = this.getResourceBundle().getText("productRatingSuccess", [iValue]);

			MessageToast.show(sMessage);
		},

		onCitySuggest: function(oEvent) {
			var sTerm = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sTerm) {
				aFilters.push(new Filter("CityName", sap.ui.model.FilterOperator.StartsWith, sTerm));
			}
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},

		onCitySelect: function(oEvent) {
			var row = oEvent.getParameters().selectedRow;
			var text = row.getCells()[1];
			this.sCityCode = text.getText();
		},

		onStreetSuggest: function(oEvent) {
			var sTerm = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sTerm) {
				aFilters.push(new Filter("Street", sap.ui.model.FilterOperator.StartsWith, sTerm));
				if (this.sCityCode) {
					aFilters.push(new Filter("CityCode", sap.ui.model.FilterOperator.EQ, this.sCityCode));
				}
			}
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},

		onSoldToName1Change: function(oEvent) {
			if (oEvent.getParameters().value === ""){
			    oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			}
		},

		_getPopover: function() {
			// create dialog lazily via fragment factory
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("opensap.manageproducts.view.DetailPopover", this);
				this.getView().addDependent(this._oPopover);
			}
			return this._oPopover;
		},
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function(oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("PartnerSet", {
					"SAP__Origin": "CDV",
					Setid: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			this._toggleButtonsAndView(false);
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function(sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oDataModel.metadataLoaded().then(function() {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function() {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			// Everything went fine.
			oViewModel.setProperty("/busy", false);
		},

		onEdit: function() {
			this._toggleButtonsAndView(true);
		},

		onCancel: function() {
			//Restore the data
			var oModel = this.getView().getModel();
			oModel.resetChanges();
			
			this._toggleButtonsAndView(false);
		},

		onSave: function() {
			var oView = this.getView();
			var oData = oView.getBindingContext().getObject();
			var sPath = oView.getBindingContext().sPath;
			var oModel = this.getModel();
			var data = {
				path: sPath,
				data: oData
			};

			oModel.update(data.path, data.data);

			this._toggleButtonsAndView(false);
		},

		_toggleButtonsAndView: function(bEdit) {
			var oView = this.getView();
			// Show the appropriate action buttons
			oView.byId("__edit").setVisible(!bEdit);
			oView.byId("__save").setVisible(bEdit);
			oView.byId("__cancel").setVisible(bEdit);
			// Set the right form type
			this._showFormFragment(bEdit ? "Change" : "Display");
		},

		_formFragments: {},

		_getFormFragment: function(sFragmentName) {
			var oFormFragment = this._formFragments[sFragmentName];
			if (!oFormFragment) {
				oFormFragment = this._formFragments[sFragmentName] = sap.ui.xmlfragment(this.getView().getId(), "bp.view.AccountForm" +
					sFragmentName, this);
			}
			return oFormFragment;
		},

		_showFormFragment: function(sFragmentName) {
				var oPage = this.getView().byId("page");
				oPage.removeAllContent();
				oPage.insertContent(this._getFormFragment(sFragmentName));
			}
			/*,

					onCustomer: function(){
					    var fragmentId = this.getView().createId("").replace(new RegExp("--$"),"");
			            var oText = sap.ui.core.Fragment.byId(fragmentId, "__ShipTo_Title");
					    oText.bindItems("/PartnerTitleSet");
					}*/

	});

});