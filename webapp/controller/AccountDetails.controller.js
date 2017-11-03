sap.ui.define([
	"bp/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast",
	"sap/ui/model/Filter",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	'sap/ui/core/Fragment',
	"bp/model/formatter"
], function(BaseController, JSONModel, History, MessageToast, Filter, MessagePopover, MessagePopoverItem, Dialog, Button, Text, Fragment,
	formatter) {
	"use strict";

	var oMessageTemplate = new MessagePopoverItem({
		type: '{message>type}',
		title: '{message>message}',
		description: '{message>message}',
		subtitle: '{subtitle}',
		counter: '{counter}'
	});

	var oMessagePopover = new MessagePopover({
		items: {
			path: "message>/",
			template: oMessageTemplate
		}
	});

	return BaseController.extend("bp.controller.AccountDetails", {
		formatter: formatter,
		editable: false,
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

			this.getRouter().getRoute("AccountDetails").attachPatternMatched(this._onObjectMatched, this);

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
			oModel.read("/PartnerTitleSet");
			//*var oSelect = this.getView().byId("__ShipTo_Title");*/
			/*.setModel(oModel);*/

			//	    var oModel = this.getComponentModel();
			//var oProcessor = new sap.ui.core.message.MessageProcessor();
			//sap.ui.getCore().getMessageManager().registerMessageProcessor(oModel);
			oModel.attachMessageChange(this.onMessageChange, this);
			//oProcessor.attachMessageChange(this.onMessageChange, this);
			//sap.ui.getCore().getMessageManager().registerMessageProcessor( oData );
			// oProcessor.attachMessageChange( this._messageChange, this );
			var oMessage = sap.ui.getCore().getMessageManager().getMessageModel();
			this.getView().setModel(oMessage, "message");
			oMessagePopover.setModel(oMessage, "message");
			sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);

			// var oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			// var oMessageManager  = sap.ui.getCore().getMessageManager();
			// oMessageManager.registerMessageProcessor(oMessageProcessor);	
			try {
				var oTable = this.getView().byId("_table").getTable();
			} catch (err) {

			};
			var aColums = oTable.getColumns();
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf bp.view.view.AccountDetails
		 */
		onBeforeRendering: function() {
			this.setViewModel();
			this.setViewProperty("editable", false);
			//this.adjustViewModel();

		},

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
		onExit: function() {
			this._toggleButtonsAndView(false);
			this.setViewProperty("editable", false);
		},

		adjustViewModel: function() {
			var oView = this.getModel();
			var oModel = this.getComponentModel();
			var oViewModel = this.getModel("view");
			if (oViewModel === undefined) {
				oViewModel = new JSONModel({
					editable: false
				});
				this.setModel(oViewModel, "view");
			}
		},

		onNavBack: function() {
			var oHistory = History.getInstance();
			var sPreviousHash = oHistory.getPreviousHash();
			var regex = new RegExp(".*/NEW$");
			if (sPreviousHash !== undefined) {
				if (regex.test(sPreviousHash)) { //avoid returning to dummy NEW setid
					window.history.go(-2);
				} else {
					window.history.go(-1);
				}
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

		onAddOrder: function() {
			var that = this;
			var oView = this.getView();
			var oData = oView.getBindingContext().getObject();
			var oModel = this.getModel();
			var sModel = this.getViewProperty("model");
			if (!sModel) {
				this.msgToast(this.getI18n("msgNoModel"));
				return;
			}
			oModel.create("/OrderSet", {
				Setid: oData.Setid,
				Model: sModel
			}, {
				success: function(oData_, response) {
					that.msgToast(that.getI18n('msgModelAdded', sModel));
					that.setViewProperty("model", "");
					//oModel.update("/PartnerSet('" + oData.Setid + "')", oData);
					//oModel.update(sPath, oData);
					//oView.byId("_tableOrders").setTableBindingPath("PartnerToOrders");
				},
				error: function(oResponse) {
					var response = JSON.parse( oResponse.response.body );
					MessageBox.show(response.message, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>msgTileError}"
					});
				}
			});
		},

		onDeleteOrder: function() {
			//is there something selected?
			if (this.getView().byId("_tableOrders").getItems().length === 0) {
				return;
			}
			//are you 100% sure about deletion?
			var dialog = new Dialog({
				title: 'Confirm',
				type: 'Message',
				content: new Text({
					text: '{i18n>msgDeleteQuestion}'
				}),
				beginButton: new Button({
					text: "{i18n>delButton}",
					press: function() {
						this._deleteOrder();
						dialog.close();
					}.bind(this)
				}),
				endButton: new Button({
					text: 'Cancel',
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			//bind model to access translations
			dialog.setModel(this.getModel("i18n"), "i18n");
			dialog.open();
		},

		_deleteOrder: function() {
		    var that = this;
			var oModel = this.getModel();
			var oView = this.getView();
			var oData = oView.getBindingContext().getObject();
			oModel.remove("/OrderSet(Setid='" + oData.Setid + "',Oppit='0001')",  {
				success: function(oData) {
					MessageToast.show(that.getI18n("msgDataDeleted") );
				},
				error: function(oResponse) {
					var response = JSON.parse( oResponse.response.body );
					MessageBox.show(response.message, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>msgTileError}"
					});
				},
			});
		},

		onDoublesDisplay: function(oEvent) {
			var sPath = oEvent.getSource().getId().match(/[^_]+$/);;
			if (!this._oDoublesPopover) {
				this._oDoublesPopover = sap.ui.xmlfragment("_popoverDoubles", "bp.view.AccountDoubles", this);
				//this._oDoublesPopover.setModel( this.getComponentModel() );
				//var oContext = this.getView().getBindingContext();
				//var path = oContext.getPath();
				//this._oDoublesPopover.bindElement( oContext.getPath() );
				//Add the popover as a view dependent, giving it access to the view model
				this.getView().addDependent(this._oDoublesPopover);
			}
			/*else{
						    var oView = this.getView();
						    var oList = sap.ui.core.Fragment.byId("_popoverDoubles", "_doublesList");
						    var oContext = this._oDoublesPopover.getBindingContext();
						    var path = oContext.getPath();
						}*/
			var oButtonOpen = oEvent.getSource();
			var buttonChanged = (this.doublesPopoverLastOpenBy === oButtonOpen.getId()) ? false : true;
			this.doublesPopoverLastOpenBy = oButtonOpen.getId();

			if (this._oDoublesPopover.isOpen() && !buttonChanged) {
				this._oDoublesPopover.close();
			} else {
				this.setViewProperty("editable", this.editable);
				sPath = this.getView().getBindingContext().getPath() + "/" + sPath
				var oTable = Fragment.byId("_popoverDoubles", "_tableDoubles");
				var oButton = Fragment.byId("_popoverDoubles", "_btnDoublesAccept");
				oButton.detachPress(this.onDoublesSelect, this);
				oButton.attachPress({
					source: sPath
				}, this.onDoublesSelect, this);
				var oButton = Fragment.byId("_popoverDoubles", "_btnDoublesUnselect");
				oButton.detachPress(this.onDoublesUnselect, this);
				oButton.attachPress({
					source: sPath
				}, this.onDoublesUnselect, this);
				var oTemplate = oTable.getBindingInfo("items").template;
				oTable.bindItems({
					path: sPath,
					template: oTemplate
				});
				if (this.getViewProperty("editable")) {
					oTable.setMode("SingleSelect");
				} else {
					oTable.setMode();
				}
				// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
				jQuery.sap.delayedCall(0, this, function() {
					this.onDoublesBack();
					this._oDoublesPopover.openBy(oButtonOpen);
				});
			}
		},

		onDoublesDetail: function(oEvent) {
			var oItem = oEvent.getSource();
			var oCtx = oItem.getBindingContext();
			oItem.setSelected(true);
			var oNavCon = Fragment.byId("_popoverDoubles", "navCon");
			var oDetailPage = Fragment.byId("_popoverDoubles", "detail");
			oNavCon.to(oDetailPage);
			oDetailPage.bindElement(oCtx.getPath());
		},

		onDoublesBack: function(oEvent) {
			var oNavCon = Fragment.byId("_popoverDoubles", "navCon");
			oNavCon.back();
		},

		onDoublesSelect: function(oEvent, oParam) {
			var oTable = Fragment.byId("_popoverDoubles", "_tableDoubles");
			var oItem = oTable.getSelectedItem();
			var oContext = oItem.getBindingContext();
			var partnerid = oContext.getProperty("Partnerid");
			var addrnumber = oContext.getProperty("AddrNumber");
			var sPath = oTable.getBindingContext().getPath();
			sPath = sPath + this.doublesGetPath(oParam);
			var oModel = this.getView().getModel();
			oModel.setProperty(sPath + "/Partnerid", partnerid);
			oModel.setProperty(sPath + "/Adrnr", addrnumber);
			this.getComponentModel().submitChanges({
				groupID: "Partner"
			});
			var oInfo = oTable.getBindingInfo();
			this._oDoublesPopover.close();
		},

		onDoublesUnselect: function(oEvent, oParam) {
			var oTable = Fragment.byId("_popoverDoubles", "_tableDoubles");
			var sPath = oTable.getBindingContext().getPath();
			sPath = sPath + this.doublesGetPath(oParam);
			var oModel = this.getView().getModel();
			oModel.setProperty(sPath + "/Partnerid", "");
			oModel.setProperty(sPath + "/Adrnr", "");
			this.getComponentModel().submitChanges({
				groupID: "Partner"
			});
			this._oDoublesPopover.close();
		},

		doublesGetPath: function(oParam) {
			var sAssociation = oParam.source.match(/[^/]+$/); //extract associatin from path
			switch (sAssociation[0]) {
				case "ShipToDoubles":
					return "/ShipTo";
				case "SoldToDoubles":
					return "/SoldTo";
			}
		},

		onModelValueHelp: function() {
			var that = this;
			var oInput = this.getView().byId("_inputModel");
			var oValueHelpDialog = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				//basicSearchText: "Odaberi Model", //this.theTokenInput.getValue(), 
				title: "Company",
				supportMultiselect: false,
				supportRanges: false,
				supportRangesOnly: false,
				key: "ModelId", //this.aKeys[0],				
				descriptionKey: "Ltext", //this.aKeys[1],
				stretch: sap.ui.Device.system.phone,

				ok: function(oEvent) {
					//that.aTokens = oControlEvent.getParameter("tokens");
					//that.theTokenInput.setTokens(that.aTokens);
					/*eslint no-debugger: "error"*/
					debugger;
					var aTokens = oEvent.getParameter("tokens");
					if (aTokens.length > 0) {
						oInput.setValue(aTokens[0].getKey());
						oInput.setTooltip(aTokens[0].getText());
					}
					oValueHelpDialog.close();
				},
				cancel: function(oControlEvent) {
					//sap.m.MessageToast.show("Cancel pressed!");
					oValueHelpDialog.close();
				},
				afterClose: function() {
					oValueHelpDialog.destroy();
				}
			});

			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setData({
				cols: [{
					label: "Model",
					template: "ModelId"
				}, {
					label: "Opis",
					template: "Ltext"
				}]
			});
			oValueHelpDialog.getTable().setModel(oColModel, "columns");

			var oModel = this.getView().getModel();
			oValueHelpDialog.getTable().setModel(oModel);
			if (oValueHelpDialog.getTable().bindRows) {
				oValueHelpDialog.getTable().bindRows("/ModelSet");
			}
			// 		if (oValueHelpDialog.getTable().bindItems) { 
			// 			var oTable = oValueHelpDialog.getTable();
			// 			oTable.bindAggregation("items", "/ModelSet", function(sId, oContext) { 
			// 				var aCols = oTable.getModel("columns").getData().cols;
			// 				return new sap.m.ColumnListItem({
			// 					cells: aCols.map(function (column) {
			// 						var colname = column.template;
			// 						return new sap.m.Label({ text: "{" + colname + "}" });
			// 					})
			// 				});
			// 			});
			// 		}	

			//oValueHelpDialog.setTokens(this.theTokenInput.getTokens());

			var oFilterBar = new sap.ui.comp.filterbar.FilterBar({
				advancedMode: true,
				filterBarExpanded: false,
				showGoOnFB: !sap.ui.Device.system.phone,
				filterGroupItems: [new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n1",
						label: "Model",
						control: new sap.m.Input()
					}),
					new sap.ui.comp.filterbar.FilterGroupItem({
						groupTitle: "foo",
						groupName: "gn1",
						name: "n2",
						label: "Opis",
						control: new sap.m.Input()
					})
				],
				search: function() {
					sap.m.MessageToast.show("Search pressed");
				}
			});

			if (oFilterBar.setBasicSearch) {
				oFilterBar.setBasicSearch(new sap.m.SearchField({
					showSearchButton: sap.ui.Device.system.phone,
					placeholder: "Search",
					search: function(event) {
						oValueHelpDialog.getFilterBar().search();
					}
				}));
			}

			oValueHelpDialog.setFilterBar(oFilterBar);
			oValueHelpDialog.addStyleClass("sapUiSizeCompact");

			oValueHelpDialog.open();
			oValueHelpDialog.update();
		},

		onEnter: function(oEvent) {
			this.onSave();
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
			var sCity;
			if (oEvent.getSource().getId().match(/SoldTo/)) {
				sCity = this.getView().getBindingContext().getProperty("SoldTo/Ort01")
			} else {
				sCity = this.getView().getBindingContext().getProperty("ShipTo/Ort01")
			}
			var sTerm = oEvent.getParameter("suggestValue");
			var aFilters = [];
			if (sTerm) {
				aFilters.push(new Filter("Street", sap.ui.model.FilterOperator.StartsWith, sTerm));
				if (sCity) {
					aFilters.push(new Filter("CityCode", sap.ui.model.FilterOperator.EQ, sCity));
				}
			}
			oEvent.getSource().getBinding("suggestionRows").filter(aFilters);
		},

		onSoldToName1Change: function(oEvent) {
			if (oEvent.getParameters().value === "") {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},

		onSoldToCityChange: function(oEvent) {
			if (oEvent.getParameters().value === "") {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},

		onSoldToPostcodeChange: function(oEvent) {
			if (oEvent.getParameters().value === "") {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},

		onSoldToStreetChange: function(oEvent) {
			if (oEvent.getParameters().value === "") {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},
		onSoldToOIBChange: function(oEvent) {
			if (oEvent.getParameters().value === "") {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
			} else {
				oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
			}
		},

		onMessages: function(oEvent) {
			if (oMessagePopover.isOpen()) {
				oMessagePopover.close();
			} else {
				oMessagePopover.openBy(oEvent.getSource());
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
			var sObjectId = oEvent.getParameter("arguments").SetId;
			var sEditable = oEvent.getParameter("arguments").Editable;
			this.getModel().metadataLoaded().then(function() {
				var sObjectPath = this.getModel().createKey("PartnerSet", {
					"SAP__Origin": "CDV",
					Setid: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
			var bEditable = sObjectId === 'NEW' ? true : false;
			if (!bEditable) {
				bEditable = sEditable === 'true' ? true : false;
			}
			this._toggleButtonsAndView(bEditable);
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function(sObjectPath) {
			var oDataModel = this.getModel();
			var that = this;
			this.getView().bindElement({
				path: sObjectPath,
				parameters: {
					expand: "PartnerToOrders,SoldToDoubles,ShipToDoubles"
				},
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function() {
						oDataModel.metadataLoaded().then(function() {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							that.setViewProperty("busy", true);
						});
					},
					dataReceived: function() {
						that.setViewProperty("busy", false);
					}
				}
			});
		},

		_onBindingChange: function() {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();
			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}
			// Everything went fine.
			this.setViewProperty("busy", false);
			this.setViewProperty("messageShow", false);
		},

		onEdit: function() {
			this.setViewProperty("editable", true);
			this._toggleButtonsAndView(true);
		},

		onCancel: function() {
			var oView = this.getView();
			var setid = oView.getBindingContext().getObject().Setid;
			//Restore the data
			oView.getModel().resetChanges();
			//do the navigation
			if (setid === 'NEW') {
				this.onNavBack();
			} else {
				this._toggleButtonsAndView(false);
				this.setViewProperty("editable", false);
			}
		},

		onSave: function() {
			var that = this;
			var oView = this.getView();
			//var oData = oView.getBindingContext().getObject();
			var oData = this.getPartnerSet(oView);
			var sPath = oView.getBindingContext().sPath;
			var oModel = this.getModel();
			if (oData.Setid === 'NEW') {
				oModel.create("/PartnerSet", oData, {
					success: function(oData, response) {
						var oRouter = sap.ui.core.UIComponent.getRouterFor(that);
						oRouter.navTo("AccountDetails", {
							SetId: oData.Setid,
							Editable: "true"
						});
					},
					error: function(oError) {
						sap.m.MessageToast.show(oError);
					}
				});
			} else {
				//oModel.update(sPath, oData);
				oModel.submitChanges({
					groupID: "Partner,Order"
				});
			}
			//this._toggleButtonsAndView(false);
			// 			var oInput = this.byId("__SoldTo_Stras");
			// 			var path = oInput.getBindingPath();
			// 			var el = oInput.getBindingContext().getPath();
		},
		getPartnerSet: function(oView) {
			var oModel = this.getComponentModel();
			var oData = oView.getBindingContext().getObject();
			var rData = {};
			rData.Setid = oData.Setid;
			rData.Akvid = oModel.getProperty("/UserSet('CURRENT')/Akvid");
			rData.ShipTo = oData.ShipTo;
			rData.SoldTo = oData.SoldTo;
			return rData;
		},

		dateChange: function(oEvent) {
			var TZOffsetMs = new Date(0).getTimezoneOffset() * 120 * 1000;
			var oDatePicker = oEvent.getSource();
			var oDate = oDatePicker.getDateValue();
			oDatePicker.setDateValue(new Date(oDate.getTime() - TZOffsetMs));
		},

		_toggleButtonsAndView: function(bEdit) {
			var oView = this.getView();
			// Show the appropriate action buttons
			oView.byId("__edit").setVisible(!bEdit);
			oView.byId("__save").setVisible(bEdit);
			oView.byId("__cancel").setVisible(bEdit);
			// Set the right form type
			this._showFormFragment(bEdit ? "Change" : "Display");
			this.editable = bEdit;
		},

		_getFormFragment: function(sFragmentName) {
			var oFormFragment = this._formFragments[sFragmentName];
			if (!oFormFragment) {
				oFormFragment = this._formFragments[sFragmentName] = sap.ui.xmlfragment(this.getView().getId(), "bp.view.AccountForm" +
					sFragmentName, this);
			}
			return oFormFragment;
		},

		_formFragments: function() {},

		_showFormFragment: function(sFragmentName) {
			var oPage = this.getView().byId("page");
			oPage.removeAllContent();
			oPage.insertContent(this._getFormFragment(sFragmentName));
		},

		_messageChange: function(oData, fnFunction, oListener) {
			var lDAta = oData;
		},

		onMessageChange: function(oEvent) {
			//var count = oEvent.getParameter("newMessages").length;
			var oMessage = sap.ui.getCore().getMessageManager().getMessageModel();
			var count = oMessage.getData().length
			this.setViewProperty("messageCount", count);
			//this.setViewProperty("messageShow", true);
			this.setViewProperty("messageShow", (count > 0) ? true : false);
		}

	});

});