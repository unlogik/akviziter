sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"bp/model/models"
//	"sap/ui/core/util/MockServer"
], function(UIComponent, Device, models) {
	"use strict";

	return UIComponent.extend("bp.Component", {

		metadata: {
			"manifest": "json"
		},
/*		constructor: function(sId, mSettings) {
		    if( sId && sId.componentData){
		        var origin = sId;
		    }
		},*/

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);
			// create the views based on the url/hash
			this.getRouter().initialize();
			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			
			// used only for this lessons to show the request individually...
			//this.getModel().setUseBatch(false);
			
/*			var oModel;
			jQuery.sap.require("sap.ui.core.util.MockServer");
			var oMockServer = new sap.ui.core.util.MockServer({
				rootUri: "sapuicompsmarttable/"
			});
			this._oMockServer = oMockServer;
			oMockServer.simulate("localService/metadata.xml", "localService/mockdata");
			oMockServer.start();
			oModel = new sap.ui.model.odata.ODataModel("sapuicompsmarttable", true);
			oModel.setCountSupported(false);
			this.setModel(oModel);*/
		},
		
		getContentDensityClass : function() {
			if (!this._sContentDensityClass) {
				if (!sap.ui.Device.support.touch) {
					this._sContentDensityClass = "sapUiSizeCompact";
				} else {
					this._sContentDensityClass = "sapUiSizeCozy";
				}
			}
			return this._sContentDensityClass;
		},
		
		onExit: function() {
			this._oMockServer.stop();
		}
	});
});