sap.ui.define([
	"sap/ui/core/util/MockServer"
], function (MockServer) {
	"use strict";
	return {
		init: function () {
			var oUriParameters = jQuery.sap.getUriParameters(),
				sEntity = "ProductSet",
				sErrorParam = oUriParameters.get("errorType"),
				iErrorCode = sErrorParam === "badRequest" ? 400 : 500;
			// create
			var oMockServer = new MockServer({
				rootUri: "/destinations/Stirya/sap/opu/odata/SAP/ZAKV_SRV;mo/"
			}); 
			// configure
			MockServer.config({
				autoRespond: true,
				autoRespondAfter: oUriParameters.get("serverDelay") || 1000
			});
			// simulate
			//var sPath = jQuery.sap.getModulePath("bp.localService");
			//oMockServer.simulate(sPath + "/metadata.xml", sPath + "/mockdata");
			oMockServer.simulate("../localService/metadata.xml",   {
				sMockdataBaseUrl : "../localService/mockdata",
				bGenerateMissingMockData : true
			 });
				var aRequests = oMockServer.getRequests(),
					fnResponse = function (iErrCode, sMessage, aRequest) {
						aRequest.response = function(oXhr){
							oXhr.respond(iErrCode, {"Content-Type": "text/plain;charset=utf-8"}, sMessage);
						};
					};

				// handling the metadata error test
				if (oUriParameters.get("metadataError")) {
					aRequests.forEach( function ( aEntry ) {
						if (aEntry.path.toString().indexOf("$metadata") > -1) {
							fnResponse(500, "metadata Error", aEntry);
						}
					});
				}

				// Handling request errors
				if (sErrorParam) {
					aRequests.forEach( function ( aEntry ) {
						if (aEntry.path.toString().indexOf(sEntity) > -1) {
							fnResponse(iErrorCode, sErrorParam, aEntry);
						}
					});
				}
			// start
			oMockServer.start();
		}
	};
});