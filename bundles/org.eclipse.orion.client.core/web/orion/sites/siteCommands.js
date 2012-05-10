/*******************************************************************************
 * @license
 * Copyright (c) 2011, 2012 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

/*global console define document window*/
define(['require', 'orion/commands', 'orion/sites/siteUtils', 'orion/sites/siteClient', 'orion/fileClient'],
		function(require, mCommands, mSiteUtils, mSiteClient) {
	var Command = mCommands.Command;

	/**
	 * Creates & adds commands that act on an site service.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @param {Function} options.createCallback
	 * @param {Function} options.errorCallback
	 * @name orion.sites.siteCommands#createSiteServiceCommands
	 */
	function createSiteServiceCommands(serviceRegistry, options) {
		function getFileService(siteServiceRef) {
			return mSiteClient.getFileClient(serviceRegistry, siteServiceRef.getProperty('filePattern'));
		}
		options = options || {};
		var commandService = serviceRegistry.getService("orion.page.command");
		var createCommand = new mCommands.Command({
			name : "Create",
			tooltip: "Create a new site configuration",
			id: "orion.site.create",
			parameters: new mCommands.ParametersDescription([new mCommands.CommandParameter('name', 'string', 'Name:')]),
			visibleWhen: function(bah) {
				return true;
			},
			callback : function(data) {
				var siteServiceRef = data.items, siteService = serviceRegistry.getService(siteServiceRef);
				var fileService = getFileService(siteServiceRef);
				var name = data.parameters && data.parameters.valueFor('name');
				fileService.loadWorkspaces().then(function(workspaces) {
			        var workspaceId = workspaces && workspaces[0] && workspaces[0].Id;
			        if (workspaceId && name) {
				        siteService.createSiteConfiguration(name, workspaceId).then(function(site) {
							options.createCallback(mSiteUtils.generateEditSiteHref(site), site);
						}, options.errorCallback);
			        }
				});
			}});
		commandService.addCommand(createCommand);
	}

	/**
	 * Creates & adds commands that act on an individual site configuration.
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @name orion.sites.siteCommands#createSiteCommands
	 */
	function createSiteCommands(serviceRegistry) {
		var commandService = serviceRegistry.getService("orion.page.command"),
		    dialogService = serviceRegistry.getService("orion.page.dialog"),
		    progressService = serviceRegistry.getService("orion.page.progress");
		var editCommand = new Command({
			name: "Edit",
			tooltip: "Edit the site configuration",
			imageClass: "core-sprite-edit",
			id: "orion.site.edit",
			visibleWhen: function(item) {
				return item.HostingStatus;
			},
			hrefCallback: function(data) { return mSiteUtils.generateEditSiteHref(data.items);}});
		commandService.addCommand(editCommand);

		var startCommand = new Command({
			name: "Start",
			tooltip: "Start the site",
			imageClass: "core-sprite-start",
			id: "orion.site.start",
			visibleWhen: function(item) {
				return item.HostingStatus && item.HostingStatus.Status === "stopped";
			},
			/**
			 * @param {SiteConfiguration} [userData.site] If passed, we'll mutate this site config.
			 * @param {Function} [userData.startCallback]
			 * @param {Function} [userData.errorCallback]
			 */
			callback: function(data) {
				var userData = data.userData;
				var newItem = userData.site || {} /* just update the HostingStatus */;
				newItem.HostingStatus = { Status: "started" };
				var location = data.items.Location;
				var siteService = mSiteClient.forLocation(serviceRegistry, location);
				var deferred = siteService.updateSiteConfiguration(location, newItem);
				progressService.showWhile(deferred).then(userData.startCallback, userData.errorCallback);
			}});
		commandService.addCommand(startCommand);

		var stopCommand = new Command({
			name: "Stop",
			tooltip: "Stop the site",
			imageClass: "core-sprite-stop",
			id: "orion.site.stop",
			visibleWhen: function(item) {
				return item.HostingStatus && item.HostingStatus.Status === "started";
			},
			/**
			 * @param {SiteConfiguration} [data.userData.site] If passed, we'll mutate this site config.
			 * @param {Function} [data.userData.stopCallback]
			 * @param {Function} [data.userData.errorCallback]
			 */
			callback: function(data) {
				var userData = data.userData;
				var newItem = userData.site || {} /* just update the HostingStatus */;
				newItem.HostingStatus = { Status: "stopped" };
				var location = data.items.Location;
				var siteService = mSiteClient.forLocation(serviceRegistry, location);
				var deferred = siteService.updateSiteConfiguration(location, newItem);
				progressService.showWhile(deferred).then(userData.stopCallback, userData.errorCallback);
			}});
		commandService.addCommand(stopCommand);

		var deleteCommand = new Command({
			name: "Delete",
			tooltip: "Delete the site configuration",
			imageClass: "core-sprite-delete",
			id: "orion.site.delete",
			visibleWhen: function(item) {
				return item.HostingStatus && item.HostingStatus.Status === "stopped";
			},
			/**
			 * @param {Function} [data.userData.deleteCallback]
			 * @param {Function} [data.userData.errorCallback]
			 */
			callback: function(data) {
				var msg = "Are you sure you want to delete the site configuration '" + data.items.Name + "'?";
				dialogService.confirm(msg, function(confirmed) {
					if (confirmed) {
						var location = data.items.Location;
						var userData = data.userData;
						var siteService = mSiteClient.forLocation(serviceRegistry, location);
						siteService.deleteSiteConfiguration(location).then(userData.deleteCallback, userData.errorCallback);
					}
				});
			}});
		commandService.addCommand(deleteCommand);
	}

// TODO deal with this
//	var workspacesCache = null;
//
//	function WorkspacesCache(fileService) {
//		var promise = null;
//		this.getWorkspaces = function() {
//			if (!promise) {
//				promise = fileService.loadWorkspaces();
//			}
//			return promise;
//		};
//	}
//
//	function initCache(serviceRegistry) {
//		if (!workspacesCache) {
//			workspacesCache = new WorkspacesCache(serviceRegistry.getService("orion.core.file"));
//		}
//	}
	/**
	 * @param {orion.serviceregistry.ServiceRegistry} serviceRegistry
	 * @name orion.sites.siteCommands#createViewOnSiteCommands
	 */
	function createViewOnSiteCommands(serviceRegistry, options) {
		var fileService = serviceRegistry.getService("orion.core.file");
		var commandService = serviceRegistry.getService("orion.page.command");
		commandService.addCommand(new Command({
			name: "Add to site",
			tooltip: "Add the file to this site",
			id: "orion.site.add-to",
			imageClass: "core-sprite-add",
			visibleWhen: function(item) {
				// Model tells us whether the file is running on the site configuration
				return !item.IsFileRunningOn;
			},
			/**
			 * @param {Function} data.userData.addToCallback
			 * @param {Function} data.userData.errorCallback
			 * @param {Object} data.userData.file
			 */
			callback: function(data) {
				var file = data.userData.file;
				var site = data.items.SiteConfiguration;
				return fileService.loadWorkspaces().then(function(workspaces) {
					return mSiteClient.forFileLocation(serviceRegistry, file.Location).mapOnSiteAndStart(site, file, workspaces[0].Id);
				}).then(data.userData.addToCallback, data.userData.errorCallback);
			}}));
		// Command that generates a href to view the file on the site if it's mapped
		commandService.addCommand(new Command({
			name: "View",
			tooltip: "View the file on the site",
			id: "orion.site.view-on-link",
			visibleWhen: function(item) {
				return item.IsFileRunningOn;
			},
			hrefCallback: function(data) {
				var file = data.userData.file;
				var site = data.items.SiteConfiguration;
				return mSiteClient.forFileLocation(serviceRegistry, file.Location).getURLOnSite(site, file);
			}}));
	}
	return {
		createSiteServiceCommands: createSiteServiceCommands,
		createSiteCommands: createSiteCommands,
		createViewOnSiteCommands: createViewOnSiteCommands
	};
});