/**
 * @import { AuthInfo, AuthorizationParams, OAuthTokens, OAuthTokenRevocationRequest, OAuthClientInformationFull } from './types.js'
 */

/**
 * @typedef {Object} OAuthRegisteredClientsStore
 * @property {function(string): Promise<OAuthClientInformationFull | undefined>} getClient - Returns information about a registered client, based on its ID
 * @property {function(Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">): Promise<OAuthClientInformationFull>} [registerClient] - Registers a new client with the server
 */

/**
 * Implements an end-to-end OAuth server.
 * @typedef {Object} OAuthServerProvider
 * @property {OAuthRegisteredClientsStore} clientsStore - A store used to read information about registered OAuth clients
 * @property {function(OAuthClientInformationFull, AuthorizationParams): Promise<Response>} authorize - Begins the authorization flow
 * @property {function(OAuthClientInformationFull, string): Promise<string>} challengeForAuthorizationCode - Returns the codeChallenge that was used when authorization began
 * @property {function(OAuthClientInformationFull, string, string=, string=, URL=): Promise<OAuthTokens>} exchangeAuthorizationCode - Exchanges an authorization code for an access token
 * @property {function(OAuthClientInformationFull, string, string[]=, URL=): Promise<OAuthTokens>} exchangeRefreshToken - Exchanges a refresh token for an access token
 * @property {function(string): Promise<AuthInfo>} verifyAccessToken - Verifies an access token and returns information about it
 * @property {function(OAuthClientInformationFull, OAuthTokenRevocationRequest): Promise<void>} [revokeToken] - Revokes an access or refresh token
 * @property {boolean} [skipLocalPkceValidation] - Whether to skip local PKCE validation
 */

/**
 * Slim implementation useful for token verification
 * @typedef {Object} OAuthTokenVerifier
 * @property {function(string): Promise<AuthInfo>} verifyAccessToken - Verifies an access token and returns information about it
 */

export {};
