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
	"bp/lib/JsXlsx",
	"bp/lib/jszip.min",
	"bp/lib/xlsx.min"
], function(BaseController, History, Export, ExportTypeCSV, MessageBox, MessageToast, MessagePopover, MessagePopoverItem, Dialog, Button, Text, Fragment, XLSX_, JSZip) {
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

			/**
			 * Called when a controller is instantiated and its View controls (if available) are already created.
			 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
			 * @memberOf bp.view.Accounts
			 */
			onInit: function() {
			    var oModel = this.getComponentModel();
			    sap.ui.getCore().getMessageManager().registerMessageProcessor( oModel );
			    var oMessage = sap.ui.getCore().getMessageManager().getMessageModel();
			    this.getView().setModel(oMessage, "message");
			    oMessagePopover.setModel(oMessage, "message");
			},

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
			    oRouter.navTo("object", { objectId: "NEW" });
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
					error: function(oError) {
						var oResponseBody = JSON.parse(oError.response.body);
						// console.log(oResponseBody);
					}
				});
				oRouter.navTo("AccountDetails");*/
			},
			
            onUpload: function(oEvent) {
                var files = oEvent.getParameter("files");
                if (files && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function(e) { this._createFromXLSX(e) }.bind(this);
                    reader.readAsBinaryString(files[0]);
                }
			},
			
			_createFromXLSX: function(e){
                var data = e.target.result;
                var wb = XLSX.read(data, {
                    type : 'binary'
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
                    "groupId": "grpid",  
                    "changeSetId": "grpid",
                    "success": this._createBatchSuccess.bind(this),
                    "error":  this._createBatchError.bind(this)//function(oError) { }.bind(this)
                }; 
                for(var i = 2; i < json.length; i++) {
                    var entity = this._parseEntity( json[i] );
                    oModel.create("/PartnerSet", entity, mParameters );
                }
                oModel.submitChanges(mParameters);  
	        },
	        /* parse excel table format to oData format
	        */
	        _parseEntity: function(json){
                var bptype = null;
                var field = null;	            
                var entity = { "Akvid" : "AK1",
                               "Pubid" : "PB1",
                               "SoldTo" : {},
                               "ShipTo" : {}
                }
                for(var key in json){
                    bptype = key.match(/^[^_]*/);
                    field = key.match(/[^_]*$/);
                    if(bptype){
                        bptype = bptype[0];
                    }
                    if(field){
                        field = field[0];
                    }
                    switch(field){
                        case "Title":
                            entity[bptype][field] = json[key].match(/\d{2}/)[0];
                            break;
                        default:
                            entity[bptype][field] = json[key];
                    }
                }	            
                return entity;
	        },
	        
	        _createBatchSuccess: function(data,response){
                this.getModel().refresh();
                MessageBox.show("Partners created", MessageBox.Icon.SUCCESS, "Batch Save", MessageBox.Action.OK);	            
	        },
	        
	        _createBatchError: function(oError){
	            alert("Error occurred ");
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

    		onDelete: function () {
    		    //is there something selected?
    		    if( this.getView().byId("__tablePartners").getSelectedItems().length === 0){
    		        MessageToast.show(
    		            this.getModel("i18n").getResourceBundle().getText("selectItem"), 
    		            { at: 'center center' }
    		        );
    		        return;
    		    }
    		    //are you 100% sure about deletion?
    			var dialog = new Dialog({
    				title: 'Confirm',
    				type: 'Message',
    				content: new Text({ text: 'Are you sure you want to submit your shopping cart?' }),
    				beginButton: new Button({
    					text: "{i18n>delButton}",
    					press: function () {
    						this._delete();
    						dialog.close();
    					}.bind(this)
    				}),
    				endButton: new Button({
    					text: 'Cancel',
    					press: function () {
    						dialog.close();
    					}
    				}),
    				afterClose: function() {
    					dialog.destroy();
    				}
    			});
    			//bind model to access translations
                dialog.setModel(this.getModel("i18n"),"i18n");
    			dialog.open();
    		},
		
			_delete: function() {
			    var oModel = this.getView().getModel();
				var oTable = this.getView().byId("__tablePartners");
				var aItems = oTable.getSelectedItems();
				for (var i=0; i<aItems.length;i++ ){
				    var id = aItems[i].getCells()[0].getText();
				    oModel.remove("/PartnerSet('" + id + "')", null, {
                        success : jQuery.proxy(function() {
                        jQuery.sap.require("sap.m.MessageToast");
                        MessageToast.show("el Vuelo '" + name + "' se elimino con exito.");
                    }, this),
               
                    error : jQuery.proxy(function(mResponse) {
                        var body = mResponse.response.body;
                        var res = body.split(",");
                        /*eslint no-console: "error"*/
                        console.log(res);
                        MessageBox.show("Se produjo un problema eliminando el vuelo.", {icon: sap.m.MessageBox.Icon.ERROR, title: "Vuelos"});
                    }, this) });
		        }
            },
	       
	        onInfo: function(oEvent){
    			if (! this._oPopover) {
    				this._oPopover = sap.ui.xmlfragment("bp.view.InfoAccounts", this);
    				this.getView().addDependent(this._oPopover);
    			}
    			this._oPopover.openBy(oEvent.getSource());
    		},
    		
    		onDownloadTemplate: function (oEvent) {
    			sap.m.URLHelper.redirect("src/PartnerTemplate.xlsx", true);
    		},
    		
    		onInfoClose: function (oEvent) {
    			this._oPopover.close();
    		},	            
	      
	        
            onMessages: function(oEvent) {
                if (oMessagePopover.isOpen()){
                    oMessagePopover.close();
                }else{
                    oMessagePopover.openBy(oEvent.getSource());
                }
            }

	});

});