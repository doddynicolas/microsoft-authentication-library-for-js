/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { AuthenticationResult } from "@azure/msal-common";
import { Configuration } from "../config/Configuration";
import { DEFAULT_REQUEST } from "../utils/BrowserConstants";
import { IPublicClientApplication } from "./IPublicClientApplication";
import { RedirectRequest } from "../request/RedirectRequest";
import { PopupRequest } from "../request/PopupRequest";
import { BrokerManager } from "../broker/BrokerManager";
import { BrokerClient } from "../broker/BrokerClient";
import { ClientApplication } from "./ClientApplication";
import { version } from "../../package.json";

/**
 * The PublicClientApplication class is the object exposed by the library to perform authentication and authorization functions in Single Page Applications
 * to obtain JWT tokens as described in the OAuth 2.0 Authorization Code Flow with PKCE specification.
 */
export class PublicClientApplication extends ClientApplication implements IPublicClientApplication {

    // Broker Objects
    private embeddedApp: BrokerClient;
    private broker: BrokerManager;

    /**
     * @constructor
     * Constructor for the PublicClientApplication used to instantiate the PublicClientApplication object
     *
     * Important attributes in the Configuration object for auth are:
     * - clientID: the application ID of your application. You can obtain one by registering your application with our Application registration portal : https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredAppsPreview
     * - authority: the authority URL for your application.
     * - redirect_uri: the uri of your application registered in the portal.
     *
     * In Azure AD, authority is a URL indicating the Azure active directory that MSAL uses to obtain tokens.
     * It is of the form https://login.microsoftonline.com/{Enter_the_Tenant_Info_Here}
     * If your application supports Accounts in one organizational directory, replace "Enter_the_Tenant_Info_Here" value with the Tenant Id or Tenant name (for example, contoso.microsoft.com).
     * If your application supports Accounts in any organizational directory, replace "Enter_the_Tenant_Info_Here" value with organizations.
     * If your application supports Accounts in any organizational directory and personal Microsoft accounts, replace "Enter_the_Tenant_Info_Here" value with common.
     * To restrict support to Personal Microsoft accounts only, replace "Enter_the_Tenant_Info_Here" value with consumers.
     *
     * In Azure B2C, authority is of the form https://{instance}/tfp/{tenant}/{policyName}/
     * Full B2C functionality will be available in this library in future versions.
     *
     * @param {@link (Configuration:type)} configuration object for the MSAL PublicClientApplication instance
     */
    constructor(configuration: Configuration) {
        super(configuration);
        this.initializeBrokering();
    }

    private initializeBrokering(): void {
        if (this.config.system.brokerOptions.actAsBroker) {
            this.broker = new BrokerManager(this.config.system.brokerOptions, this.logger, version);
            this.logger.verbose("Acting as Broker");
            this.broker.listenForMessage();
        } else if (this.config.system.brokerOptions.allowBrokering) {
            this.embeddedApp = new BrokerClient(this.config.system.brokerOptions, this.logger, this.config.auth.clientId,  version);
            this.logger.verbose("Acting as child");
            this.embeddedApp.initiateHandshake();
        }
    }

    /**
     * Use when initiating the login process by redirecting the user's browser to the authorization endpoint. This function redirects the page, so
     * any code that follows this function will not execute.
	 *
	 * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
	 * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
	 *
     * @param {@link (RedirectRequest:type)}
     */
    async loginRedirect(request?: RedirectRequest): Promise<void> {
        return this.acquireTokenRedirect(request || DEFAULT_REQUEST);
    }

    /**
     * Use when you want to obtain an access_token for your API by redirecting the user's browser window to the authorization endpoint. This function redirects
     * the page, so any code that follows this function will not execute.
	 *
	 * IMPORTANT: It is NOT recommended to have code that is dependent on the resolution of the Promise. This function will navigate away from the current
	 * browser window. It currently returns a Promise in order to reflect the asynchronous nature of the code running in this function.
     *
     * @param {@link (RedirectRequest:type)}
     */
    async acquireTokenRedirect(request: RedirectRequest): Promise<void> {
        // Check for brokered request
        if (this.embeddedApp && this.embeddedApp.brokeringEnabled) {
            return this.embeddedApp.sendRedirectRequest(request);
        }
        return super.acquireTokenRedirect(request);
    }

    // #endregion

    // #region Popup Flow

    /**
     * Use when initiating the login process via opening a popup window in the user's browser
     *
     * @param {@link (PopupRequest:type)}
     *
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse} object
     */
    loginPopup(request?: PopupRequest): Promise<AuthenticationResult> {
        return this.acquireTokenPopup(request || DEFAULT_REQUEST);
    }

    /**
     * Use when you want to obtain an access_token for your API via opening a popup window in the user's browser
     * @param {@link (PopupRequest:type)}
     *
     * @returns {Promise.<AuthenticationResult>} - a promise that is fulfilled when this function has completed, or rejected if an error was raised. Returns the {@link AuthResponse} object
     */
    acquireTokenPopup(request: PopupRequest): Promise<AuthenticationResult> {
        if (this.embeddedApp && this.embeddedApp.brokeringEnabled) {
            return this.embeddedApp.sendPopupRequest(request);
        }
        return super.acquireTokenPopup(request);
    }

    // #endregion
}