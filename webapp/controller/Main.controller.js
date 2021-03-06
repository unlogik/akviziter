sap.ui.define([
	'jquery.sap.global',
	"../controller/BaseController",
	'sap/ui/model/json/JSONModel',
	"sap/ui/core/Component",
	'sap/m/Popover',
	'sap/m/Button'
], function(jQuery, BaseController, JSONModel, Component, Popover, Button) {
	"use strict";

	return BaseController.extend("vl.ism.akv.cdv.controller.Main", {
		_oViewSettings: {
			compactOn: false,
			themeActive: "sap_belize",
			rtl: false
		},
		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf vl.ism.akv.cdv.view.App
		 */
		onInit: function() {
			this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
			this._component = Component.getOwnerComponentFor(this.getView());
			var oModel = this.getComponentModel();
			oModel.setChangeGroups({
				"PartnerDouble": {
					groupId: "PartnerDouble"
				},
				"Order": {
					groupId: "Double"
				},
				"Partner": {
					groupId: "Partner"
				},
				"User": {
					groupId: "User"
				}
			});
			var aDeferredGroups = oModel.getDeferredGroups();
			aDeferredGroups = aDeferredGroups.concat(["PartnerDouble", "Double", "Partner", "User"]);
			oModel.setDeferredGroups(aDeferredGroups);
			//this.getView().setModel(oModel);
			//oModel.read("/UserSet('CURRENT')", { success: this.adjustViewModel() });
		},

		onBeforeRendering: function() {
			this.setViewModel();
			this.getComponentModel().setUseBatch(false);
			this.getComponentModel().read("/UserSet('CURRENT')", {
				success: jQuery.proxy(this.adjustViewModel, this)
			});
			this.getComponentModel().setUseBatch(true);
		},

		onSelect: function(oEvent) {
			var item = oEvent.getParameter('item');
			var id = item.getKey();
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo(id);
		},

		onSideNavButtonPress: function(event) {
			/*			var navigationList = this.getView().byId('navigationList');
						var expanded = !navigationList.getExpanded();
						navigationList.setExpanded(expanded);*/
			var viewId = this.getView().getId();
			var toolPage = sap.ui.getCore().byId(viewId + "--toolPage");
			//var sideExpanded = toolPage.getSideExpanded();

			toolPage.setSideExpanded(!toolPage.getSideExpanded());
		},
		onOpenAppSettings: function(oEvent) {
			if (!this._oSettingsDialog) {
				this._oSettingsDialog = new sap.ui.xmlfragment("vl.ism.akv.cdv.view.AppSettings", this);
				this.getView().addDependent(this._oSettingsDialog);
			}
			jQuery.sap.delayedCall(0, this, function() {

				// variable for convenience
				var oAppSettings = sap.ui.getCore().getConfiguration();
				var bCompactMode = this._oViewSettings.compactOn;
				var bRTL = this._oViewSettings.rtl;

				// handling of URI parameters
				var sUriParamTheme = jQuery.sap.getUriParameters().get("sap-theme");
				var sUriParamRTL = jQuery.sap.getUriParameters().get("sap-ui-rtl");

				// setting the button for Theme
				if (sUriParamTheme) {
					sap.ui.getCore().byId("ThemeButtons").setSelectedKey(sUriParamTheme);
				} else {
					sap.ui.getCore().byId("ThemeButtons").setSelectedKey(oAppSettings.getTheme());
				}

				// setting the button for Compact Mode
				sap.ui.getCore().byId("CompactModeButtons").setState(bCompactMode);

				// setting the RTL Button
				if (sUriParamRTL) {
					sap.ui.getCore().byId("RTLButtons").setState(sUriParamRTL === "true" ? true : false);
				} else {
					sap.ui.getCore().byId("RTLButtons").setState(bRTL);
				}

				this._oSettingsDialog.open();
			});
		},

		onSaveAppSettings: function(oEvent) {

			this._oSettingsDialog.close();

			if (!this._oBusyDialog) {
				jQuery.sap.require("sap.m.BusyDialog");
				var BusyDialog = sap.ui.require("sap/m/BusyDialog");
				this._oBusyDialog = new BusyDialog();
				this.getView().addDependent(this._oBusyDialog);
			}
			var bCompact = sap.ui.getCore().byId('CompactModeButtons').getState();
			var sTheme = sap.ui.getCore().byId('ThemeButtons').getSelectedKey();
			var bRTL = sap.ui.getCore().byId('RTLButtons').getState();

			var bRTLChanged = (bRTL !== this._oViewSettings.rtl);

			// busy dialog
			this._oBusyDialog.open();
			jQuery.sap.delayedCall(1000, this, function() {
				this._oBusyDialog.close();
			});

			// write new settings into local storage
			this._oViewSettings.compactOn = bCompact;
			this._oViewSettings.themeActive = sTheme;
			this._oViewSettings.rtl = bRTL;
			//var s = JSON.stringify(this._oViewSettings);
			//this._oStorage.put(this._sStorageKey, s);

			//handle themeChange
			sap.ui.getCore().applyTheme(sTheme);
			//handle compact mode
			jQuery("body").toggleClass("sapUiSizeCompact", bCompact).toggleClass("sapUiSizeCozy", !bCompact);

			if (bRTLChanged) {
				this._handleRTL(bRTL);
			}
		},

		onDialogCloseButton: function() {
			this._oSettingsDialog.close();
		},

		onUser: function(oEvent) {
			if (!this._oUserPopover) {
				this._oUserPopover = sap.ui.xmlfragment("vl.ism.akv.cdv.view.User", this);
				this._oUserPopover.bindElement("/UserSet('CURRENT')");
				this.getView().addDependent(this._oUserPopover);
			}
			if (this._oUserPopover.isOpen()) {
				this._oUserPopover.close();
			} else {
				// delay because addDependent will do a async rerendering and the actionSheet will immediately close without it.
				var oButton = oEvent.getSource();
				jQuery.sap.delayedCall(0, this, function() {
					this._oUserPopover.openBy(oButton);
				});
			}
		},

		onUserLogout: function(oEvent) {

		},

		onAcqChange: function(oEvent) {
			var oModel = this.getComponentModel();
			oModel.submitChanges({
				groupId: "User",
				success: jQuery.proxy(this.adjustViewModel, this)
			});

		},

		adjustViewModel: function() {
			var oModel = this.getComponentModel();
			var oViewModel = this.getModel("view");
			var akvid = oModel.getProperty("/UserSet('CURRENT')/Akvid");
			oViewModel.setProperty("/Main/akvidWarrning", (typeof akvid !== 'undefined' && akvid) ? false : true);
			//var bool = oViewModel.getProperty("/Main/akvidWarrning");
		},

		// trigger reload w/o URL-Parameter;
		_handleRTL: function(bSwitch) {
			jQuery.sap.require("sap.ui.core.routing.HashChanger");
			var HashChanger = sap.ui.require("sap/ui/core/routing/HashChanger");
			var oHashChanger = new HashChanger();
			var sHash = oHashChanger.getHash();
			var oUri = window.location;

			// TODO: remove this fix when microsoft fix this under IE11 on Win 10
			if (!window.location.origin) {
				window.location.origin = window.location.protocol + "//" +
					window.location.hostname +
					(window.location.port ? ':' + window.location.port : '');
			}
			if (bSwitch) {
				// add the parameter
				//sap-no-location-usage
				window.location = oUri.origin + oUri.pathname + "?sap-ui-rtl=true#" + sHash;
			} else {
				// or remove it
				window.location = oUri.origin + oUri.pathname + "#/" + sHash;
			}
		}

	});
});