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
	"sap/ui/model/Sorter",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/ui/core/ws/WebSocket"
], function(BaseController, History, Export, ExportTypeCSV, MessageBox, MessageToast, MessagePopover, MessagePopoverItem, Dialog, Button,
	Text, Fragment, formatter, XLSX_, JSZip, xlsx, Filter, Sorter, ValueHelpDialog, WebSocket ) {
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
	

    const readFile = (file) => {
      let reader = new window.FileReader();
    
      return new Promise((resolve, reject) => {
        if(!file){
            return reject("File not selected!")
        }
        reader.onload = (event) => {
          file.data = event.target. result;
          resolve(file);
        };
    
        reader.onerror = () => {
          return reject(this);
        };
    
        if (/^image/.test(file.type)) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsBinaryString (file);
        }
      })
    };

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
		metaModel: null,
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf bp.view.Accounts
		 */
		onInit: function() {
			var oModel = this.getComponentModel();
			oModel.metadataLoaded().then( () => { 
			    this.metaModel = oModel.getMetaModel();
                this.origin = this.metaModel.oMetadata.sUrl.match(/(o=)([A-Z]{3})/);
                this.origin = this.origin[2];
			 } );
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
			this.setViewProperty("pageId", "pageAccounts");
/*			var button = this.getView().byId("infoBar");
			button.setStyleClass("spinningBusy");*/
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
		},

		onUpload: function(oEvent) {
		    var files = oEvent.getParameter("files");
		    var oFileUploader = oEvent.getSource();
			readFile(files[0]
			).then( result => {
			    //this._createFromXLSX( result );
			    this._webSocketUpload( result );
			    oFileUploader.setValue("");
			}
			).catch( err => console.error( this.getI18n("msgFileError", err) ) );
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
			}
			oModel.submitChanges("Partner");
		},

		_createFromXLSX: function(file) {
			var wb = XLSX.read(file.data, {
				type: 'binary'
			});
			//wb.SheetNames.forEach(function(sheetName) {
			var json = XLSX.utils.sheet_to_row_object_array(wb.Sheets["Partner"]);
			var oModel = this.getModel();
			//Prep header-level group/changeset params  
			var mParameters = {
				"groupId": "Partner",
				"changeSetId": "grpid"
			};
			for (var i = 2; i < json.length; i++) {
				var entity = this._parseEntity(json[i]);
				var trunc = this._truncateEntity( entity, i+2 );
				if( trunc ){
				    entity = trunc;
				}
				entity.FileName = file.name;
				oModel.create("/PartnerSet", entity, mParameters);
			}
			mParameters.success = this._createBatchSuccess.bind(this);
			mParameters.error = this._createBatchError.bind(this);
			oModel.submitChanges(mParameters);
		},
		
		_webSocketUpload: function( file ){
		    var oModel = this.getModel();
			var wb = XLSX.read(file.data, {
				type: 'binary'
			});
			var pcpFields = { "origin": this.origin };
			var json = XLSX.utils.sheet_to_row_object_array(wb.Sheets["Partner"]);
			//perform length check and return message if any field has been shortened
			for (var i = 2; i < json.length; i++) {
				var entity = this._parseEntity(json[i]);
				var trunc = this._truncateEntity( entity, i+2 );
			}
			// open a WebSocket connection
           var hostLocation = window.location, socket, socketHostURI, webSocketURI, wsURI;
            if (hostLocation.protocol === "https:") {
                  socketHostURI = "wss:";
            } else {
                  socketHostURI = "ws:";
            }
            socketHostURI += "//" + hostLocation.host;
            if(hostLocation.host.match(/localhost/)){
                wsURI = "wss://sapgw.styria-it.hr:8002/sap/bc/apc/sap/zakv_upload"
            }else{
                wsURI = socketHostURI + "/sap/bc/apc/sap/zakv_upload";
            }
            
			jQuery.sap.require("sap.ui.core.ws.SapPcpWebSocket");
            var ws = new sap.ui.core.ws.SapPcpWebSocket(wsURI , sap.ui.core.ws.SapPcpWebSocket.SUPPORTED_PROTOCOLS.v10);
            ws.attachOpen(() => {
                for (var i in json) {
                    json[i].Header_Akvid = oModel.getProperty("/UserSet('CURRENT')/Akvid");
                    json[i].Header_Filename = file.name;
                }
                var data = JSON.stringify(json);
                ws.send(data, pcpFields);
                this.setProcessing(true);
            });
            ws.attachMessage( (msg) => {
                var oMsg = JSON.parse(msg.mParameters.data);
                var oProgress = this.getView().byId("progressIndicator");
                if(oMsg.type == "error"){
                    this.msgStrip( oMsg.text, "Error", true );
                }else if(oProgress){
                    var float = parseFloat(oMsg.percent);
                    oProgress.setPercentValue( float );
                    oProgress.setDisplayValue( oMsg.text );
                    oProgress.setVisible( true );
                }
                if(oMsg.done){
                    ws.close();
                    setTimeout( () =>{ oProgress.setVisible( false )}, 2000);
                }
            });
            ws.attachClose( () => {
                this.setProcessing(false);
                oModel.read("/PartnerSet", {
                    success: () => {
                        oModel.refresh();
                    }
                });
            });
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
				"Agent": "",
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
				    case "Agent":
				        entity[field] = json[key].slice(0,40);
				        break;
					case "Title":
						entity[bptype][field] = json[key].match(/\d{2}/)[0];
						break;
					default:
	                    entity[bptype][field] = json[key];
				}
			}
			return entity;
		},
        
        _truncateEntity: function( entity, index ){
            var trunc;
            for( var type in entity ){
                if( typeof(entity[type]) != "object") continue;
                for( var field in entity[type] ){
                    var metaData = this.getMetaData( field );
                    if (metaData == "undefined" && metaData.maxLength == 0) continue;
                    if ( entity[type][field].length <= metaData.maxLength ) continue;
                    trunc = entity;
                    trunc[type][field] = trunc[type][field].slice(0, parseInt(metaData.maxLength))
                    //var fld = type
                    var fldName = metaData['sap:label'];
                    var msg = this.getI18n('msgDataTruncated', index , type + '~' + fldName );
				    this.msgStrip(msg, "Warning", true );
                }
            }
            return trunc;
        },
        _truncateTable: function( table, index ){
            var trunc;
            for( var rowNo in table ){
                if( typeof(entity[type]) != "object") continue;
                for( var field in entity[type] ){
                    var metaData = this.getMetaData( field );
                    if (metaData == "undefined" && metaData.maxLength == 0) continue;
                    if ( entity[type][field].length <= metaData.maxLength ) continue;
                    trunc = entity;
                    trunc[type][field] = trunc[type][field].slice(0, parseInt(metaData.maxLength))
                    //var fld = type
                    var fldName = metaData['sap:label'];
                    var msg = this.getI18n('msgDataTruncated', index , type + '~' + fldName );
				    this.msgStrip(msg, "Warning", true );
                }
            }
            return trunc;
        },
        
        setProcessing: function(switchOn){
            var style = "spinningBusy";
            var oFile = this.getView().byId("fileUploader");
            var oButton = this.getView().byId("refreshIndicator");
            switch(switchOn){
                case true:
                    oButton.addStyleClass(style);
                    oButton.setVisible(true);
                    oFile.setVisible(false);
                    break;
                case false:
                    oButton.removeStyleClass(style);
                    oButton.setVisible(false);
                    oFile.setVisible(true);
                    break;
            }
        },
        
		_createBatchSuccess: function(data, response) {
			//this.getModel().refresh();
			var noCreated = data.__batchResponses[0].__changeResponses.length;
			MessageBox.show( this.getI18n('msgBatchCreated', noCreated), MessageBox.Icon.SUCCESS, "Batch Save", MessageBox.Action.OK);
		},

		_createBatchError: function(oError) {
			var err = JSON.parse(oError.responseText);
			MessageBox.show(err.error.message.value, MessageBox.Icon.ERROR, "Batch Save", MessageBox.Action.OK);
		},
		
		getMetaData: function(field){
		    var BP = this.metaModel.getODataComplexType('ZAKV_SRV.BP');
		    for( var i in BP.property ) {
		        var property = BP.property[i];
		        if (property.name == field){
		            return property;
		        }
		    }
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
			//sap.m.URLHelper.redirect("src/PartnerTemplate.xlsx", true);
			sap.m.URLHelper.redirect("/sap/bc/bsp/sap/zakv_cdv/src/PartnerTemplate.xlsx", true);
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
			var oValueHelpDialog = new ValueHelpDialog({
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