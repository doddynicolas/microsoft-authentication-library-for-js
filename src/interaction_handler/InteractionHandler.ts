/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { StringUtils, AuthorizationCodeRequest, CacheSchemaType, AuthenticationResult, AuthorizationCodeClient, ServerAuthorizationCodeResponse, UrlString } from "@azure/msal-common";
import { BrowserStorage } from "../cache/BrowserStorage";
import { BrowserAuthError } from "../error/BrowserAuthError";
import { TemporaryCacheKeys } from "../utils/BrowserConstants";

/**
 * Abstract class which defines operations for a browser interaction handling class.
 */
export abstract class InteractionHandler {

    protected authModule: AuthorizationCodeClient;
    protected browserStorage: BrowserStorage;
    protected authCodeRequest: AuthorizationCodeRequest;

    constructor(authCodeModule: AuthorizationCodeClient, storageImpl: BrowserStorage) {
        this.authModule = authCodeModule;
        this.browserStorage = storageImpl;
    }

    /**
     * Function to enable user interaction.
     * @param requestUrl
     */
    abstract initiateAuthRequest(requestUrl: string, authCodeRequest: AuthorizationCodeRequest): Window | Promise<HTMLIFrameElement>;

    /**
     * Function to handle response parameters from hash.
     * @param locationHash
     */
    async handleCodeResponse(locationHash: string): Promise<AuthenticationResult> {
        // Check that location hash isn't empty.
        if (StringUtils.isEmpty(locationHash)) {
            throw BrowserAuthError.createEmptyHashError(locationHash);
        }

        const hashUrlString = new UrlString(locationHash);
        // Deserialize hash fragment response parameters.
        const serverParams: ServerAuthorizationCodeResponse = UrlString.getDeserializedHash(hashUrlString.getHash());

        // Handle code response.
        const requestState = this.browserStorage.getItem(this.browserStorage.generateStateKey(serverParams.state), CacheSchemaType.TEMPORARY) as string;
        const authCode = this.authModule.handleFragmentResponse(locationHash, requestState);
        
        // Get cached items
        const cachedNonceKey = this.browserStorage.generateNonceKey(requestState);
        const cachedNonce = this.browserStorage.getItem(this.browserStorage.generateCacheKey(cachedNonceKey), CacheSchemaType.TEMPORARY) as string;

        // Assign code to request
        this.authCodeRequest.code = authCode;

        // Acquire token with retrieved code.
        const tokenResponse = await this.authModule.acquireToken(this.authCodeRequest, cachedNonce, requestState);
        this.browserStorage.cleanRequest(serverParams.state);
        return tokenResponse;
    }
}