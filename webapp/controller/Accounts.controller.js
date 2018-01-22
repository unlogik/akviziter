sap.ui.define([
	"bp/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/ui/core/util/Export",
	"sap/ui/core/util/ExportTypeCSV",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/ui/core/Fragment",
	"bp/model/formatter",
	"bp/lib/JsXlsx",
	"bp/lib/jszip.min",
	"bp/lib/xlsx.min",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter"
], function(BaseController, History, Export, ExportTypeCSV, MessageBox, MessageToast, MessagePopover, MessagePopoverItem, Dialog, Button,
	Text, Fragment, formatter, XLSX_, JSZip, xlsx, Filter, Sorter) {
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

	return BaseController.extend("bp.controller.Accounts", {
		_oVSDialog: null, // set on demand
		formatter: formatter,
		_oViewSettings: {
			filter: {},
			groupProperty: "category",
			groupDescending: false,
			compactOn: false,
			themeActive: "sap_belize",
			rtl: false,
			version: jQuery.sap.Version(sap.ui.version).getMajor() + "." + jQuery.sap.Version(sap.ui.version).getMinor()
		},
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.Accounts
		 */
		onInit: function() {
			var oModel = this.getComponentModel();
			sap.ui.getCore().getMessageManager().registerMessageProcessor(oModel);
			var oMessage = sap.ui.getCore().getMessageManager().getMessageModel();
			this.getView().setModel(oMessage, "message");
			oMessagePopover.setModel(oMessage, "message");
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf bp.view.Accounts
		 */
		onBeforeRendering: function() {
			this.setViewModel();
		},

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
			oRouter.navTo("AccountDetails", {
				SetId: oItem.getBindingContext().getProperty("Setid")
			});
		},
		onAdd: function() {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("AccountDetails", {
				SetId: "NEW"
			});
			/*				var oModel = this.getView().getModel();
						oModel.create("/PartnerSet", {
							Setid: '0',
							Akvid: 'AQ1',
							Pubid: 'PB1'
						}, {
							async: false,
							success: function(oData, response) {
								oRouter.navTo("object", {
									objectId: oData.Setid
								});
								//sSuccessMessage += oView.getModel("i18n").getProperty("NewEntry") + ": " + oData.Kjahr + " " + oData.Hjahr + "\r\n";
							},
        					error: function(oResponse) {
        						var response = JSON.parse(oResponse.response.body);
        						MessageBox.show(response.message, {
        							icon: sap.m.MessageBox.Icon.ERROR,
        							title: "{i18n>msgTileError}"
        						});
        					}
						});
						oRouter.navTo("AccountDetails");*/
		},

		onUpload: function(oEvent) {
			var files = oEvent.getParameter("files");
			if (files && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function(e) {
					this._createFromXLSX(e, files[0])
				}.bind(this);
				reader.readAsBinaryString(files[0]);
			}
			oEvent.clear();
		},

		onSubmit: function(oEvent) {
			//is there something selected?
			if (!this._validateSelected()) {
				return;
			}
			//var oSelected = this.getView().byId("__tablePartners").getSelectedItems();
			//are you 100% sure about deletion?
			var dialog = new Dialog({
				title: 'Confirm',
				type: 'Message',
				content: new Text({
					text: this.getI18n("msgSubmitPopup")
				}),
				beginButton: new Button({
					text: "{i18n>submitButton}",
					press: function() {
						this._submit();
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

		_submit: function(e) {
			var oModel = this.getView().getModel();
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			for (var i = 0; i < aItems.length; i++) {
				var sPath = aItems[i].getBindingContextPath();
				oModel.setProperty(sPath + "/Status", "P");
				/*var id = aItems[i].getCells()[0].getText();
				var oData = {
					"Status": "P"
				};
				oModel.update("/PartnerSet('" + id + "')", oData, {
					success: jQuery.proxy(function() {
						jQuery.sap.require("sap.m.MessageToast");
						MessageToast.show("el Vuelo '" + name + "' se elimino con exito.");
					}, this),
				});*/
			}
			oModel.submitChanges("Partner");
		},

		_createFromXLSX: function(e, file) {
			var data = e.target.result;
			var wb = XLSX.read(data, {
				type: 'binary'
			});
			//wb.SheetNames.forEach(function(sheetName) {
			var json = XLSX.utils.sheet_to_row_object_array(wb.Sheets["Partner"]);
			//if (roa.length > 0) {
			//  result[sheetName] = roa;
			//alert(JSON.stringify(result));
			//}
			//});
			var oModel = this.getModel();
			//Prep header-level group/changeset params  
			var mParameters = {
				"groupId": "Partner",
				"changeSetId": "grpid",
				"success": this._createBatchSuccess.bind(this),
				"error": this._createBatchError.bind(this) //function(oError) { }.bind(this)
			};
			for (var i = 2; i < json.length; i++) {
				var entity = this._parseEntity(json[i]);
				entity.FileName = file.name;
				oModel.create("/PartnerSet", entity, mParameters);
			}
			oModel.submitChanges(mParameters);
		},
		/* parse excel table format to oData format
		 */
		_parseEntity: function(json) {
			var oModel = this.getModel();
			var bptype = null;
			var field = null;
			var entity = {
				"Akvid": oModel.getProperty("/UserSet('CURRENT')/Akvid"),
				"Pubid": "PB1",
				"SoldTo": {},
				"ShipTo": {}
			}
			for (var key in json) {
				bptype = key.match(/^[^_]*/);
				field = key.match(/[^_]*$/);
				if (bptype) {
					bptype = bptype[0];
				}
				if (field) {
					field = field[0];
				}
				switch (field) {
					case "Title":
						entity[bptype][field] = json[key].match(/\d{2}/)[0];
						break;
					default:
						entity[bptype][field] = json[key];
				}
			}
			return entity;
		},

		_createBatchSuccess: function(data, response) {
			//this.getModel().refresh();
			MessageBox.show("Partners created", MessageBox.Icon.SUCCESS, "Batch Save", MessageBox.Action.OK);
		},

		_createBatchError: function(oError) {
			var err = JSON.parse(oError.responseText);
			MessageBox.show(err.error.message.value, MessageBox.Icon.ERROR, "Batch Save", MessageBox.Action.OK);
		},

		onDataExport: sap.m.Table.prototype.exportData || function(oEvent) {

			var oExport = new Export({
				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType: new ExportTypeCSV({
					separatorChar: ";"
				}),

				// Pass in the model created above
				models: this.getView().getModel(),
				// binding information for the rows aggregation
				rows: {
					path: "/PartnerSet"
				},

				// column definitions with column name and binding info for the content
				columns: [{
					name: "Partner",
					template: {
						content: "{Name1}"
					}
				}, {
					name: "Product ID",
					template: {
						content: "{ProductId}"
					}
				}, {
					name: "Supplier",
					template: {
						content: "{SupplierName}"
					}
				}, {
					name: "Dimensions",
					template: {
						content: {
							parts: ["Width", "Depth", "Height", "DimUnit"],
							formatter: function(width, depth, height, dimUnit) {
								return width + " x " + depth + " x " + height + " " + dimUnit;
							},
							state: "Warning"
						}
						// "{Width} x {Depth} x {Height} {DimUnit}"
					}
				}, {
					name: "Weight",
					template: {
						content: "{WeightMeasure} {WeightUnit}"
					}
				}, {
					name: "Price",
					template: {
						content: "{Price} {CurrencyCode}"
					}
				}]
			});

			// download exported file
			oExport.saveFile().catch(function(oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function() {
				oExport.destroy();
			});
		},

		onDelete: function() {
			//is there something selected?
			if (!this._validateSelected()) {
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
						this._delete();
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

		_delete: function() {
		    var that = this;
			var oModel = this.getView().getModel();
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			for (var i = 0; i < aItems.length; i++) {
				var id = aItems[i].getCells()[0].getText();
				oModel.remove("/PartnerSet('" + id + "')", {
					success: function(oData) {
					    that.msgToast(that.getI18n("msgDataDeleted"));
					},
					error: function(oResponse) {
						var response = JSON.parse(oResponse.response.body);
						MessageBox.show(response.message, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>msgTileError}"
						});
					}
				});
			}
		},

		onAddOrder: function(oEvent) {
			//is there something selected?
			if (!this._validateSelected()) {
				return;
			}
			var that = this;
			var sModel = this.getViewProperty("model");
			if (!sModel) {
				this.msgToast(this.getI18n("msgNoModel"));
				return;
			}
			var oModel = this.getView().getModel();
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			for (var i = 0; i < aItems.length; i++) {
				var id = aItems[i].getCells()[0].getText();
				oModel.create("/OrderSet", {
					Setid: id,
					Model: sModel
				}, {
					success: function(oData_, response) {
						that.msgToast(that.getI18n('msgModelAdded', sModel));
						that.setViewProperty("model", "");
					},
					error: function(oResponse) {
						var response = JSON.parse(oResponse.response.body);
						MessageBox.show(response.message, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>msgTileError}"
						});
					}
				});
			}
		},

		_validateSelected: function() {
			if (this.getView().byId("__tablePartners").getSelectedItems().length === 0) {
				//this.msgToast( this.getModel("i18n").getResourceBundle().getText("msgSelectItem") );
				this.msgToast(this.getI18n("msgSelectItem"));
				return false;
			}
			return true;
		},

		onInfo: function(oEvent) {
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("bp.view.AccountsInfo", this);
				this.getView().addDependent(this._oPopover);
			}
			this._oPopover.openBy(oEvent.getSource());
		},

		onDownloadTemplate: function(oEvent) {
			sap.m.URLHelper.redirect("src/PartnerTemplate.xlsx", true);
			//sap.m.URLHelper.redirect("/sap/bc/bsp/sap/zakv_cdv/src/PartnerTemplate.xlsx", true);
		},

		onInfoClose: function(oEvent) {
			this._oPopover.close();
		},

		onMessages: function(oEvent) {
			if (oMessagePopover.isOpen()) {
				oMessagePopover.close();
			} else {
				oMessagePopover.openBy(oEvent.getSource());
			}
		},

		onOpenSettings: function(oEvent) {

			/*			// create dialog on demand
						if (!this._oVSDialog) {
							this._oVSDialog = sap.ui.xmlfragment(this.getView().getId(), "bp.view.AccountsSettings", this);
							this.getView().addDependent(this._oVSDialog);
						}

						// delay because addDependent is async
						jQuery.sap.delayedCall(0, this, function() {
							// apply user selection
							var aFilterKeys = {};
							jQuery.each(this._oViewSettings.filter, function(sPropery, aValues) {
								jQuery.each(aValues, function(i, aValue) {
									aFilterKeys[aValue] = true;
								});
							});
							this._oVSDialog.setSelectedFilterKeys(aFilterKeys);
							this._oVSDialog.setSelectedGroupItem(this._oViewSettings.groupProperty);
							this._oVSDialog.setGroupDescending(this._oViewSettings.groupDescending);
							jQuery('body').toggleClass("sapUiSizeCompact", this._oViewSettings.compactOn).toggleClass("sapUiSizeCozy", !this._oViewSettings.compactOn);

							// open
							this._oVSDialog.open(); //By(oEvent.getSource());
						});
						*/
			if (!this._oVSDialog) {
				this._oVSDialog = sap.ui.xmlfragment("bp.view.AccountsSettings", this);
				this.getView().addDependent(this._oVSDialog);
			}
			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oVSDialog);
			this._oVSDialog.open();
		},

		onConfirmSettings: function(oEvent) {
			var oView = this.getView();
			var oTable = oView.byId("__tablePartners");

			var mParams = oEvent.getParameters();
			var oBinding = oTable.getBinding("items");

			// apply sorter to binding
			// (grouping comes before sorting)
			var sPath;
			var bDescending;
			var vGroup;
			var aSorters = [];
			if (mParams.groupItem) {
				sPath = mParams.groupItem.getKey();
				bDescending = mParams.groupDescending;
				//vGroup = this.mGroupFunctions[sPath];
				vGroup = true;
				aSorters.push(new Sorter(sPath, bDescending, vGroup));
			}
			if (mParams.sortItem) {
				sPath = mParams.sortItem.getKey();
				bDescending = mParams.sortDescending;
				aSorters.push(new Sorter(sPath, bDescending));
			}
			if (aSorters.length > 0) {
				oBinding.sort(aSorters);
			}

			// apply filters to binding
			var aFilters = [];
			jQuery.each(mParams.filterItems, function(i, oItem) {
				var aSplit = oItem.getKey().split("__");
				var sPath = aSplit[0];
				var sOperator = aSplit[1];
				var sValue1 = aSplit[2];
				var sValue2 = aSplit[3];
				var oFilter = new Filter(sPath, sOperator, sValue1, sValue2);
				aFilters.push(oFilter);
			});
			oBinding.filter(aFilters);

			// update filter bar
			//oView.byId("vsdFilterBar").setVisible(aFilters.length > 0);
			//oView.byId("vsdFilterLabel").setText(mParams.filterString);
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

	});

});