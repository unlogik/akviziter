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
                case 'S': return "sap-icon://message-success";
                case 'I': return "sap-icon://message-info";
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
		},
		inputQuantity: function(oValue){
		    if(oValue > 3){
		      return "Warning";
		    }
		    else{
		        return "None";
		    }
		},
		multiAddr:function( sSoldStras, sSoldHsnm1, sSoldHsnm2, sSoldOrt01, sShipStras, sShipHsnm1, sShipHsnm2, sShipOrt01){
		    var sFirstLine;
		    var sSecondLine;
		    sFirstLine  = sSoldStras + " " + sSoldHsnm1 + sSoldHsnm2;
		    sSecondLine = sShipStras + " " + sShipHsnm1 + sShipHsnm2;
		    if(!sFirstLine){
		        sFirstLine = sSoldOrt01;
		    }else if(!sSoldOrt01){
		        //sFirstLine = sSoldTel;
		    }else{
		        sFirstLine = sFirstLine + ', ' + sSoldOrt01;
		    }
		    if(!sSecondLine){
		        sSecondLine = sShipOrt01;
		    }else if(!sShipOrt01){
		        //sSecondLine = sShipTel;
		    }else{
		        sSecondLine = sSecondLine + ', ' + sShipOrt01;
		    }		    
		    return sFirstLine + "\n" + sSecondLine;
		},
		
		multiTel: function( sSoldTel, sSoldMob, sShipTel, sShipMob ){
		    var sFirstLine;
		    var sSecondLine;
		    if(!sSoldTel){
		        sFirstLine = sSoldMob;
		    }else if(!sSoldMob){
		        sFirstLine = sSoldTel;
		    }else{
		        sFirstLine = sSoldTel + ', ' + sSoldMob;
		    }
		    if(!sShipTel){
		        sSecondLine = sShipMob;
		    }else if(!sShipMob){
		        sSecondLine = sShipTel;
		    }else{
		        sSecondLine = sShipTel + ', ' + sShipMob;
		    }
		    return sFirstLine + "\n" + sSecondLine;
		    
		},
		
		dateJS: function( oDate ){
		    //var rDate = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDay() );
		    oDate.setHours( 0 );
		    return oDate;
		}
	};
});