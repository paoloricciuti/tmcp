import * as v from 'valibot';

/**
 * Schema for OAuth client metadata during registration
 */
export const OAuthClientMetadataSchema = v.object({
	redirect_uris: v.pipe(
		v.array(v.pipe(v.string(), v.url())),
		v.minLength(1, 'At least one redirect URI is required'),
	),
	response_types: v.optional(v.array(v.string())),
	grant_types: v.optional(v.array(v.string())),
	application_type: v.optional(v.string()),
	contacts: v.optional(v.array(v.pipe(v.string(), v.email()))),
	client_name: v.optional(v.string()),
	logo_uri: v.optional(v.pipe(v.string(), v.url())),
	client_uri: v.optional(v.pipe(v.string(), v.url())),
	policy_uri: v.optional(v.pipe(v.string(), v.url())),
	tos_uri: v.optional(v.pipe(v.string(), v.url())),
	jwks_uri: v.optional(v.pipe(v.string(), v.url())),
	sector_identifier_uri: v.optional(v.pipe(v.string(), v.url())),
	subject_type: v.optional(v.string()),
	token_endpoint_auth_method: v.optional(v.string()),
	scope: v.optional(v.string()),
	software_id: v.optional(v.string()),
	software_version: v.optional(v.string()),
});

/**
 * Schema for full OAuth client information
 */
export const OAuthClientInformationFullSchema = v.object({
	client_id: v.string(),
	client_secret: v.optional(v.string()),
	client_id_issued_at: v.optional(v.number()),
	client_secret_expires_at: v.optional(v.number()),
	redirect_uris: v.array(v.pipe(v.string(), v.url())),
	token_endpoint_auth_method: v.optional(v.string()),
	grant_types: v.optional(v.array(v.string())),
	response_types: v.optional(v.array(v.string())),
	client_name: v.optional(v.string()),
	client_uri: v.optional(v.pipe(v.string(), v.url())),
	logo_uri: v.optional(v.pipe(v.string(), v.url())),
	scope: v.optional(v.string()),
	contacts: v.optional(v.array(v.pipe(v.string(), v.email()))),
	tos_uri: v.optional(v.pipe(v.string(), v.url())),
	policy_uri: v.optional(v.pipe(v.string(), v.url())),
	jwks_uri: v.optional(v.pipe(v.string(), v.url())),
	software_id: v.optional(v.string()),
	software_version: v.optional(v.string()),
});

/**
 * Schema for OAuth token response
 */
export const OAuthTokensSchema = v.object({
	access_token: v.string(),
	token_type: v.string(),
	expires_in: v.optional(v.number()),
	refresh_token: v.optional(v.string()),
	scope: v.optional(v.string()),
	id_token: v.optional(v.string()),
});

/**
 * Schema for token revocation request
 */
export const OAuthTokenRevocationRequestSchema = v.object({
	token: v.string(),
	token_type_hint: v.optional(v.string()),
});

/**
 * Schema for client authentication request
 */
export const ClientAuthenticatedRequestSchema = v.object({
	client_id: v.string(),
	client_secret: v.optional(v.string()),
});

/**
 * Schema for authorization request parameters (client validation phase)
 */
export const ClientAuthorizationParamsSchema = v.object({
	client_id: v.string(),
	redirect_uri: v.optional(v.pipe(v.string(), v.url())),
});

/**
 * Schema for authorization request parameters (request validation phase)
 */
export const RequestAuthorizationParamsSchema = v.object({
	response_type: v.literal('code'),
	code_challenge: v.optional(v.string()),
	code_challenge_method: v.optional(v.literal('S256')),
	scope: v.optional(v.string()),
	state: v.optional(v.string()),
	resource: v.optional(v.pipe(v.string(), v.url())),
});

/**
 * Schema for token request
 */
export const TokenRequestSchema = v.object({
	grant_type: v.string(),
});

/**
 * Schema for authorization code grant
 */
export const AuthorizationCodeGrantSchema = v.object({
	code: v.string(),
	code_verifier: v.optional(v.string()),
	redirect_uri: v.optional(v.string()),
	resource: v.optional(v.pipe(v.string(), v.url())),
});

/**
 * Schema for refresh token grant
 */
export const RefreshTokenGrantSchema = v.object({
	refresh_token: v.string(),
	scope: v.optional(v.string()),
	resource: v.optional(v.pipe(v.string(), v.url())),
});

/**
 * Schema for OAuth error response
 */
export const OAuthErrorResponseSchema = v.object({
	error: v.string(),
	error_description: v.optional(v.string()),
	error_uri: v.optional(v.string()),
	state: v.optional(v.string()),
});
