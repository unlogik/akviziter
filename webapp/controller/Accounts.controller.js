sap.ui.define([
	"../controller/BaseController",
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
	"../model/formatter",
	"../lib/JsXlsx",
	"../lib/jszip.min",
	"../lib/xlsx.min",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/comp/valuehelpdialog/ValueHelpDialog",
	"sap/ui/core/ws/WebSocket",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/ws/SapPcpWebSocket"
], function (BaseController, History, Export, ExportTypeCSV, MessageBox, MessageToast, MessagePopover, MessagePopoverItem, Dialog, Button,
	Text, Fragment, formatter, XLSX_, JSZip, SheetJS, Filter, Sorter, ValueHelpDialog, WebSocket, JSONModel, WS) {
	"use strict";

	var oMessageTemplate = new MessagePopoverItem({
		type: '{message>msgtype}',
		title: 'Setid {message>setid}: {message>message}',
		groupName: "{parts: ['i18n>label.Setid','message>setid'], fromatter:'jQuery.sap.formatMessage'}",
		activeTitle: '{message>setid}',
		description: '{message>longtxt}',
		subtitle: '{message>id}{message>number}',
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
			if (!file) {
				return reject("File not selected!")
			}
			reader.onload = (event) => {
				file.data = event.target.result;
				resolve(file);
			};

			reader.onerror = () => {
				return reject(this);
			};

			if (/^image/.test(file.type)) {
				reader.readAsDataURL(file);
			} else {
				reader.readAsBinaryString(file);
			}
		})
	};

	return BaseController.extend("vl.ism.akv.cdv.controller.Accounts", {
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
		 * @memberOf vl.ism.akv.cdv.view.Accounts
		 */
		onInit: function () {
			this.oView = this.getView();
			this.oModel = this.getComponentModel();
			this.oModel.metadataLoaded().then(() => {
				this.metaModel = this.oModel.getMetaModel();
				this.origin = this.metaModel.oMetadata.sUrl.match(/(o=)([A-Z]{3})/);
				this.origin = this.origin[2];
			});

			/*
						sap.ui.getCore().getMessageManager().registerMessageProcessor(oModel);*/
			var oMManage = sap.ui.getCore().getMessageManager();
			oMManage.registerObject(this.getView(), true);
			var oMessage = oMManage.getMessageModel();
			this.getView().setModel(oMessage, "message");
			oMessagePopover.setModel(oMessage, "message");
		},

		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf vl.ism.akv.cdv.view.Accounts
		 */
		onBeforeRendering: function () {
			this.setViewModel();
			this.setViewProperty("pageId", "pageAccounts");
			this.setViewProperty("msgStripId", "msgStripAccounts");
			/*			var button = this.getView().byId("infoBar");
						button.setStyleClass("spinningBusy");*/
		},

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf vl.ism.akv.cdv.view.Accounts
		 */
		onAfterRendering: function () {
			//this.getView().byId("__tablePartners").setPopinLayout("GridSmall");

		},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf vl.ism.akv.cdv.view.Accounts
		 */
		//	onExit: function() {
		//
		//	}		,
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
		onUserChange: function (oEvent) {
			var bVisible = oEvent.getSource().getModel().getProperty("/UserSet('CURRENT')/AkvSelectable");
			this.byId("__column01").setVisible(bVisible);
		},
		onBPDetails: function (oEvent) {
			// The source is the list item that got pressed
			var oItem = oEvent.getSource();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("AccountDetails", {
				SetId: oItem.getBindingContext().getProperty("Setid")
			});
		},
		onAdd: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("AccountDetails", {
				SetId: "NEW"
			});
		},
		onUpload: function (oEvent) {
			var files = oEvent.getParameter("files");
			var oFileUploader = oEvent.getSource();
			readFile(files[0]).then(result => {
				if (sap.ui.Device.support.websocket) {
					this._webSocketUpload(result);
				} else {
					this._createFromXLSX(result);
				}
				oFileUploader.setValue("");
			}).catch(err => {
				console.error(this.getI18n("msgFileError", err))
			});
		},

		onSubmit: function (oEvent) {
			//is there something selected?
			if (!this._validateSelected()) {
				return;
			}
			if (!this._oSubmitDialog) {
				this._oSubmitDialog = sap.ui.xmlfragment("vl.ism.akv.cdv.view.Submit", this);
				this.getView().addDependent(this._oSubmitDialog);
				this._oSubmitDialog.setModel(this.getModel("i18n"), "i18n");
				this.getView().addDependent(this._oSubmitDialog);
				//this.oDataBeforeOpen = jQuery.extend(true, {}, this.oJSONModel.getData());
			}
			this._oSubmitDialog.setModel(this._prepareSubmitModel(), "set");
			this._oSubmitDialog.open();
			return;
		},
		onSubmitSubmit: function (oEvent) {
			this._oSubmitDialog.close();
			var oData = oEvent.getSource().getModel('set').getData();
			var oSubmit = [];
			oData.set.forEach((el) => {
				oSubmit.push(
					{
						'setid': el.Setid,
						'fname': oData.selectedItem
					}
				);
			});
			this._webSocketSubmit(oSubmit);
		},
		onSubmitCancel: function (oEvent) {
			this._oSubmitDialog.close();
		},
		_prepareSubmitModel() {
			var oData = { files: [], 'set': [] };
			var aItems = this.getView().byId("__tablePartners").getSelectedItems();
			oData.itemCount = aItems.length;
			var aFiles = [];
			aItems.forEach((el) => {
				aFiles.push(el.getBindingContext().getObject().FileName);
				oData.set.push({ Setid: el.getBindingContext().getObject().Setid });
			})
			//get distinct values from array
			aFiles = aFiles.filter((v, i, a) => a.indexOf(v) === i);
			aFiles.forEach((el) => {
				oData.files.push({ fileName: el });
			})
			if (aFiles.length == 1) {
				oData.selectedItem = aFiles[0];
			}
			return new JSONModel(oData);
		},
		_submit: function (e) {
			var that = this;
			var oModel = this.getView().getModel();
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			for (var i = 0; i < aItems.length; i++) {
				var sPath = aItems[i].getBindingContextPath();
				oModel.setProperty(sPath + "/Status", "P");
			}
			oModel.submitChanges({
				groupID: "Partner",
				success: (oData, response) => {
					sap.ui.core.BusyIndicator.hide();
					oModel.resetChanges();
					for (var i in oData.__batchResponses) {
						var batchResponse = oData.__batchResponses[i];
						if (typeof (batchResponse.response) == "undefined") continue;
						if (batchResponse.response.statusCode != "undefined" && batchResponse.response.statusCode != "200") {
							var oResponse = JSON.parse(batchResponse.response.body);
							this.msgStrip(oResponse.error.message.value, "Error", true);
							return;
						}
					}
					this.msgToast(that.getI18n('msgChangesSaved'));
				},
				error: (oResponse) => {
					oModel.resetChanges();
					sap.ui.core.BusyIndicator.hide();
					var response = this.parseResponse(oResponse);
					MessageBox.show(response.message, {
						icon: sap.m.MessageBox.Icon.ERROR,
						title: "{i18n>msgTileError}"
					});
				}
			});
		},

		_createFromXLSX: function (file) {
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
				var trunc = this._truncateEntity(entity, i + 2);
				if (trunc) {
					entity = trunc;
				}
				entity.FileName = file.name;
				oModel.create("/PartnerSet", entity, mParameters);
			}
			mParameters.success = this._createBatchSuccess.bind(this);
			mParameters.error = this._createBatchError.bind(this);
			oModel.submitChanges(mParameters);
		},

		_webSocketUpload: function (file) {
			var oModel = this.getModel();
			var wb = XLSX.read(file.data, {
				type: 'binary'
			});
			var pcpFields = {
				"origin": this.origin
			};
			var json = this.validateTemplate(wb);
			if (!json) {
				return;
			}
			//perform length check and return message if any field has been shortened
			for (var i = 0; i < json.length; i++) {
				var entity = this._parseEntity(json[i]);
				this._truncateEntity(entity, i + 4);
			}
			// open a WebSocket connection
			//var wsURI = this._wsURI("zakv_upload");
			var hostLocation = window.location, socketHostURI, wsURI;
			if (hostLocation.protocol === "https:") {
				socketHostURI = "wss:";
			} else {
				socketHostURI = "ws:";
			}
			socketHostURI += "//" + hostLocation.host;
			if (hostLocation.host.match(/localhost/)) {
				wsURI = "wss://sapgw.styria-it.hr:8002/sap/bc/apc/sap/zakv_upload"
			} else {
				wsURI = socketHostURI + "/sap/bc/apc/sap/zakv_upload";
			}

			jQuery.sap.require("sap.ui.core.ws.SapPcpWebSocket");
			var ws = new sap.ui.core.ws.SapPcpWebSocket(wsURI, sap.ui.core.ws.SapPcpWebSocket.SUPPORTED_PROTOCOLS.v10);
			ws.attachOpen(() => {
				for (var i in json) {
					json[i].Header_Akvid = oModel.getProperty("/UserSet('CURRENT')/Akvid");
					json[i].Header_Filename = file.name;
				}
				var data = JSON.stringify(json);
				ws.send(data, pcpFields);
				this.setProcessing(true);
			});
			ws.attachMessage((msg) => {
				var oMsg = JSON.parse(msg.mParameters.data);
				var oProgress = this.getView().byId("progressIndicator");
				if (oMsg.type == "error") {
					this.msgStrip(oMsg.text, "Error", true);
				} else if (oProgress) {
					var float = parseFloat(oMsg.percent);
					oProgress.setPercentValue(float);
					oProgress.setDisplayValue(oMsg.text);
					oProgress.setVisible(true);
				}
				if (oMsg.done) {
					ws.close();
					setTimeout(() => {
						oProgress.setVisible(false)
					}, 2000);
				}
			});
			ws.attachClose(() => {
				this.setProcessing(false);
				oModel.read("/PartnerSet", {
					success: () => {
						oModel.refresh();
					}
				});
			});
		},
		_webSocketSubmit: function (oData) {
			var pcpFields = {
				"origin": this.origin
			};
			var wsURI = this._wsURI("zakv_submit");
			var ws = new WS(wsURI, WS.SUPPORTED_PROTOCOLS.v10);
			ws.attachOpen(() => {
				var data = JSON.stringify(oData);
				ws.send(data, pcpFields);
				this.setProcessing2(true);
			});
			ws.attachMessage((msg) => {
				var oMsg = JSON.parse(msg.mParameters.data);
				var oProgress = this.getView().byId("progressIndicator");
				if (oMsg.type == "error") {
					this.msgStrip(oMsg.text, "Error", true);
				} else if (oProgress) {
					var float = parseFloat(oMsg.percent);
					oProgress.setPercentValue(float);
					oProgress.setDisplayValue(oMsg.text);
					oProgress.setVisible(true);
				}
				if (oMsg.done) {
					ws.close();
					setTimeout(() => {
						oProgress.setVisible(false)
					}, 2000);
				}
				if (oMsg.messages) {
					var oModel = new JSONModel(oMsg.messages);
					this.getView().setModel(oModel, "message")
					oModel.refresh();
				}
			});
			ws.attachClose(() => {
				this.setProcessing2(false);
				this.oModel.read("/PartnerSet", {
					success: () => {
						this.oModel.refresh();
					}
				});
			});
		},
		_wsURI: function (sAction) {
			var hostLocation = window.location,	socketHostURI, wsURI;
			if (hostLocation.protocol === "https:") {
				socketHostURI = "wss:";
			} else {
				socketHostURI = "ws:";
			}
			socketHostURI += "//" + hostLocation.host;
			if (hostLocation.host.match(/localhost/)) {
				wsURI = "wss://sapgw.styria-it.hr:8002/sap/bc/apc/sap/"
			} else {
				wsURI = socketHostURI + "/sap/bc/apc/sap/";
			}
			return wsURI + sAction;
		},
		/* parse excel table format to oData format
		 */
		_parseEntity: function (json) {
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
						entity[field] = json[key].slice(0, 40);
						break;
					case "Title":
						entity[bptype][field] = json[key].match(/\d{2}/);
						if (entity[bptype][field]) {
							entity[bptype][field] = entity[bptype][field][0];
						} else {
							entity[bptype][field] = "";
						}
						break;
					case "Birth":
						/*			            var date = new Date( json[key] );
									            entity[bptype][field] = date.toLocaleDateString('de-DE');*/
						entity[bptype][field] = json[key] = this.parseDate(json[key]);
						break;
					default:
						entity[bptype][field] = json[key];
				}
			}
			return entity;
		},

		_truncateEntity: function (entity, index) {
			var trunc;
			for (var type in entity) {
				if (typeof (entity[type]) != "object") continue;
				for (var field in entity[type]) {
					var metaData = this.getMetaData(field);
					if (typeof (metaData) == "undefined" || typeof (metaData.maxLength) == "undefined" || metaData.maxLength == 0) continue;
					if (entity[type][field].length <= metaData.maxLength) continue;
					trunc = entity;
					trunc[type][field] = trunc[type][field].slice(0, parseInt(metaData.maxLength))
					//var fld = type
					var fldName = metaData['sap:label'];
					var msg = this.getI18n('msgDataTruncated', index, type + '~' + fldName);
					this.msgStrip(msg, "Warning", true);
				}
			}
			return trunc;
		},
		// _truncateTable: function (table, index) {
		// 	var trunc;
		// 	for (var rowNo in table) {
		// 		if (typeof (entity[type]) != "object") continue;
		// 		for (var field in entity[type]) {
		// 			var metaData = this.getMetaData(field);
		// 			if (metaData == "undefined" && metaData.maxLength == 0) continue;
		// 			if (entity[type][field].length <= metaData.maxLength) continue;
		// 			trunc = entity;
		// 			trunc[type][field] = trunc[type][field].slice(0, parseInt(metaData.maxLength))
		// 			//var fld = type
		// 			var fldName = metaData['sap:label'];
		// 			var msg = this.getI18n('msgDataTruncated', index, type + '~' + fldName);
		// 			this.msgStrip(msg, "Warning", true);
		// 		}
		// 	}
		// 	return trunc;
		// },

		validateTemplate: function (wb) {
			var msg;
			if (typeof (wb.Sheets["Partner"]) === 'undefined') {
				msg = this.getI18n('msgTemplateSheeet');
				this.msgStrip(msg, "Error", true);
				return false;
			}
			var json = XLSX.utils.sheet_to_row_object_array(wb.Sheets["Partner"]);
			var checkRow = json[1];
			if (typeof (checkRow.Header_Agent) === 'undefined' ||
				typeof (checkRow.SoldTo_Partnerid) === 'undefined' ||
				typeof (checkRow.SoldTo_Title) === 'undefined' ||
				typeof (checkRow.SoldTo_Name2) === 'undefined' ||
				typeof (checkRow.SoldTo_Name1) === 'undefined' ||
				typeof (checkRow.SoldTo_Name3) === 'undefined' ||
				typeof (checkRow.SoldTo_Name4) === 'undefined' ||
				typeof (checkRow.SoldTo_Stras) === 'undefined' ||
				typeof (checkRow.SoldTo_Hsnm1) === 'undefined' ||
				typeof (checkRow.SoldTo_Hsnm2) === 'undefined' ||
				typeof (checkRow.SoldTo_Pstlz) === 'undefined' ||
				typeof (checkRow.SoldTo_Ort01) === 'undefined' ||
				typeof (checkRow.SoldTo_Dlnot) === 'undefined' ||
				typeof (checkRow.SoldTo_Telnr) === 'undefined' ||
				typeof (checkRow.SoldTo_Mobnr) === 'undefined' ||
				typeof (checkRow.SoldTo_Email) === 'undefined' ||
				typeof (checkRow.SoldTo_Birth) === 'undefined' ||
				typeof (checkRow.SoldTo_Stcd2) === 'undefined' ||
				typeof (checkRow.SoldTo_Intad) === 'undefined' ||
				typeof (checkRow.ShipTo_Partnerid) === 'undefined' ||
				typeof (checkRow.ShipTo_Title) === 'undefined' ||
				typeof (checkRow.ShipTo_Name2) === 'undefined' ||
				typeof (checkRow.ShipTo_Name1) === 'undefined' ||
				typeof (checkRow.ShipTo_Name3) === 'undefined' ||
				typeof (checkRow.ShipTo_Name4) === 'undefined' ||
				typeof (checkRow.ShipTo_Stras) === 'undefined' ||
				typeof (checkRow.ShipTo_Hsnm1) === 'undefined' ||
				typeof (checkRow.ShipTo_Hsnm2) === 'undefined' ||
				typeof (checkRow.ShipTo_Pstlz) === 'undefined' ||
				typeof (checkRow.ShipTo_Ort01) === 'undefined' ||
				typeof (checkRow.ShipTo_Dlnot) === 'undefined' ||
				typeof (checkRow.ShipTo_Telnr) === 'undefined' ||
				typeof (checkRow.ShipTo_Mobnr) === 'undefined' ||
				typeof (checkRow.ShipTo_Email) === 'undefined' ||
				typeof (checkRow.ShipTo_Birth) === 'undefined' ||
				typeof (checkRow.ShipTo_Stcd2) === 'undefined' ||
				typeof (checkRow.ShipTo_Intad) === 'undefined') {
				msg = this.getI18n('msgTemplateTech');
				this.msgStrip(msg, "Error", true);
				return false;
			}
			json.splice(0, 2);
			if (json.length == 0) {
				msg = this.getI18n('msgNoData');
				this.msgStrip(msg, "Warning", true);
				return false;
			}
			return json;
		},

		setProcessing: function (switchOn) {
			var style = "spinningBusy";
			var oFile = this.getView().byId("fileUploader");
			var oButton = this.getView().byId("refreshIndicator");
			switch (switchOn) {
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
		setProcessing2: function (switchOn) {
			var style = "spinningBusy";
			var oFile = this.getView().byId("idSubmit");
			var oButton = this.getView().byId("refreshIndicator1");
			switch (switchOn) {
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
		_createBatchSuccess: function (data, response) {
			//this.getModel().refresh();
			var noCreated = data.__batchResponses[0].__changeResponses.length;
			MessageBox.show(this.getI18n('msgBatchCreated', noCreated), MessageBox.Icon.SUCCESS, "Batch Save", MessageBox.Action.OK);
		},

		_createBatchError: function (oError) {
			var err = JSON.parse(oError.responseText);
			MessageBox.show(err.error.message.value, MessageBox.Icon.ERROR, "Batch Save", MessageBox.Action.OK);
		},

		parseDate: function (sDate) {
			if (sDate.match(/^[\d]+\//)) { //if contains / as separator, it is date
				var date = new Date(sDate);
				if (date != "Invalid Date") {
					return date.toLocaleDateString('de-DE');
				}
			} else {
				var ssDate = sDate.match(/[\d]{1,2}\.[\d]{1,2}\.[\d]{4}/);
				if (ssDate) {
					return ssDate[0];
				}
			}
		},

		getMetaData: function (field) {
			var BP = this.metaModel.getODataComplexType('ZAKV_SRV.BP');
			for (var i in BP.property) {
				var property = BP.property[i];
				if (property.name == field) {
					return property;
				}
			}
		},

		onDataExport: sap.m.Table.prototype.exportData || function (oEvent) {

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
							formatter: function (width, depth, height, dimUnit) {
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
			oExport.saveFile().catch(function (oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function () {
				oExport.destroy();
			});
		},

		onDelete: function () {
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
				afterClose: function () {
					dialog.destroy();
				}
			});
			//bind model to access translations
			dialog.setModel(this.getModel("i18n"), "i18n");
			dialog.open();
		},

		_delete: function () {
			var that = this;
			var oModel = this.getView().getModel();
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			for (var i = 0; i < aItems.length; i++) {
				var id = aItems[i].getCells()[0].getText();
				oModel.remove("/PartnerSet('" + id + "')", {
					success: function (oData) {
						that.msgToast(that.getI18n("msgDataDeleted"));
					},
					error: function (oResponse) {
						var response = JSON.parse(oResponse.response.body);
						MessageBox.show(response.message, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>msgTileError}"
						});
					}
				});
			}
		},

		onAddOrder: function (oEvent) {
			//is there something selected?
			if (!this._validateSelected()) {
				return;
			}
			var that = this;
			var oModel = this.getModel();
			var sModel = oModel.getProperty("/UserSet('CURRENT')/Model");
			if (!sModel) {
				this.msgToast(this.getI18n("msgNoModel"));
				return;
			}
			var oTable = this.getView().byId("__tablePartners");
			var aItems = oTable.getSelectedItems();
			if (aItems.length > 0) {
				this.getView().setBusy(true);
			}
			for (var i = 0; i < aItems.length; i++) {
				var id = aItems[i].getCells()[0].getText();
				oModel.create("/OrderSet", {
					Setid: id,
					Model: sModel
				}, {
					success: (oData_, response) => {
						this.msgToast(that.getI18n('msgModelAdded', sModel));
						this.setViewProperty("model", "");
						oModel.setProperty("/UserSet('CURRENT')/Model", "")
						this.getView().setBusy(false);
						//debugger;
						that.getView().byId("__tablePartners").getBinding("items").refresh(true);
					},
					error: (oResponse) => {
						this.getView().setBusy(false);
						var response = this.parseResponse(oResponse);
						MessageBox.show(response, {
							icon: sap.m.MessageBox.Icon.ERROR,
							title: "{i18n>msgTileError}"
						});
					}
				});
			}
		},

		_validateSelected: function () {
			if (this.getView().byId("__tablePartners").getSelectedItems().length === 0) {
				//this.msgToast( this.getModel("i18n").getResourceBundle().getText("msgSelectItem") );
				this.msgToast(this.getI18n("msgSelectItem"));
				return false;
			}
			return true;
		},

		onInfo: function (oEvent) {
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("vl.ism.akv.cdv.view.AccountsInfo", this);
				this.getView().addDependent(this._oPopover);
			}
			this._oPopover.openBy(oEvent.getSource());
		},

		onDownloadTemplate: function (sExtension, oEvent) {
			//sap.m.URLHelper.redirect("src/PartnerTemplate.xlsx", true);
			sap.m.URLHelper.redirect("src/PartnerTemplate." + sExtension, true);
		},

		onInfoClose: function (oEvent) {
			this._oPopover.close();
		},

		onMessages: function (oEvent) {
			if (oMessagePopover.isOpen()) {
				oMessagePopover.close();
			} else {
				oMessagePopover.openBy(oEvent.getSource());
			}
			oMessagePopover.setModel(this.getModel('message'), "message");
		},

		onOpenSettings: function (oEvent) {
			if (!this._oVSDialog) {
				this._oVSDialog = sap.ui.xmlfragment("vl.ism.akv.cdv.view.AccountsSettings", this);
				this.getView().addDependent(this._oVSDialog);
			}
			// toggle compact style
			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oVSDialog);
			this._oVSDialog.open();
		},

		onConfirmSettings: function (oEvent) {
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
			jQuery.each(mParams.filterItems, function (i, oItem) {
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

		onModelValueHelp: function () {
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

				ok: function (oEvent) {
					var aTokens = oEvent.getParameter("tokens");
					if (aTokens.length > 0) {
						oInput.setValue(aTokens[0].getKey());
						oInput.setTooltip(aTokens[0].getText());
					}
					oValueHelpDialog.close();
				},
				cancel: function (oControlEvent) {
					oValueHelpDialog.close();
				},
				afterClose: function () {
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
				search: function () {
					sap.m.MessageToast.show("Search pressed");
				}
			});

			if (oFilterBar.setBasicSearch) {
				oFilterBar.setBasicSearch(new sap.m.SearchField({
					showSearchButton: sap.ui.Device.system.phone,
					placeholder: "Search",
					search: function (event) {
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