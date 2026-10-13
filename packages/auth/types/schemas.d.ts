/**
 * Schema for OAuth client metadata during registration
 */
export const OAuthClientMetadataSchema: v.ObjectSchema<{
    readonly redirect_uris: v.SchemaWithPipe<readonly [v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>, v.MinLengthAction<string[], 1, "At least one redirect URI is required">]>;
    readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    readonly application_type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.EmailAction<string, undefined>]>, undefined>, undefined>;
    readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly sector_identifier_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly subject_type: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly software_id: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly software_version: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Schema for full OAuth client information
 */
export const OAuthClientInformationFullSchema: v.ObjectSchema<{
    readonly client_id: v.StringSchema<undefined>;
    readonly client_secret: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly client_id_issued_at: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly client_secret_expires_at: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly redirect_uris: v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly grant_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    readonly response_types: v.OptionalSchema<v.ArraySchema<v.StringSchema<undefined>, undefined>, undefined>;
    readonly client_name: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly client_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly logo_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly contacts: v.OptionalSchema<v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.EmailAction<string, undefined>]>, undefined>, undefined>;
    readonly tos_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly policy_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly jwks_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
    readonly software_id: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly software_version: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Schema for an OAuth Client ID Metadata Document.
 */
export const ClientIdMetadataDocumentSchema: v.SchemaWithPipe<readonly [v.LooseObjectSchema<{
    readonly client_id: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>;
    readonly client_name: v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MinLengthAction<string, 1, undefined>]>;
    readonly redirect_uris: v.SchemaWithPipe<readonly [v.ArraySchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>, v.MinLengthAction<string[], 1, undefined>]>;
    readonly token_endpoint_auth_method: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>, v.CheckAction<{
    client_id: string;
    client_name: string;
    redirect_uris: string[];
    token_endpoint_auth_method?: string | undefined;
} & {
    [key: string]: unknown;
}, "Client ID Metadata Documents cannot use shared-secret authentication">]>;
/**
 * Schema for OAuth token response
 */
export const OAuthTokensSchema: v.ObjectSchema<{
    readonly access_token: v.StringSchema<undefined>;
    readonly token_type: v.StringSchema<undefined>;
    readonly expires_in: v.OptionalSchema<v.NumberSchema<undefined>, undefined>;
    readonly refresh_token: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly id_token: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Schema for token revocation request
 */
export const OAuthTokenRevocationRequestSchema: v.ObjectSchema<{
    readonly token: v.StringSchema<undefined>;
    readonly token_type_hint: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Schema for client authentication request
 */
export const ClientAuthenticatedRequestSchema: v.ObjectSchema<{
    readonly client_id: v.StringSchema<undefined>;
    readonly client_secret: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
/**
 * Schema for authorization request parameters (client validation phase)
 */
export const ClientAuthorizationParamsSchema: v.ObjectSchema<{
    readonly client_id: v.StringSchema<undefined>;
    readonly redirect_uri: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
}, undefined>;
/**
 * Schema for authorization request parameters (request validation phase)
 */
export const RequestAuthorizationParamsSchema: v.ObjectSchema<{
    readonly response_type: v.LiteralSchema<"code", undefined>;
    readonly code_challenge: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly code_challenge_method: v.OptionalSchema<v.LiteralSchema<"S256", undefined>, undefined>;
    readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly state: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
}, undefined>;
/**
 * Schema for token request
 */
export const TokenRequestSchema: v.ObjectSchema<{
    readonly grant_type: v.StringSchema<undefined>;
}, undefined>;
/**
 * Schema for authorization code grant
 */
export const AuthorizationCodeGrantSchema: v.ObjectSchema<{
    readonly code: v.StringSchema<undefined>;
    readonly code_verifier: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly redirect_uri: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
}, undefined>;
/**
 * Schema for refresh token grant
 */
export const RefreshTokenGrantSchema: v.ObjectSchema<{
    readonly refresh_token: v.StringSchema<undefined>;
    readonly scope: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly resource: v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.UrlAction<string, undefined>]>, undefined>;
}, undefined>;
/**
 * Schema for OAuth error response
 */
export const OAuthErrorResponseSchema: v.ObjectSchema<{
    readonly error: v.StringSchema<undefined>;
    readonly error_description: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly error_uri: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
    readonly state: v.OptionalSchema<v.StringSchema<undefined>, undefined>;
}, undefined>;
import * as v from 'valibot';
//# sourceMappingURL=schemas.d.ts.map