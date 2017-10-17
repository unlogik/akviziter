sap.ui.define([
	"sap/ui/core/mvc/Controller",
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageStrip',
	"sap/m/MessageToast"
], function(Controller, JSONModel, MessageStrip, MessageToast) {
	"use strict";

	return Controller.extend("bp.controller.BaseController", {
		/**
		 * Convenience method for accessing the router.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		/**
		 * Convenience method for getting the view model by name.
		 * @public
		 * @param {string} [sName] the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function(sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function(oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		getComponentModel: function(sName) {
			return this.getOwnerComponent().getModel(sName);
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function() {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		setViewModel: function(sName) {
			var sViewName = this.getView().getViewName(); //getViewName returns "" empty string in onInit()
			var sName = sViewName.match(/[^/.]+$/);                         
			this.getView().setViewName(sName); //why not set viewName(!?)
			var oViewModel = this.getModel("view");
			if (oViewModel === undefined) {
				oViewModel = new JSONModel();
				this.setModel(oViewModel, "view");
			}
			var oData = {};
			oData[sName] = {};
			//var sJSON = "{ '" + sName +"' : { } }";
			oViewModel.setData(oData, true);
		},

		setViewProperty: function(sProperty, sValue) {
		    //var sViewName = this.getView().getViewName();
			this.getModel("view").setProperty("/" + this.getView().getViewName() + "/" + sProperty, sValue);
		},
		getViewProperty: function(sProperty) {
		    //var sViewName = this.getView().getViewName();
			var value = this.getModel("view").getProperty("/" + this.getView().getViewName() + "/" + sProperty);
			return value;
		},

		/**
		 * Display Message Toast
		 * @public
		 *  @param {string} sName the model name
		 */
		msgToast: function(sText, pos='center center') {
			MessageToast.show( sText, { at: pos });
		},
        /**
		 * Display Message Toast
		 * @public
		 * @param {string} sName the model name
		 */		
		msgStrip: function (sText, sType, sIcon, closeButton=true) {
			var oMs = sap.ui.getCore().byId("_msgStrip");
			if (oMs) {
				oMs.destroy();
			}
			var oMsgStrip = new MessageStrip("_msgStrip", {
				text: sText,
				showCloseButton: closeButton,
				showIcon: sIcon,
				type: sType
			});
			this.getView().addContent(oMsgStrip);
		},

		getI18n: function (sProperty, v1, v2, v3, v4) {
		    var aVar = [];
		    if( typeof v1 !== "undefined"){  aVar.push(v1) };
		    if( typeof v2 !== "undefined"){  aVar.push(v2) };
		    if( typeof v3 !== "undefined"){  aVar.push(v3) };
		    if( typeof v4 !== "undefined"){  aVar.push(v4) };
			return this.getModel("i18n").getResourceBundle().getText(sProperty, aVar);
		}

	});

});