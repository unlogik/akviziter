sap.ui.define([], function () {
	"use strict";
	return {
		messageText: function (sStatus) {
			var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
			switch (sStatus) {
				case "E":
					return resourceBundle.getText("msgError");
				case "W":
					return resourceBundle.getText("msgWarning");
				case "S":
					return resourceBundle.getText("msgSuccess");
				default:
					return sStatus;
			}
		},
		
		messageIcon: function(sStatus) {
		    //Message type: S Success, E Error, W Warning, I Info, A Abort
            switch(sStatus){
                case 'E': return "sap-icon://message-error";
                case 'W': return "sap-icon://message-warning";
                case 'S': return "sap-icon://messge-success";
                case 'I': return "sap-icon://messge-info";
                case 'A': return "sap-icon://error";
            }		    
		},
		
		messageColor: function(sStatus) {
		    //Message type: S Success, E Error, W Warning, I Info, A Abort
            switch(sStatus){
                case 'E': return "#FF0000"; //Red
                case 'W': return "#FFD700"; //yellow
                case 'S': return "#008000"; //green
            }		    
		},
		statusIcon: function(sStatus) {
		    //Message type: S Success, E Error, W Warning, I Info, A Abort
            switch(sStatus){
                case 'D': return "sap-icon://group"; //Duplicate
                case 'W': return "sap-icon://message-warning";
                case 'S': return "sap-icon://messge-success";
                case 'I': return "sap-icon://messge-info";
                case 'A': return "sap-icon://error";
            }		    
		},	
		statusColor: function(sStatus) {
		    //Message type: S Success, E Error, W Warning, I Info, A Abort
            switch(sStatus){
                case 'E': return "#FF0000"; //Red
                case 'D': return "#FFD700"; //yellow
                case 'S': return "#008000"; //green
            }		    
		},
		titleText: function(sTitle) {
		    var oModel = this.getView().getModel();
		    var sPath = "/PartnerTitleSet('" + sTitle + "')/TitleMedi";
		    var TitleTxt = oModel.getProperty(sPath);
		    return TitleTxt;
		    
		},
		inputDate: function(oValue) {
            if (oValue === undefined || oValue === "") {
                return;
            }
            return new Date(oValue);
		}
	};
});