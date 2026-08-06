/* eslint-disable jsdoc/no-undefined-types */
/**
 * @import { StandardSchemaV1 } from "@standard-schema/spec";
 * @import SqidsType from "sqids";
 * @import { JSONRPCRequest, JSONRPCParams } from "json-rpc-2.0";
 * @import { ExtractURITemplateVariables } from "./internal/uri-template.js";
 * @import { CallToolResult as CallToolResultType, ReadResourceResult as ReadResourceResultType, GetPromptResult as GetPromptResultType, ServerInfo as ServerInfoType, ClientCapabilities as ClientCapabilitiesType, JSONRPCRequest as JSONRPCRequestType, JSONRPCResponse, CreateMessageRequestParams as CreateMessageRequestParamsType, CreateMessageResult as CreateMessageResultType, Resource as ResourceType, LoggingLevel as LoggingLevelType, ToolAnnotations, ClientInfo as ClientInfoType, ElicitResult as ElicitResultType, Icons as IconsType, JSONRPCMessage, InitializeResult as InitializeResultType, ListToolsResult as ListToolsResultType, ListPromptsResult as ListPromptsResultType, ListResourceTemplatesResult as ListResourceTemplatesResultType, ListResourcesResult as ListResourcesResultType, CompleteResult as CompleteResultType, SubscriptionFilter as SubscriptionFilterType, SubscriptionsListenRequest as SubscriptionsListenRequestType, SubscriptionsListenResult as SubscriptionsListenResultType, SubscriptionsAcknowledgedNotification as SubscriptionsAcknowledgedNotificationType } from "./validation/index.js";
 * @import { Tool, Completion, Prompt, StoredResource, ServerOptions, SubscriptionsKeys, ChangedArgs, McpEvents, AllSame, TemplateOptions, MrtrState, Subscription as SubscriptionType, SubscriptionCallbacks as SubscriptionCallbacksType, SubscriptionManager as SubscriptionManagerType, SubscriptionOrigin as SubscriptionOriginType } from "./internal/internal.js";
 * @import { CreatedTool, ToolOptions, CreatedPrompt, PromptOptions, CreatedResource, CreatedTemplate, ResourceOptions } from "./internal/internal.js";
 */
import {
	createJSONRPCErrorResponse,
	JSONRPCClient,
	JSONRPCErrorException,
	JSONRPCServer,
} from 'json-rpc-2.0';
import { AsyncLocalStorage } from 'node:async_hooks';
import { UriTemplateMatcher } from 'uri-template-matcher';
import * as v from 'valibot';
import {
	CallToolResultSchema,
	CancelledNotificationSchema,
	ClientCapabilitiesSchema,
	CompleteResultSchema,
	CreateMessageRequestParamsSchema,
	CreateMessageResultSchema,
	GetPromptResultSchema,
	ImplementationSchema,
	InitializeRequestParamsSchema,
	JSONRPCNotificationSchema,
	JSONRPCRequestSchema,
	JSONRPCResponseSchema,
	LoggingLevelSchema,
	McpError,
	ReadResourceResultSchema,
	ElicitRequestSchema,
	ElicitResultSchema,
	JSONRPCErrorSchema,
	InputResponsesSchema,
	missing_required_client_capability_error,
	SUBSCRIPTION_ID_META_KEY,
	SubscriptionsListenRequestParamsSchema,
	unsupported_protocol_version_error,
} from './validation/index.js';
import {
	get_supported_versions,
	negotiate_protocol_version,
	KNOWN_PER_REQUEST_PROTOCOL_VERSIONS,
} from './validation/version.js';
import { should_version_negotiation_fail } from './validation/version.js';
import {
	is_method_allowed,
	CACHEABLE_METHODS,
	MRTR_METHODS,
} from './validation/method-policy.js';
import { event } from './internal/utils.js';

export {
	McpError,
	HEADER_MISMATCH,
	MISSING_REQUIRED_CLIENT_CAPABILITY,
	UNSUPPORTED_PROTOCOL_VERSION,
} from './validation/index.js';

/**
 * Maximum length of the `requestState` text accepted from or returned to a
 * client. This prevents a client from making the server process an
 * excessively large value.
 */
const MAX_ENCODED_REQUEST_STATE_LENGTH = 262144;
const RequestStateEnvelopeSchema = v.object({
	version: v.literal(1),
	inputResponses: InputResponsesSchema,
	state: v.optional(v.unknown()),
});

/**
 * Private error used to stop a handler when it needs input from the client.
 * The server catches it and returns an `InputRequiredResult` instead of an
 * error response. It is not exported, so application code cannot create a
 * fake one.
 */
class InputRequiredSignal extends Error {
	constructor() {
		super(
			'Input required: this request must end with an InputRequiredResult. If you see this message in a response, a catch block in a handler swallowed the internal input-required signal or the input call was not awaited — always await input calls and rethrow the signal (see isInputRequired()).',
		);
		this.name = 'InputRequiredSignal';
	}
}

/**
 * Check whether an error means that tmcp is waiting for client input.
 *
 * When there is no open connection to the client, `elicitation()` and
 * `message()` ask the client to retry the original request with the answer.
 * They stop the current handler by throwing a private error. A broad `catch`
 * in the handler must rethrow that error, or tmcp cannot ask for the retry.
 * Use this helper to distinguish it from errors your handler should process:
 *
 * ```js
 * try {
 *   const answer = await server.elicitation(msg, schema);
 * } catch (error) {
 *   if (isInputRequired(error)) throw error;
 *   // handle the real error
 * }
 * ```
 * @param {unknown} error
 * @returns {boolean}
 */
export function isInputRequired(error) {
	return error instanceof InputRequiredSignal;
}

/**
 * Return the per-request protocol versions supported by tmcp.
 * @returns {string[]}
 */
export function getPerRequestProtocolVersions() {
	return [...KNOWN_PER_REQUEST_PROTOCOL_VERSIONS];
}

/**
 * Information about a validated access token, provided to request handlers.
 * @typedef {Object} AuthInfo
 * @property {string} token - The access token.
 * @property {string} clientId - The client ID associated with this token.
 * @property {string[]} scopes - Scopes associated with this token.
 * @property {number} [expiresAt] - When the token expires (in seconds since epoch).
 * @property {URL} [resource] - The RFC 8707 resource server identifier for which this token is valid.
 *   If set, this MUST match the MCP server's resource identifier (minus hash fragment).
 * @property {Record<string, unknown>} [extra] - Additional data associated with the token.
 *   This field should be used for any additional data that needs to be attached to the auth info.
 */

/**
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 * @typedef {Object} Context
 * @property {string} [sessionId]
 * @property {{ clientCapabilities?: ClientCapabilitiesType, clientInfo?: ClientInfoType, logLevel?: LoggingLevel }} [sessionInfo]
 * @property {string} [protocolVersion] The exact per-request protocol version when the current request carries per-request protocol metadata; `undefined` for session-negotiated requests.
 * @property {unknown} [requestState] Data saved by the handler before asking the client for input, then returned by the client on the retry. It is `undefined` when no data was saved or when the request uses an open session. The default JSON converter lets the client read and change this value. Do not store secrets in it or use it to make authorization decisions. Configure `requestStateCodec` if the server must detect changes.
 * @property {AbortSignal} [signal] Aborted when the transport observes that the current request was cancelled.
 * @property {AuthInfo} [auth]
 * @property {TCustom} [custom]
 */

/**
 * Context accepted by `receive()`. Subscription routing fields are
 * transport-only and are deliberately omitted from `server.ctx`.
 * @template {Record<string, unknown> | undefined} [TCustom=undefined]
 * @typedef {Context<TCustom> & { subscriptionOrigin?: SubscriptionOriginType, subscriptionManager?: SubscriptionManagerType }} ReceiveContext
 */

/** @typedef {SubscriptionFilterType} SubscriptionFilter */
/** @typedef {SubscriptionOriginType} SubscriptionOrigin */
/** @typedef {SubscriptionType} Subscription */
/** @typedef {SubscriptionCallbacksType} SubscriptionCallbacks */
/** @typedef {SubscriptionManagerType} SubscriptionManager */
/** @typedef {SubscriptionsListenRequestType} SubscriptionsListenRequest */
/** @typedef {SubscriptionsListenResultType} SubscriptionsListenResult */
/** @typedef {SubscriptionsAcknowledgedNotificationType} SubscriptionsAcknowledgedNotification */

/**
 * @typedef {IconsType} Icons
 */

/**
 * @typedef {Record<SubscriptionsKeys, string[]>} Subscriptions
 */

/**
 * @template TStructuredContent
 * @typedef {CallToolResultType<TStructuredContent>} CallToolResult
 */

/**
 * @typedef {ReadResourceResultType} ReadResourceResult
 */

/**
 * @typedef {GetPromptResultType} GetPromptResult
 */

/**
 * @typedef {ClientCapabilitiesType} ClientCapabilities
 */

/**
 * @typedef {ServerInfoType} ServerInfo
 */

/**
 * @typedef {CreateMessageRequestParamsType} CreateMessageRequestParams
 */

/**
 * @typedef {CreateMessageResultType} CreateMessageResult
 */

/**
 * @typedef {ResourceType} Resource
 */

/**
 * @typedef  {LoggingLevelType} LoggingLevel
 */

/**
 * @typedef  {ClientInfoType} ClientInfo
 */

/**
 * @typedef  {ElicitResultType} ElicitResult
 */

/**
 * @typedef {InitializeResultType} InitializeResult
 */

/**
 * @typedef {ListToolsResultType} ListToolsResult
 */

/**
 * @typedef {ListPromptsResultType} ListPromptsResult
 */

/**
 * @typedef {ListResourceTemplatesResultType} ListResourceTemplatesResult
 */

/**
 * @typedef {ListResourcesResultType} ListResourcesResult
 */
/**
 * @typedef {CompleteResultType} CompleteResult
 */

/**
 * @type {SqidsType | undefined}
 */
let Sqids;

async function get_sqids() {
	if (!Sqids) {
		Sqids = new (await import('sqids')).default();
	}
	return Sqids;
}

/**
 * Encode a cursor for pagination
 * @param {number} offset
 */
async function encode_cursor(offset) {
	return (await get_sqids()).encode([offset]);
}

/**
 * Decode a cursor from pagination
 * @param {string} cursor
 */
async function decode_cursor(cursor) {
	const [decoded] = (await get_sqids()).decode(cursor);
	return decoded;
}

/**
 * @param {()=>boolean | Promise<boolean>} enabled
 */
async function safe_enabled(enabled) {
	try {
		return await enabled();
	} catch {
		return false;
	}
}

/**
 * @template {StandardSchemaV1 | undefined} [StandardSchema=undefined]
 * @template {Record<string, unknown> | undefined} [CustomContext=undefined]
 */
export class McpServer {
	#server = new JSONRPCServer({
		errorListener: (...args) => {
			const mrtr = this.#ctx_storage.getStore()?.mrtr;
			if (mrtr !== undefined && args[1] === mrtr.signal) return;
			console.warn(...args);
		},
	});
	/**
	 * @type {JSONRPCClient<"broadcast" | "standalone"> | undefined}
	 */
	#client;
	#options;
	/**
	 * @type {Map<string, Tool<any, any>>}
	 */
	#tools = new Map();
	/**
	 * @type {Map<string, Prompt<any>>}
	 */
	#prompts = new Map();
	/**
	 * @type {Map<string, StoredResource>}
	 */
	#resources = new Map();
	#templates = new UriTemplateMatcher();
	/**
	 * @type {Array<{uri: string, name?: string}>}
	 */
	roots = [];
	/**
	 * @type {{ [ref: string]: Map<string, Partial<Record<string, Completion>>> }}
	 */
	#completions = {
		'ref/prompt': new Map(),
		'ref/resource': new Map(),
	};

	#event_target = new EventTarget();

	/**
	 * @type {ServerInfo}
	 */
	#server_info;

	/**
	 * @type {AsyncLocalStorage<ReceiveContext<CustomContext> & { progress_token?: string, request_id?: string | number, stateless?: boolean, mrtr?: MrtrState }>}
	 */
	#ctx_storage = new AsyncLocalStorage();

	/**
	 * @param {ServerInfo} server_info
	 * @param {ServerOptions<StandardSchema>} options
	 */
	constructor(server_info, options) {
		this.#options = options;
		this.#server_info = server_info;
		// Remember when a handler stopped because it needs client input. After
		// the JSON-RPC library finishes, `receive()` replaces that temporary
		// error with an `InputRequiredResult`. All other errors keep their
		// normal code and message.
		this.#server.mapErrorToJSONRPCErrorResponse = (id, error) => {
			const mrtr = this.#ctx_storage.getStore()?.mrtr;
			if (
				mrtr !== undefined &&
				error === mrtr.signal &&
				mrtr.pending.size > 0
			) {
				mrtr.signal_at_boundary = true;
			}
			if (error instanceof JSONRPCErrorException) {
				return createJSONRPCErrorResponse(
					id,
					error.code,
					error.message,
					error.data,
				);
			}
			return createJSONRPCErrorResponse(
				id,
				-32603,
				/** @type {Error | undefined} */ (error)?.message ??
					'An unexpected error occurred',
			);
		};
		this.#server.addMethod('initialize', (initialize_request) => {
			try {
				// Validate basic request format
				const validated_initialize = v.parse(
					InitializeRequestParamsSchema,
					initialize_request,
				);

				// Validate protocol version format
				if (
					should_version_negotiation_fail(
						validated_initialize.protocolVersion,
					)
				) {
					// Return JSON-RPC error for invalid protocol version format
					const error = new McpError(
						-32602,
						'Invalid protocol version format',
					);
					throw error;
				}

				// Negotiate protocol version
				const negotiated_version = negotiate_protocol_version(
					validated_initialize.protocolVersion,
				);

				// Dispatch initialization event
				this.#event_target.dispatchEvent(
					event('initialize', validated_initialize),
				);

				// Return server response with negotiated version and capabilities
				// (per-request protocol options are not part of the legacy initialize result)
				// eslint-disable-next-line no-unused-vars
				const { cache, ...legacy_options } = options;
				return {
					protocolVersion: negotiated_version,
					...legacy_options,
					serverInfo: server_info,
				};
			} catch (error) {
				// Enhanced error handling for initialization failures
				if (error instanceof McpError) {
					// Already has JSON-RPC error code, re-throw
					throw error;
				}

				if (
					/** @type {Error} */ (error).message?.includes(
						'Protocol version',
					)
				) {
					const rpc_error = new McpError(
						-32602,
						`Protocol version validation failed: ${/** @type {Error} */ (error).message}. Server supports: ${get_supported_versions().join(', ')}`,
					);
					throw rpc_error;
				}

				// General initialization error
				const rpc_error = new McpError(
					-32603,
					`Initialization failed: ${/** @type {Error} */ (error).message}`,
				);
				throw rpc_error;
			}
		});
		this.#server.addMethod('ping', () => {
			return {};
		});
		this.#server.addMethod('notifications/initialized', () => {
			return null;
		});
		this.#server.addMethod('server/discover', () => {
			// only reachable for per-request (stateless) requests thanks to
			// the method policy guard in `receive`
			return {
				supportedVersions: this.#enabled_protocol_versions(),
				capabilities: this.#discover_capabilities(),
				...(this.#options.instructions != null
					? { instructions: this.#options.instructions }
					: {}),
			};
		});
		this.#init_tools();
		this.#init_prompts();
		this.#init_resources();
		this.#init_roots();
		this.#init_completion();
		this.#init_logging();
		this.#init_subscriptions();
	}

	/**
	 * Utility method to specify the type of the custom context for this server instance without the need to specify the standard schema type.
	 * @example
	 * const server = new McpServer({ ... }, { ... }).withContext<{ name: string }>();
	 * @template {Record<string, unknown>} TCustom
	 * @returns {McpServer<StandardSchema, TCustom>}
	 */
	withContext() {
		return /** @type {McpServer<StandardSchema, TCustom>} */ (
			/** @type {unknown} */ (this)
		);
	}

	get #progress_token() {
		return this.#ctx_storage.getStore()?.progress_token;
	}

	/**
	 * The context of the current request, include the session ID, any auth information, and custom data.
	 * @type {Context<CustomContext>}
	 */
	get ctx() {
		/* eslint-disable no-unused-vars */
		const {
			progress_token,
			request_id,
			stateless,
			mrtr,
			subscriptionOrigin,
			subscriptionManager,
			...rest
		} = this.#ctx_storage.getStore() ?? {};
		/* eslint-enable no-unused-vars */
		if (mrtr !== undefined) {
			rest.requestState = mrtr.incoming_state;
		}
		return rest;
	}

	get #client_capabilities() {
		return this.#ctx_storage.getStore()?.sessionInfo?.clientCapabilities;
	}

	/**
	 * Get the client information (name, version, etc.) of the client that initiated the current request...useful if you want to do something different based on the client.
	 * @deprecated Use `server.ctx.sessionInfo.clientInfo` instead.
	 */
	currentClientInfo() {
		return this.#ctx_storage.getStore()?.sessionInfo?.clientInfo;
	}

	/**
	 * Get the client capabilities of the client that initiated the current request, you can use this to verify the client support something before invoking the respective method.
	 * @deprecated Use `server.ctx.sessionInfo.clientCapabilities` instead.
	 */
	currentClientCapabilities() {
		return this.#client_capabilities;
	}

	#lazyily_create_client() {
		if (!this.#client) {
			this.#client = new JSONRPCClient((payload, kind) => {
				if (kind === 'broadcast') {
					this.#event_target.dispatchEvent(
						event('broadcast', { request: payload }),
					);
					return;
				}
				this.#event_target.dispatchEvent(
					event('send', { request: payload }),
				);
			});
		}
	}

	/**
	 * @template {keyof McpEvents} TEvent
	 * @param {TEvent} event
	 * @param {McpEvents[TEvent]} callback
	 * @param {AddEventListenerOptions} [options]
	 */
	on(event, callback, options) {
		if (event === 'send' || event === 'broadcast') {
			this.#lazyily_create_client();
		}

		/**
		 * @param {Event} e
		 */
		const listener = (e) => {
			callback(/** @type {CustomEvent} */ (e).detail);
		};

		this.#event_target.addEventListener(event, listener, options);

		return () => {
			this.#event_target.removeEventListener(event, listener, options);
		};
	}

	/**
	 * @param {string} method
	 * @param {JSONRPCParams} [params]
	 * @param {"broadcast" | "standalone"} [kind]
	 */
	#notify(method, params, kind = 'standalone') {
		this.#client?.notify(method, params, kind);
	}

	/**
	 *
	 */
	#init_tools() {
		if (!this.#options.capabilities?.tools) return;
		this.#server.addMethod('tools/list', async ({ cursor } = {}) => {
			const all_tools = (
				await Promise.all(
					[...this.#tools].map(async ([name, tool]) => {
						if (
							tool.enabled != null &&
							(await safe_enabled(tool.enabled)) === false
						)
							return null;
						return {
							name,
							title: tool.title || tool.description,
							description: tool.description,
							icons: tool.icons,
							_meta: tool._meta,
							inputSchema:
								tool.schema && this.#options.adapter
									? await this.#options.adapter.toJsonSchema(
											tool.schema,
										)
									: { type: 'object', properties: {} },
							...(tool.outputSchema && this.#options.adapter
								? {
										outputSchema:
											await this.#options.adapter.toJsonSchema(
												tool.outputSchema,
											),
									}
								: {}),
							...(tool.annotations
								? {
										annotations: tool.annotations,
									}
								: {}),
						};
					}),
				)
			).filter((tool) => tool !== null);

			const pagination_options = this.#options.pagination?.tools;
			if (!pagination_options || pagination_options.size == null) {
				return { tools: all_tools };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const tools = all_tools.slice(start_index, end_index);
			const has_next = end_index < all_tools.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				tools,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod(
			'tools/call',
			async ({ name, arguments: args }) => {
				const tool = this.#tools.get(name);
				if (!tool) {
					return /** @type {CallToolResult<any>} */ ({
						isError: true,
						content: [
							{
								type: 'text',
								text: `Tool ${name} not found`,
							},
						],
					});
				}

				// Validate input arguments if schema is provided
				let validated_args = args;
				this.#mark_mrtr_registration('tool', name, tool.replayable);
				if (tool.schema) {
					let validation_result =
						tool.schema['~standard'].validate(args);
					if (validation_result instanceof Promise)
						validation_result = await validation_result;
					if (validation_result.issues) {
						return /** @type {CallToolResult<any>} */ ({
							isError: true,
							content: [
								{
									type: 'text',
									text: `Invalid arguments for tool ${name}: ${JSON.stringify(validation_result.issues)}`,
								},
							],
						});
					}
					validated_args = validation_result.value;
				}

				// Execute the tool
				const tool_result = tool.schema
					? await tool.execute(validated_args)
					: await tool.execute();

				// Parse the basic result structure
				const parsed_result = v.parse(
					CallToolResultSchema,
					tool_result,
				);

				// If tool has outputSchema, validate and populate structuredContent
				if (
					tool.outputSchema &&
					parsed_result.structuredContent !== undefined
				) {
					let output_validation = tool.outputSchema[
						'~standard'
					].validate(parsed_result.structuredContent);
					if (output_validation instanceof Promise)
						output_validation = await output_validation;
					if (output_validation.issues) {
						return /** @type {CallToolResult<any>} */ ({
							isError: true,
							content: [
								{
									type: 'text',
									text: `Tool ${name} returned invalid structured content: ${JSON.stringify(output_validation.issues)}`,
								},
							],
						});
					}
					// Update with validated structured content
					parsed_result.structuredContent = output_validation.value;
				}

				return parsed_result;
			},
		);
	}
	/**
	 *
	 */
	#init_prompts() {
		if (!this.#options.capabilities?.prompts) return;
		this.#server.addMethod('prompts/list', async ({ cursor } = {}) => {
			const all_prompts = (
				await Promise.all(
					[...this.#prompts].map(async ([name, prompt]) => {
						if (
							prompt.enabled != null &&
							(await safe_enabled(prompt.enabled)) === false
						)
							return null;
						const arguments_schema =
							prompt.schema && this.#options.adapter
								? await this.#options.adapter.toJsonSchema(
										prompt.schema,
									)
								: {
										type: 'object',
										properties:
											/** @type {Record<string, {description: string}>} */ ({}),
										required: [],
									};
						const keys = Object.keys(
							arguments_schema.properties ?? {},
						);
						const required = arguments_schema.required ?? [];
						return {
							name,
							title: prompt.title || prompt.description,
							icons: prompt.icons,
							description: prompt.description,
							arguments: keys.map((key) => {
								const property =
									arguments_schema.properties?.[key];
								const description =
									property && property !== true
										? property.description
										: key;
								return {
									name: key,
									required: required.includes(key),
									description,
								};
							}),
						};
					}),
				)
			).filter((prompt) => prompt !== null);

			const pagination_options = this.#options.pagination?.prompts;
			if (!pagination_options || pagination_options.size == null) {
				return { prompts: all_prompts };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const prompts = all_prompts.slice(start_index, end_index);
			const has_next = end_index < all_prompts.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				prompts,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod(
			'prompts/get',
			async ({ name, arguments: args }) => {
				const prompt = this.#prompts.get(name);
				if (!prompt) {
					throw new McpError(-32602, `Prompt ${name} not found`);
				}
				this.#mark_mrtr_registration('prompt', name, prompt.replayable);
				if (!prompt.schema) {
					return v.parse(
						GetPromptResultSchema,
						await prompt.execute(),
					);
				}
				let validated_args = prompt.schema['~standard'].validate(args);
				if (validated_args instanceof Promise)
					validated_args = await validated_args;
				if (validated_args.issues) {
					throw new McpError(
						-32602,
						`Invalid arguments for prompt ${name}: ${JSON.stringify(validated_args.issues)}`,
					);
				}
				return v.parse(
					GetPromptResultSchema,
					await prompt.execute(validated_args.value),
				);
			},
		);
	}
	/**
	 *
	 */
	#init_resources() {
		if (!this.#options.capabilities?.resources) return;

		if (this.#options.capabilities?.resources?.subscribe) {
			this.#server.addMethod('resources/subscribe', async ({ uri }) => {
				this.#event_target.dispatchEvent(
					event('subscription', { uri, action: 'add' }),
				);
				return {};
			});
			this.#server.addMethod('resources/unsubscribe', async ({ uri }) => {
				this.#event_target.dispatchEvent(
					event('subscription', { uri, action: 'remove' }),
				);
				return {};
			});
		}

		this.#server.addMethod('resources/list', async ({ cursor } = {}) => {
			const all_resources = [];

			// Add static resources
			for (const [uri, resource] of this.#resources) {
				if (!resource.template) {
					if (
						resource.enabled != null &&
						(await safe_enabled(resource.enabled)) === false
					)
						continue;
					all_resources.push({
						name: resource.name,
						title: resource.title || resource.description,
						description: resource.description,
						uri,
						mimeType: resource.mimeType,
						icons: resource.icons,
					});
				} else if (resource.list_resources) {
					if (
						resource.enabled != null &&
						(await safe_enabled(resource.enabled)) === false
					)
						continue;
					const template_resources = await resource.list_resources();
					all_resources.push(...template_resources);
				}
			}

			const pagination_options = this.#options.pagination?.resources;
			if (!pagination_options || pagination_options.size == null) {
				return { resources: all_resources };
			}

			const page_length = pagination_options.size;
			const offset = cursor ? await decode_cursor(cursor) : 0;
			const start_index = offset;
			const end_index = start_index + page_length;

			const resources = all_resources.slice(start_index, end_index);
			const has_next = end_index < all_resources.length;
			const next_cursor = has_next
				? await encode_cursor(end_index)
				: null;

			return {
				resources,
				...(next_cursor && { nextCursor: next_cursor }),
			};
		});
		this.#server.addMethod('resources/templates/list', async () => {
			return {
				resourceTemplates: (
					await Promise.all(
						[...this.#resources].map(async ([uri, resource]) => {
							if (!resource.template) return null;
							if (
								resource.enabled != null &&
								(await safe_enabled(resource.enabled)) === false
							)
								return null;
							return {
								name: resource.name,
								icons: resource.icons,
								title: resource.title || resource.description,
								description: resource.description,
								mimeType: resource.mimeType,
								uriTemplate: uri,
							};
						}),
					)
				).filter((resource) => resource != null),
			};
		});
		this.#server.addMethod('resources/read', async ({ uri }) => {
			let resource = this.#resources.get(uri);
			let params;
			if (!resource) {
				const match = this.#templates.match(uri);
				if (match) {
					resource = this.#resources.get(match.template);
					params = match.params;
				}
				if (!resource) {
					throw new McpError(-32602, `Resource ${uri} not found`);
				}
			}
			this.#mark_mrtr_registration(
				resource.template ? 'template' : 'resource',
				resource.name,
				resource.replayable,
			);
			if (resource.template) {
				if (!params)
					throw new McpError(
						-32602,
						'Missing parameters for template resource',
					);
				return v.parse(
					ReadResourceResultSchema,
					await resource.execute(uri, params),
				);
			}
			return v.parse(
				ReadResourceResultSchema,
				await resource.execute(uri),
			);
		});
	}
	/**
	 *
	 */
	#init_roots() {
		this.#server.addMethod('notifications/roots/list_changed', () => {
			this.#refresh_roots();
			return null;
		});
	}

	/**
	 * Request roots list from client
	 */
	async #refresh_roots() {
		if (this.#is_stateless) {
			throw new McpError(
				-32603,
				'Client roots are not available during per-request (stateless) execution: roots are deprecated in protocol version 2026-07-28 and tmcp does not emit roots/list as a multi round-trip input request',
			);
		}
		if (!this.#client_capabilities?.roots) return;

		this.#lazyily_create_client();
		try {
			const response = await this.#client?.request(
				'roots/list',
				undefined,
				'standalone',
			);
			this.roots = response?.roots || [];
		} catch {
			// Client doesn't support roots or request failed
			this.roots = [];
		}
	}

	#init_completion() {
		this.#server.addMethod(
			'completion/complete',
			async ({ argument, ref, context }) => {
				const completions = this.#completions[ref.type];
				if (!completions) return null;
				const complete = completions.get(ref.uri ?? ref.name);
				if (!complete) return null;
				const actual_complete = complete[argument.name];
				if (!actual_complete) return null;
				return v.parse(
					CompleteResultSchema,
					await actual_complete(argument.value, context),
				);
			},
		);
	}

	#init_logging() {
		if (!this.#options.capabilities?.logging) return;

		this.#server.addMethod('logging/setLevel', ({ level }) => {
			this.#event_target.dispatchEvent(
				event('loglevelchange', { level }),
			);
			return {};
		});
	}

	/**
	 * Reduce a requested filter to notification types enabled by this server.
	 * @param {SubscriptionFilter} requested
	 * @returns {SubscriptionFilter}
	 */
	#subscription_filters(requested) {
		const capabilities = this.#options.capabilities;
		/** @type {SubscriptionFilter} */
		const filters = {};
		if (
			requested.toolsListChanged === true &&
			capabilities?.tools?.listChanged === true
		) {
			filters.toolsListChanged = true;
		}
		if (
			requested.promptsListChanged === true &&
			capabilities?.prompts?.listChanged === true
		) {
			filters.promptsListChanged = true;
		}
		if (
			requested.resourcesListChanged === true &&
			capabilities?.resources?.listChanged === true
		) {
			filters.resourcesListChanged = true;
		}
		if (
			requested.resourceSubscriptions?.length &&
			capabilities?.resources?.subscribe === true
		) {
			const resources = [
				...new Set(requested.resourceSubscriptions),
			].filter(
				(uri) =>
					this.#subscription_resource_registration(uri) !== undefined,
			);
			if (resources.length > 0) filters.resourceSubscriptions = resources;
		}
		return filters;
	}

	/**
	 * Resolve a static resource or a concrete URI handled by a template. The
	 * template pattern itself is not a subscribable resource URI.
	 * @param {string} uri
	 */
	#subscription_resource_registration(uri) {
		const resource = this.#resources.get(uri);
		if (resource) return resource.template ? undefined : resource;
		const match = this.#templates.match(uri);
		return match ? this.#resources.get(match.template) : undefined;
	}

	/**
	 * Register the long-lived per-request subscription method and cancellation
	 * notification. Transports keep the response sink open while the returned
	 * promise is pending.
	 */
	#init_subscriptions() {
		this.#server.addMethod('subscriptions/listen', async (params) => {
			const parsed = v.safeParse(
				SubscriptionsListenRequestParamsSchema,
				params,
			);
			if (!parsed.success) {
				throw new McpError(
					-32602,
					'Invalid subscriptions/listen params: expected a notifications filter',
				);
			}
			const id = this.#ctx_storage.getStore()?.request_id;
			if (id === undefined) {
				throw new McpError(
					-32600,
					'subscriptions/listen must be a JSON-RPC request with an id',
				);
			}
			const store = this.#ctx_storage.getStore();
			const origin = store?.subscriptionOrigin;
			const manager = store?.subscriptionManager;
			if (typeof origin !== 'string' || manager === undefined) {
				throw new McpError(
					-32603,
					'subscriptions/listen requires the transport to provide a subscriptionManager and stable string subscriptionOrigin for this connection',
				);
			}
			const filters = this.#subscription_filters(
				parsed.output.notifications,
			);
			/** @type {(result: Record<string, unknown>)=>void} */
			let settle = () => {};
			const pending = new Promise((resolve) => {
				settle = resolve;
			});
			const created = await manager.create(
				{ id, origin, filters },
				{
					acknowledge: () =>
						this.#subscription_send(id, origin, {
							jsonrpc: '2.0',
							method: 'notifications/subscriptions/acknowledged',
							params: {
								notifications: filters,
								_meta: {
									[SUBSCRIPTION_ID_META_KEY]: id,
								},
							},
						}),
					send: (notification) =>
						this.#subscription_send(
							id,
							origin,
							this.#tag_subscription(notification, id),
						),
					close: () => {
						settle({
							_meta: { [SUBSCRIPTION_ID_META_KEY]: id },
						});
					},
				},
			);
			if (!created) {
				throw new McpError(
					-32602,
					`A subscription with id ${JSON.stringify(id)} is already active for this connection`,
				);
			}
			return pending;
		});

		this.#server.addMethod('notifications/cancelled', async (params) => {
			const cancellation = v.safeParse(
				CancelledNotificationSchema.entries.params,
				params,
			);
			const store = this.#ctx_storage.getStore();
			const origin = store?.subscriptionOrigin;
			const manager = store?.subscriptionManager;
			if (
				cancellation.success &&
				origin !== undefined &&
				manager !== undefined
			) {
				await manager.close(
					cancellation.output.requestId,
					origin,
					'cancelled',
				);
			}
			return null;
		});
	}

	/**
	 * @param {JSONRPCRequest} notification
	 * @param {string | number} subscription_id
	 */
	#tag_subscription(notification, subscription_id) {
		const params = /** @type {Record<string, unknown>} */ (
			notification.params ?? {}
		);
		return {
			...notification,
			params: {
				...params,
				_meta: {
					.../** @type {Record<string, unknown> | undefined} */ (
						params._meta
					),
					[SUBSCRIPTION_ID_META_KEY]: subscription_id,
				},
			},
		};
	}

	/**
	 * @param {string | number} subscription_id
	 * @param {string} origin
	 * @param {JSONRPCRequest} request
	 */
	#subscription_send(subscription_id, origin, request) {
		this.#event_target.dispatchEvent(
			event('send', {
				subscriptionId: subscription_id,
				subscriptionOrigin: origin,
				request,
			}),
		);
	}

	#notify_tools_list_changed() {
		if (this.#options.capabilities?.tools?.listChanged) {
			this.#broadcast_change('notifications/tools/list_changed', {});
		}
	}

	#notify_prompts_list_changed() {
		if (this.#options.capabilities?.prompts?.listChanged) {
			this.#broadcast_change('notifications/prompts/list_changed', {});
		}
	}

	#notify_resources_list_changed() {
		if (this.#options.capabilities?.resources?.listChanged) {
			this.#broadcast_change('notifications/resources/list_changed', {});
		}
	}

	/**
	 * Publish a change through the existing broadcast lifecycle. Transports use
	 * `subscriptionOnly` to keep concrete template updates off legacy streams.
	 * @param {string} method
	 * @param {Record<string, unknown>} params
	 * @param {boolean} [subscription_only]
	 */
	#broadcast_change(method, params, subscription_only = false) {
		this.#event_target.dispatchEvent(
			event('broadcast', {
				request: { jsonrpc: '2.0', method, params },
				...(subscription_only ? { subscriptionOnly: true } : {}),
			}),
		);
	}

	/**
	 * Use the `defineTool` utility to create a reusable tool and pass it to this method to add it to the server.
	 * @template {Array<CreatedTool<any, any>>} T
	 * @template {T extends Array<CreatedTool<infer TSchema, infer TOutputSchema>> ? AllSame<TSchema, StandardSchema | undefined> extends true ? AllSame<TOutputSchema, StandardSchema | undefined> extends true ? T : never : never : never} U
	 * @param {T & NoInfer<U>} tools
	 */
	tools(tools) {
		for (const tool of tools) {
			this.tool(tool);
		}
	}

	/**
	 * Use the `definePrompt` utility to create a reusable tool and pass it to this method to add it to the server.
	 * @template {Array<CreatedPrompt<any>>} T
	 * @template {T extends Array<CreatedPrompt<infer TSchema>> ? AllSame<TSchema, StandardSchema | undefined> extends true ?  T : never : never} U
	 * @param {T & NoInfer<U>} prompts
	 */
	prompts(prompts) {
		for (const prompt of prompts) {
			this.prompt(prompt);
		}
	}

	/**
	 * Use the `defineResource` utility to create a reusable resource and pass it to this method to add it to the server.
	 *
	 * @param {CreatedResource[]} resources
	 */
	resources(resources) {
		for (const resource of resources) {
			this.resource(resource);
		}
	}

	/**
	 * Use the `defineTemplate` utility to create a reusable template and pass it to this method to add it to the server.
	 *
	 * @param {CreatedTemplate<any>[]} templates
	 */
	templates(templates) {
		for (const template of templates) {
			this.template(template);
		}
	}

	/**
	 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
	 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
	 *
	 * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @template {StandardSchema | undefined} [TOutputSchema=undefined]
	 * @overload
	 * @param {CreatedTool<TSchema, TOutputSchema>} tool_or_options
	 * @returns {void}
	 */
	/**
	 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
	 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
	 *
	 * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @template {StandardSchema | undefined} [TOutputSchema=undefined]
	 * @overload
	 * @param {ToolOptions<TSchema, TOutputSchema>} tool_or_options
	 * @param {TSchema extends undefined ? (()=>Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} execute
	 * @returns {void}
	 * */
	/**
	 * Add a tool to the server. If you want to receive any input you need to provide a schema. The schema needs to be a valid Standard Schema V1 schema and needs to be an Object with the properties you need,
	 * Use the description and title to help the LLM to understand what the tool does and when to use it. If you provide an outputSchema, you need to return a structuredContent that matches the schema.
	 *
	 * Tools will be invoked by the LLM when it thinks it needs to use them, you can use the annotations to provide additional information about the tool, like what it does, how to use it, etc.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @template {StandardSchema | undefined} [TOutputSchema=undefined]
	 * @param {CreatedTool<TSchema, TOutputSchema> | ToolOptions<TSchema, TOutputSchema>} tool_or_options
	 * @param {undefined | TSchema extends undefined ? (()=>Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>) : ((input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>> | CallToolResult<TOutputSchema extends undefined ? undefined : StandardSchemaV1.InferInput<TOutputSchema extends undefined ? never : TOutputSchema>>)} [execute]
	 */
	tool(tool_or_options, execute) {
		if ('execute' in tool_or_options) {
			// @ts-expect-error typescript doesn't know about execute because of an egregious hack to prevent it
			// from showing in intellisense when declaring a tool inline
			execute = tool_or_options.execute;
		}
		this.#notify_tools_list_changed();
		const stored_tool = /** @type {Tool<any, any>} */ (tool_or_options);
		stored_tool.execute = /** @type {NonNullable<typeof execute>} */ (
			execute
		);
		this.#tools.set(tool_or_options.name, stored_tool);
	}

	/**
	 * Run transport-specific validation against a registered tool's JSON
	 * Schema without enabling, validating, or executing the tool.
	 * @param {string} name
	 * @param {Record<string, unknown>} args
	 * @param {(input_schema: Record<string, unknown>, args: Record<string, unknown>)=>void | Promise<void>} validator
	 * @returns {Promise<boolean>}
	 */
	async validateToolCall(name, args, validator) {
		const tool = this.#tools.get(name);
		if (!tool) return false;
		const input_schema =
			tool.schema && this.#options.adapter
				? await this.#options.adapter.toJsonSchema(tool.schema)
				: { type: 'object', properties: {} };
		await validator(
			/** @type {Record<string, unknown>} */ (input_schema),
			args,
		);
		return true;
	}

	/**
	 * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
	 * Use the description and title to help the user to understand what the prompt does and when to use it.
	 *
	 * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
	 * for each input that will be used to provide completions for the user.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @overload
	 * @param {CreatedPrompt<TSchema>} prompt_or_options
	 * @returns {void}
	 */
	/**
	 * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
	 * Use the description and title to help the user to understand what the prompt does and when to use it.
	 *
	 * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
	 * for each input that will be used to provide completions for the user.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @overload
	 * @param {PromptOptions<TSchema>} prompt_or_options
	 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} execute
	 * @returns {void}
	 * */
	/**
	 * Add a prompt to the server. Prompts are used to provide the user with pre-defined messages that adds context to the LLM.
	 * Use the description and title to help the user to understand what the prompt does and when to use it.
	 *
	 * A prompt can also have a schema that defines the input it expects, the user will be prompted to enter the inputs you request. It can also have a complete function
	 * for each input that will be used to provide completions for the user.
	 * @template {StandardSchema | undefined} [TSchema=undefined]
	 * @param {CreatedPrompt<TSchema> | PromptOptions<TSchema>} prompt_or_options
	 * @param {TSchema extends undefined ? (()=>Promise<GetPromptResult> | GetPromptResult) : (input: StandardSchemaV1.InferInput<TSchema extends undefined ? never : TSchema>) => Promise<GetPromptResult> | GetPromptResult} [execute]
	 */
	prompt(prompt_or_options, execute) {
		if ('execute' in prompt_or_options) {
			execute = /** @type {NonNullable<typeof execute>} */ (
				prompt_or_options.execute
			);
		}
		if (prompt_or_options.complete) {
			this.#completions['ref/prompt'].set(
				prompt_or_options.name,
				prompt_or_options.complete,
			);
		}
		this.#notify_prompts_list_changed();
		const stored_prompt = /** @type {Prompt<any>} */ (prompt_or_options);
		stored_prompt.execute = /** @type {NonNullable<typeof execute>} */ (
			execute
		);
		this.#prompts.set(prompt_or_options.name, stored_prompt);
	}
	/**
	 * @type {(resource: StoredResource & { uri: string })=> void}
	 */
	#resource(resource) {
		if (resource.template && resource.complete) {
			this.#completions['ref/resource'].set(
				resource.uri,
				resource.complete,
			);
		}
		if (resource.template) {
			this.#templates.add(resource.uri);
		}
		this.#notify_resources_list_changed();
		this.#resources.set(resource.uri, resource);
	}

	/**
	 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Use the description and title to help the user to understand what the resource is.
	 * @overload
	 * @param {CreatedResource} resource_or_options
	 * @returns {void}
	 */
	/**
	 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Use the description and title to help the user to understand what the resource is.
	 * @overload
	 * @param {ResourceOptions} resource_or_options
	 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 * @returns {void}
	 */
	/**
	 * Add a resource to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Use the description and title to help the user to understand what the resource is.
	 * @param {CreatedResource | ResourceOptions} resource_or_options
	 * @param {(uri: string) => Promise<ReadResourceResult> | ReadResourceResult} [execute]
	 */
	resource(resource_or_options, execute) {
		if ('execute' in resource_or_options) {
			// @ts-expect-error typescript doesn't know about execute because of an egregious hack to prevent it
			// from showing in intellisense when declaring a tool inline
			execute = resource_or_options.execute;
		}
		const stored_resource =
			/** @type {StoredResource & { uri: string }} */ (
				resource_or_options
			);
		stored_resource.execute = /** @type {NonNullable<typeof execute>} */ (
			execute
		);
		stored_resource.template = false;
		this.#resource(stored_resource);
	}
	/**
	 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
	 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
	 * be invoked to provide completions for the template variables to the user.
	 * Use the description and title to help the user to understand what the resource is.
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @overload
	 * @param {CreatedTemplate<TUri>} template_or_options
	 * @returns {void}
	 */
	/**
	 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
	 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
	 * be invoked to provide completions for the template variables to the user.
	 * Use the description and title to help the user to understand what the resource is.
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @overload
	 * @param {TemplateOptions<TUri>} template_or_options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} execute
	 * @returns {void}
	 */
	/**
	 * Add a resource template to the server. Resources are added manually to the context by the user to provide the LLM with additional context.
	 * Resource templates are used to create resources dynamically based on a URI template. The URI template should be a valid URI template as defined in RFC 6570.
	 * Resource templates can have a list method that returns a list of resources that match the template and a complete method that returns a list of resources given one of the template variables, this method will
	 * be invoked to provide completions for the template variables to the user.
	 * Use the description and title to help the user to understand what the resource is.
	 * @template {string} TUri
	 * @template {ExtractURITemplateVariables<TUri>} TVariables
	 * @param {CreatedTemplate<TUri> | TemplateOptions<TUri>} template_or_options
	 * @param {(uri: string, params: Record<TVariables, string | string[]>) => Promise<ReadResourceResult> | ReadResourceResult} [execute]
	 */
	template(template_or_options, execute) {
		if ('execute' in template_or_options) {
			// @ts-expect-error typescript doesn't know about execute because of an egregious hack to prevent it
			// from showing in intellisense when declaring a tool inline
			execute = template_or_options.execute;
		}
		const stored_template =
			/** @type {StoredResource & { uri: string }} */ (
				/** @type {unknown} */ (template_or_options)
			);
		stored_template.execute = /** @type {NonNullable<typeof execute>} */ (
			execute
		);
		// @ts-expect-error list_resources only exists on template resources
		stored_template.list_resources = template_or_options.list;
		stored_template.template = true;
		this.#resource(stored_template);
	}
	/**
	 * The per-request protocol versions supported by tmcp.
	 * @returns {string[]}
	 */
	#enabled_protocol_versions() {
		return getPerRequestProtocolVersions();
	}

	/**
	 * Check whether a JSON-RPC method is registered without invoking it.
	 * @param {string} method
	 */
	hasMethod(method) {
		return this.#server.hasMethod(method);
	}

	/**
	 * Derive capabilities advertised through `server/discover`. Subscription
	 * flags stay hidden until the active transport can route long-lived listen
	 * streams; core support alone cannot guarantee delivery.
	 * @returns {Record<string, unknown>}
	 */
	#discover_capabilities() {
		const store = this.#ctx_storage.getStore();
		if (
			store?.subscriptionManager !== undefined &&
			typeof store.subscriptionOrigin === 'string'
		) {
			return { ...(this.#options.capabilities ?? {}) };
		}
		const { resources, tools, prompts, ...rest } =
			this.#options.capabilities ?? {};
		/** @type {Record<string, unknown>} */
		const capabilities = { ...rest };
		if (resources) {
			// eslint-disable-next-line no-unused-vars
			const { subscribe, listChanged, ...resources_rest } = resources;
			capabilities.resources = resources_rest;
		}
		if (tools) {
			// eslint-disable-next-line no-unused-vars
			const { listChanged, ...tools_rest } = tools;
			capabilities.tools = tools_rest;
		}
		if (prompts) {
			// eslint-disable-next-line no-unused-vars
			const { listChanged, ...prompts_rest } = prompts;
			capabilities.prompts = prompts_rest;
		}
		return capabilities;
	}

	/**
	 * Resolve the effective cache policy for a cacheable method.
	 * @param {string} method
	 * @returns {{ ttlMs: number, cacheScope: 'public' | 'private' }}
	 */
	#cache_policy(method) {
		const cache = this.#options.cache;
		const override = cache?.methods?.[method];
		return {
			ttlMs: override?.ttlMs ?? cache?.ttlMs ?? 0,
			cacheScope: override?.cacheScope ?? cache?.cacheScope ?? 'private',
		};
	}

	/**
	 * Decorate a successful per-request (stateless) wire result:
	 * `resultType` (preserving handler-provided string extension values,
	 * anything else becomes `'complete'`), serverInfo `_meta` merge, and
	 * `ttlMs`/`cacheScope` for cacheable methods. The cache fields are
	 * ALWAYS taken from the configured policy, overwriting any
	 * handler-provided values: handlers are profile-unaware and must not be
	 * able to opt results into public caching.
	 * @param {string} method
	 * @param {Record<string, unknown>} result
	 * @param {boolean} [private_result]
	 */
	#decorate_result(method, result, private_result = false) {
		if (typeof result.resultType !== 'string') {
			result.resultType = 'complete';
		}
		result._meta = {
			.../** @type {Record<string, unknown> | undefined} */ (
				result._meta
			),
			'io.modelcontextprotocol/serverInfo': this.#server_info,
		};
		if (CACHEABLE_METHODS.has(method)) {
			const policy = private_result
				? { ttlMs: 0, cacheScope: /** @type {const} */ ('private') }
				: this.#cache_policy(method);
			result.ttlMs = policy.ttlMs;
			result.cacheScope = policy.cacheScope;
		}
	}

	/**
	 * Build a JSON-RPC error response for a request, or `null` for a
	 * notification (which cannot receive a response).
	 * @param {string | number | undefined} id
	 * @param {McpError} error
	 */
	#error_response(id, error) {
		if (id === undefined) return Promise.resolve(null);
		return Promise.resolve({
			jsonrpc: /** @type {const} */ ('2.0'),
			id,
			error: {
				code: error.code,
				message: error.message,
				...(error.data !== undefined ? { data: error.data } : {}),
			},
		});
	}

	/**
	 * The main function that receive a JSONRpc message and either dispatch a `send` event or process the request.
	 *
	 * @param {JSONRPCMessage} message
	 * @param {ReceiveContext<CustomContext>} [ctx]
	 * @returns {ReturnType<JSONRPCServer['receive']> | ReturnType<JSONRPCClient['receive'] | undefined>}
	 */
	receive(message, ctx) {
		// Validate the message first
		const validated_message = v.safeParse(
			v.union([JSONRPCRequestSchema, JSONRPCNotificationSchema]),
			message,
		);

		// Check if it's a request or response
		if (validated_message.success) {
			const request_message = validated_message.output;
			const id = 'id' in request_message ? request_message.id : undefined;
			const meta = request_message.params?._meta;
			const progress_token = /** @type {string | undefined} */ (
				meta?.progressToken
			);
			const requested_version =
				meta?.['io.modelcontextprotocol/protocolVersion'];
			const request_capabilities =
				meta?.['io.modelcontextprotocol/clientCapabilities'];
			const request_client_info =
				meta?.['io.modelcontextprotocol/clientInfo'];
			const request_log_level =
				meta?.['io.modelcontextprotocol/logLevel'];

			// `protocolVersion` and the internal `stateless` flag are set
			// exclusively by the classification below: transport-provided
			// values must never make a session-negotiated request look like
			// a per-request one
			const {
				// eslint-disable-next-line no-unused-vars
				protocolVersion,
				// eslint-disable-next-line no-unused-vars
				stateless: _,
				...transport_ctx
			} = /** @type {ReceiveContext<CustomContext> & { stateless?: boolean }} */ (
				ctx ?? {}
			);
			/** @type {ReceiveContext<CustomContext> & { progress_token?: string, request_id?: string | number, stateless?: boolean, mrtr?: MrtrState }} */
			let store = { ...transport_ctx, progress_token, request_id: id };
			// classify the request: the presence of ANY reserved per-request
			// _meta key enters the per-request path — incomplete or invalid
			// metadata is rejected, never silently merged or downgraded to
			// the session path
			if (
				requested_version !== undefined ||
				request_capabilities !== undefined ||
				request_client_info !== undefined ||
				request_log_level !== undefined
			) {
				if (
					requested_version === undefined ||
					request_capabilities === undefined
				) {
					return this.#error_response(
						id,
						new McpError(
							-32602,
							'Requests with per-request protocol metadata must include both "io.modelcontextprotocol/protocolVersion" and "io.modelcontextprotocol/clientCapabilities" in _meta',
						),
					);
				}
				if (typeof requested_version !== 'string') {
					return this.#error_response(
						id,
						new McpError(
							-32602,
							'Invalid "io.modelcontextprotocol/protocolVersion" in _meta: expected a string',
						),
					);
				}
				// `looseObject` alone would accept arrays, so check the
				// basic shape explicitly first
				const parsed_capabilities =
					typeof request_capabilities !== 'object' ||
					request_capabilities === null ||
					Array.isArray(request_capabilities)
						? undefined
						: v.safeParse(
								ClientCapabilitiesSchema,
								request_capabilities,
							);
				if (!parsed_capabilities?.success) {
					return this.#error_response(
						id,
						new McpError(
							-32602,
							'Invalid "io.modelcontextprotocol/clientCapabilities" in _meta: expected a client capabilities object',
						),
					);
				}
				const parsed_client_info =
					request_client_info === undefined
						? undefined
						: v.safeParse(
								ImplementationSchema,
								request_client_info,
							);
				if (parsed_client_info && !parsed_client_info.success) {
					return this.#error_response(
						id,
						new McpError(
							-32602,
							'Invalid "io.modelcontextprotocol/clientInfo" in _meta: expected an implementation object with "name" and "version"',
						),
					);
				}
				const parsed_log_level =
					request_log_level === undefined
						? undefined
						: v.safeParse(LoggingLevelSchema, request_log_level);
				if (parsed_log_level && !parsed_log_level.success) {
					return this.#error_response(
						id,
						new McpError(
							-32602,
							'Invalid "io.modelcontextprotocol/logLevel" in _meta: expected a logging level',
						),
					);
				}
				const enabled = this.#enabled_protocol_versions();
				if (!enabled.includes(requested_version)) {
					return this.#error_response(
						id,
						unsupported_protocol_version_error(
							enabled,
							requested_version,
						),
					);
				}
				// per-request info fully replaces any transport-provided
				// session info: stateless requests never inherit session state
				store = {
					...store,
					stateless: true,
					protocolVersion: requested_version,
					sessionInfo: {
						clientCapabilities: parsed_capabilities.output,
						clientInfo: parsed_client_info?.output,
						logLevel: parsed_log_level?.output,
					},
				};
			}

			const stateless = store.stateless === true;
			if (
				!is_method_allowed(request_message.method, stateless) ||
				!this.hasMethod(request_message.method)
			) {
				return this.#error_response(
					id,
					new McpError(
						-32601,
						`Method ${request_message.method} not found`,
					),
				);
			}

			// Read retry answers and saved state before running the handler, then
			// remove them from its normal arguments. Only tool calls, prompt reads,
			// and resource reads can receive these fields.
			/** @type {string | undefined} */
			let encoded_incoming_state;
			const params = request_message.params;
			const raw_input_responses = params?.inputResponses;
			const raw_request_state = params?.requestState;
			if (
				!stateless &&
				(raw_input_responses !== undefined ||
					raw_request_state !== undefined)
			) {
				return this.#error_response(
					id,
					new McpError(
						-32602,
						'"inputResponses" and "requestState" params are only supported by per-request (stateless) multi round-trip requests',
					),
				);
			}
			if (stateless) {
				/** @type {Record<string, unknown> | undefined} */
				let input_responses;
				if (
					raw_input_responses !== undefined ||
					raw_request_state !== undefined
				) {
					if (!MRTR_METHODS.has(request_message.method)) {
						return this.#error_response(
							id,
							new McpError(
								-32602,
								`"inputResponses" and "requestState" params are only accepted on multi round-trip methods (${[...MRTR_METHODS].join(', ')})`,
							),
						);
					}
					if (raw_input_responses !== undefined) {
						const parsed = v.safeParse(
							InputResponsesSchema,
							raw_input_responses,
						);
						if (!parsed.success) {
							return this.#error_response(
								id,
								new McpError(
									-32602,
									'Invalid "inputResponses": expected a map of input response objects keyed by input request key',
								),
							);
						}
						input_responses = parsed.output;
					}
					if (raw_request_state !== undefined) {
						if (typeof raw_request_state !== 'string') {
							return this.#error_response(
								id,
								new McpError(
									-32602,
									'Invalid "requestState": expected the opaque string previously returned by the server',
								),
							);
						}
						if (
							raw_request_state.length >
							MAX_ENCODED_REQUEST_STATE_LENGTH
						) {
							return this.#error_response(
								id,
								new McpError(
									-32602,
									`Invalid "requestState": encoded state exceeds the maximum accepted length of ${MAX_ENCODED_REQUEST_STATE_LENGTH} characters`,
								),
							);
						}
						encoded_incoming_state = raw_request_state;
					}
					if (params) {
						delete params.inputResponses;
						delete params.requestState;
					}
				}
				if (MRTR_METHODS.has(request_message.method)) {
					store.mrtr = {
						input_responses,
						incoming_state: undefined,
						ordinal: 0,
						used_keys: new Set(),
						pending: new Map(),
						consumed_responses: new Map(),
						outgoing_state: undefined,
						registration: undefined,
						input_error: undefined,
						signal: new InputRequiredSignal(),
						signal_at_boundary: false,
					};
				}
			}

			return this.#ctx_storage.run(store, async () => {
				const mrtr = store.mrtr;
				if (
					mrtr !== undefined &&
					encoded_incoming_state !== undefined
				) {
					let decoded_state;
					try {
						decoded_state = await this.#request_state_codec.decode(
							encoded_incoming_state,
						);
					} catch (error) {
						return this.#error_response(
							id,
							new McpError(
								-32602,
								`Invalid "requestState": the configured codec failed to decode it (${/** @type {Error} */ (error)?.message})`,
							),
						);
					}
					const parsed_state = v.safeParse(
						RequestStateEnvelopeSchema,
						decoded_state,
					);
					if (!parsed_state.success) {
						return this.#error_response(
							id,
							new McpError(
								-32602,
								'Invalid "requestState": expected state previously returned by tmcp',
							),
						);
					}
					mrtr.incoming_state = parsed_state.output.state;
					mrtr.outgoing_state = parsed_state.output.state;
					mrtr.input_responses = Object.assign(
						Object.create(null),
						parsed_state.output.inputResponses,
						mrtr.input_responses,
					);
				}
				const response = await this.#server.receive(request_message);
				if (mrtr?.input_error !== undefined) {
					return this.#error_response(id, mrtr.input_error);
				}
				if (
					mrtr !== undefined &&
					mrtr.pending.size > 0 &&
					response != null
				) {
					if ('result' in response) {
						// The handler returned even though it still needs client input.
						// It probably caught tmcp's private error or forgot to await the
						// input call.
						return this.#error_response(
							id,
							new McpError(
								-32603,
								`Handler${mrtr.registration ? ` for ${mrtr.registration.kind} "${mrtr.registration.name}"` : ''} returned a result while input requests are pending: a catch block swallowed the internal input-required signal thrown by elicitation()/message(), or an input call was not awaited. Always await input calls. Catch blocks must rethrow the signal — use isInputRequired(error) to detect it and rethrow selectively.`,
							),
						);
					}
					if (mrtr.signal_at_boundary) {
						/** @type {Record<string, { method: string, params: Record<string, unknown> }>} */
						let input_requests;
						try {
							const entries = await Promise.all(
								[...mrtr.pending].map(
									async ([key, request]) =>
										/** @type {[string, { method: string, params: Record<string, unknown> }]} */ ([
											key,
											await request,
										]),
								),
							);
							input_requests = Object.fromEntries(entries);
						} catch (error) {
							return this.#error_response(
								id,
								new McpError(
									-32603,
									`Failed to prepare an input request: ${/** @type {Error} */ (error)?.message ?? 'unknown error'}`,
								),
							);
						}
						// Tell the client what input is needed. Do not add cache fields,
						// because this is not the final result and must not be cached.
						/** @type {Record<string, unknown>} */
						const result = {
							resultType: 'input_required',
							inputRequests: input_requests,
							_meta: {
								'io.modelcontextprotocol/serverInfo':
									this.#server_info,
							},
						};
						if (
							mrtr.outgoing_state !== undefined ||
							mrtr.consumed_responses.size > 0
						) {
							/** @type {string} */
							let encoded;
							try {
								// Clients only have to answer the latest inputRequests. Keep
								// answers already used by the handler so the next retry can
								// start from the top without asking the same questions again.
								encoded =
									await this.#request_state_codec.encode({
										version: 1,
										inputResponses: Object.fromEntries(
											mrtr.consumed_responses,
										),
										...(mrtr.outgoing_state !== undefined
											? { state: mrtr.outgoing_state }
											: {}),
									});
							} catch (error) {
								return this.#error_response(
									id,
									new McpError(
										-32603,
										`Failed to encode requestState with the configured codec: ${/** @type {Error} */ (error)?.message}`,
									),
								);
							}
							if (
								typeof encoded !== 'string' ||
								encoded.length >
									MAX_ENCODED_REQUEST_STATE_LENGTH
							) {
								return this.#error_response(
									id,
									new McpError(
										-32603,
										`The requestState codec must produce a string of at most ${MAX_ENCODED_REQUEST_STATE_LENGTH} characters`,
									),
								);
							}
							result.requestState = encoded;
						}
						return {
							jsonrpc: /** @type {const} */ ('2.0'),
							id: /** @type {string | number} */ (id),
							result,
						};
					}
					// an unrelated error won the race against (or replaced)
					// the signal: let it through unchanged
				}
				if (stateless && response != null && 'result' in response) {
					// a successful stateless response must always be a
					// decorated object result, even when the handler
					// resolved `null` (e.g. completion of an unknown ref)
					if (
						response.result == null ||
						typeof response.result !== 'object'
					) {
						response.result = {};
					}
					this.#decorate_result(
						request_message.method,
						/** @type {Record<string, unknown>} */ (
							response.result
						),
						(mrtr?.consumed_responses.size ?? 0) > 0,
					);
				}
				return response;
			});
		}
		// It's a response - handle with client
		const validated_response = v.parse(
			v.union([JSONRPCResponseSchema, JSONRPCErrorSchema]),
			message,
		);
		this.#lazyily_create_client();
		return this.#ctx_storage.run(ctx ?? {}, async () =>
			this.#client?.receive(validated_response),
		);
	}

	/**
	 * Lower level api to send a request to the client, mostly useful to call client methods that not yet supported by the server or
	 * if you want to send requests with json schema that is not expressible with your validation library.
	 * @param {{ method: string, params?: JSONRPCParams }} request
	 * @returns {Promise<unknown>}
	 */
	async request({ method, params }) {
		if (this.#is_stateless) {
			throw new McpError(
				-32603,
				'Low-level server-to-client requests are not supported for per-request protocol requests: there is no server-to-client JSON-RPC channel, and arbitrary requests cannot be translated into multi round-trip input requests',
			);
		}
		this.#lazyily_create_client();
		return this.#client?.request(method, params, 'standalone');
	}

	/**
	 * Send a notification for subscriptions
	 * @template {keyof ChangedArgs} TWhat
	 * @param {[what: TWhat, ...ChangedArgs[TWhat]]} args
	 */
	changed(...args) {
		const [what, id] = args;
		if (what === 'prompts') {
			this.#notify_prompts_list_changed();
		} else if (what === 'tools') {
			this.#notify_tools_list_changed();
		} else if (what === 'resources') {
			this.#notify_resources_list_changed();
		} else {
			const resource = this.#resources.get(id);
			const subscription_resource =
				this.#subscription_resource_registration(id);
			if (!resource && !subscription_resource) return;
			if (resource) {
				this.#broadcast_change(`notifications/resources/updated`, {
					uri: id,
					title: resource.name,
				});
			}
			if (!resource && subscription_resource) {
				this.#broadcast_change(
					'notifications/resources/updated',
					{ uri: id },
					true,
				);
			}
		}
	}

	/**
	 * Refresh the roots list when the server has an open client session.
	 *
	 * This throws when handling a standalone request because roots are no
	 * longer supported by protocol version `2026-07-28`.
	 */
	async refreshRoots() {
		await this.#refresh_roots();
	}

	/**
	 * Whether the client included its version and capabilities in this request
	 * instead of opening a session first.
	 */
	get #is_stateless() {
		return this.#ctx_storage.getStore()?.stateless === true;
	}

	/**
	 * Check that the client supports the requested input and that the current
	 * method is allowed to ask for it.
	 * @param {'elicitation' | 'sampling'} capability
	 * @param {string} description Human-readable description for the session-negotiated error message
	 * @param {'form' | 'url'} [elicitation_mode]
	 */
	#assert_client_request_allowed(capability, description, elicitation_mode) {
		const declared_capability = this.#client_capabilities?.[capability];
		const capability_is_object =
			typeof declared_capability === 'object' &&
			declared_capability !== null &&
			!Array.isArray(declared_capability);
		const supports_elicitation_mode =
			capability_is_object &&
			(capability !== 'elicitation' ||
				(elicitation_mode === 'url'
					? declared_capability.url !== undefined
					: Object.keys(declared_capability).length === 0 ||
						declared_capability.form !== undefined));
		const supported = supports_elicitation_mode;
		if (!supported) {
			if (this.#is_stateless) {
				throw missing_required_client_capability_error({
					[capability]:
						capability === 'elicitation'
							? { [elicitation_mode ?? 'form']: {} }
							: {},
				});
			}
			throw new McpError(-32601, `Client doesn't support ${description}`);
		}
		if (this.#is_stateless && this.#mrtr === undefined) {
			throw new McpError(
				-32603,
				`${description} input requests are only available inside tools/call, prompts/get, and resources/read during per-request (stateless) execution`,
			);
		}
	}

	/**
	 * Work data used while the current request waits for client input.
	 * It is absent when the current method cannot ask for input.
	 */
	get #mrtr() {
		return this.#ctx_storage.getStore()?.mrtr;
	}

	/**
	 * Remember which handler is running so input calls can check its
	 * `replayable` setting and include its name in errors.
	 * @param {string} kind
	 * @param {string} name
	 * @param {boolean | undefined} replayable
	 */
	#mark_mrtr_registration(kind, name, replayable) {
		const mrtr = this.#mrtr;
		if (mrtr === undefined) return;
		mrtr.registration = { kind, name, replayable: replayable === true };
	}

	/**
	 * Convert tmcp's retry data to and from text. Plain JSON is used by default,
	 * which means the client can read and change the value.
	 */
	get #request_state_codec() {
		return (
			this.#options.requestStateCodec ?? {
				/** @type {(state: unknown)=>string} */
				encode: (state) => JSON.stringify(state),
				/** @type {(encoded: string)=>unknown} */
				decode: (encoded) => JSON.parse(encoded),
			}
		);
	}

	/**
	 * Check that the handler allows tmcp to run it again after client input.
	 * @param {MrtrState} mrtr
	 * @param {string} description
	 */
	#assert_replayable(mrtr, description) {
		if (mrtr.registration?.replayable) return;
		const registration = mrtr.registration
			? `${mrtr.registration.kind} "${mrtr.registration.name}"`
			: 'registration';
		throw new McpError(
			-32603,
			`${registration} asked the client for ${description}, but it is not marked as replayable. The client must retry the ORIGINAL request with its answer, which starts the handler again FROM THE TOP. Work done before the input call, such as database writes, emails, or payments, may therefore happen more than once. Set \`replayable: true\` on the ${mrtr.registration?.kind ?? 'tool/prompt/resource'} definition only when that work is safe to repeat or is delayed until after all input is available. This is a tmcp safety check, not an MCP requirement.`,
		);
	}

	/**
	 * Use the provided input name, or assign the next number (`"1"`, `"2"`,
	 * and so on). Numbering starts again each time the client retries.
	 * @param {MrtrState} mrtr
	 * @param {string | undefined} explicit_key
	 */
	#next_input_key(mrtr, explicit_key) {
		if (explicit_key != null) {
			if (mrtr.used_keys.has(explicit_key)) {
				const error = new McpError(
					-32603,
					`Duplicate input request key "${explicit_key}": each elicitation()/message() call within one request attempt must use a distinct key`,
				);
				mrtr.input_error = error;
				throw error;
			}
			mrtr.used_keys.add(explicit_key);
			return explicit_key;
		}
		let key;
		do {
			mrtr.ordinal += 1;
			key = String(mrtr.ordinal);
		} while (mrtr.used_keys.has(key));
		mrtr.used_keys.add(key);
		return key;
	}

	/**
	 * Let a handler recover from an invalid client answer by asking again with
	 * the same key instead of consuming the same invalid value repeatedly.
	 * @param {MrtrState} mrtr
	 * @param {string} key
	 */
	#release_input_response(mrtr, key) {
		mrtr.used_keys.delete(key);
		if (mrtr.input_responses !== undefined) {
			delete mrtr.input_responses[key];
		}
	}

	/**
	 * Save data that the handler will need when the client retries this
	 * request. tmcp turns it into text, sends it to the client, and restores it
	 * as `server.ctx.requestState` on the retry.
	 * Passing `undefined` clears previously set state.
	 *
	 * This does nothing when the server has an open client session or when the
	 * request finishes without asking for input.
	 *
	 * SECURITY: the default JSON converter lets the client read and change this
	 * data. Do not put secrets in it or use it for authorization. Configure a
	 * protected `requestStateCodec` if the server must detect changes.
	 * @param {unknown} state
	 */
	setRequestState(state) {
		const mrtr = this.#mrtr;
		if (mrtr === undefined) return;
		mrtr.outgoing_state = state;
	}

	/**
	 * Build and validate an elicitation request sent to the client.
	 * @template {StandardSchema extends undefined ? never : StandardSchema} TSchema
	 * @param {string} message
	 * @param {TSchema | string} schema_or_url
	 */
	async #create_elicitation_request(message, schema_or_url) {
		const request =
			typeof schema_or_url === 'string'
				? {
						method: /** @type {const} */ ('elicitation/create'),
						params: {
							mode: /** @type {const} */ ('url'),
							message,
							url: schema_or_url,
						},
					}
				: {
						method: /** @type {const} */ ('elicitation/create'),
						params: {
							message,
							requestedSchema:
								await this.#options.adapter?.toJsonSchema(
									schema_or_url,
								),
						},
					};
		const parsed = v.safeParse(ElicitRequestSchema, request);
		if (!parsed.success) {
			if (typeof schema_or_url === 'string') {
				throw new McpError(
					-32602,
					`URL ${schema_or_url} is not a valid URL`,
				);
			}
			throw new McpError(
				-32603,
				`Invalid elicitation schema: form elicitation requires a flat object containing only supported primitive fields (${JSON.stringify(parsed.issues)})`,
			);
		}
		return parsed.output;
	}

	/**
	 * Ask the user to complete an interaction at a URL. The client will open
	 * the URL out of band and return the user's action without form content.
	 *
	 * @overload
	 * @param {string} message
	 * @param {string} url
	 * @param {{ key?: string }} [options] `key` names this question so tmcp can match its answer on a retry.
	 * @returns {Promise<Omit<ElicitResult, 'content'>>}
	 */
	/**
	 * Emit an elicitation request to the client. Elicitations are used to ask the user for input in a structured way, the client will show a UI to the user to fill the input.
	 * The schema should be a valid Standard Schema V1 schema and should be an Object with the properties you need.
	 * The client will return the validated input as a JSON object that matches the schema.
	 *
	 * If the client doesn't support elicitation, it will throw an error.
	 *
	 * When there is no open client session, tmcp returns the question to the
	 * client and asks it to retry the original request with the answer. The
	 * handler then starts again from the beginning, so its definition must set
	 * `replayable: true`. Always await this call. If a surrounding `catch`
	 * handles errors, use `isInputRequired()` and rethrow tmcp's private error.
	 *
	 * @template {StandardSchema extends undefined ? never : StandardSchema} TSchema
	 * @overload
	 * @param {string} message
	 * @param {TSchema} schema
	 * @param {{ key?: string }} [options] `key` names this question so tmcp can match its answer on a retry. By default tmcp uses `"1"`, `"2"`, and so on. Set a name when the handler may ask different questions on different runs. When mixing named and numbered questions, use non-numeric names.
	 * @returns {Promise<ElicitResult & { content?: StandardSchemaV1.InferOutput<TSchema> }>}
	 */
	/**
	 * @template {StandardSchema extends undefined ? never : StandardSchema} TSchema
	 * @param {string} message
	 * @param {TSchema | string} schema_or_url
	 * @param {{ key?: string }} [options]
	 * @returns {Promise<Omit<ElicitResult, 'content'> | (ElicitResult & { content?: StandardSchemaV1.InferOutput<TSchema> })>}
	 */
	async elicitation(message, schema_or_url, options = {}) {
		const mode = typeof schema_or_url === 'string' ? 'url' : 'form';
		this.#assert_client_request_allowed(
			'elicitation',
			`${mode} mode elicitation`,
			mode,
		);

		const mrtr = this.#mrtr;
		if (mrtr !== undefined) {
			this.#assert_replayable(mrtr, 'elicitation');
			const key = this.#next_input_key(mrtr, options.key);
			const has_response =
				mrtr.input_responses !== undefined &&
				Object.hasOwn(mrtr.input_responses, key);
			if (has_response) {
				try {
					const provided = mrtr.input_responses?.[key];
					const parsed = v.safeParse(ElicitResultSchema, provided);
					if (!parsed.success) {
						throw new McpError(
							-32602,
							`Invalid input response for key "${key}": expected an elicitation result ({ action, content? })`,
						);
					}
					const result =
						typeof schema_or_url !== 'string'
							? await this.#validate_elicit_result(
									parsed.output,
									schema_or_url,
									-32602,
								)
							: this.#without_elicit_content(parsed.output);
					mrtr.consumed_responses.set(
						key,
						typeof schema_or_url === 'string'
							? result
							: parsed.output,
					);
					return result;
				} catch (error) {
					this.#release_input_response(mrtr, key);
					throw error;
				}
			}
			const pending_request = this.#create_elicitation_request(
				message,
				schema_or_url,
			);
			mrtr.pending.set(key, pending_request);
			try {
				await pending_request;
			} catch (error) {
				if (mrtr.pending.get(key) === pending_request) {
					mrtr.pending.delete(key);
					mrtr.used_keys.delete(key);
				}
				throw error;
			}
			throw mrtr.signal;
		}

		this.#lazyily_create_client();
		const request = await this.#create_elicitation_request(
			message,
			schema_or_url,
		);
		const result = await this.#client?.request(
			request.method,
			request.params,
			'standalone',
		);
		const elicit_result = v.parse(ElicitResultSchema, result);
		return typeof schema_or_url !== 'string'
			? this.#validate_elicit_result(elicit_result, schema_or_url)
			: this.#without_elicit_content(elicit_result);
	}

	/**
	 * URL elicitation is out of band, so form content must never reach the
	 * handler or be carried into a later stateless retry.
	 * @param {ElicitResult} elicit_result
	 * @returns {Omit<ElicitResult, 'content'>}
	 */
	#without_elicit_content(elicit_result) {
		const result = { ...elicit_result };
		delete result.content;
		return result;
	}

	/**
	 * Validate the `content` of an elicit result against the schema the
	 * input was requested with.
	 * @template {StandardSchema extends undefined ? never : StandardSchema} TSchema
	 * @param {ElicitResult} elicit_result
	 * @param {TSchema} schema
	 * @param {number} [invalid_content_code]
	 * @returns {Promise<ElicitResult & { content?: StandardSchemaV1.InferOutput<TSchema> }>}
	 */
	async #validate_elicit_result(
		elicit_result,
		schema,
		invalid_content_code = -32603,
	) {
		if (elicit_result.action !== 'accept') return elicit_result;
		let validated_result = schema['~standard'].validate(
			elicit_result.content,
		);
		if (validated_result instanceof Promise)
			validated_result = await validated_result;
		if (validated_result.issues) {
			throw new McpError(
				invalid_content_code,
				`Invalid elicitation result: ${JSON.stringify(validated_result.issues)}`,
			);
		}
		return { ...elicit_result, content: validated_result.value };
	}

	/**
	 * Request language model sampling from the client.
	 *
	 * When there is no open client session, tmcp returns the sampling request
	 * to the client and asks it to retry the original request with the answer.
	 * The handler then starts again from the beginning, so its definition must
	 * set `replayable: true`. Always await this call. If a surrounding `catch`
	 * handles errors, use `isInputRequired()` and rethrow tmcp's private error.
	 * @param {CreateMessageRequestParams} request
	 * @param {{ key?: string }} [options] `key` names this request so tmcp can match its answer on a retry. By default tmcp uses `"1"`, `"2"`, and so on. Set a name when the handler may make different requests on different runs. When mixing named and numbered requests, use non-numeric names.
	 * @returns {Promise<CreateMessageResult>}
	 */
	async message(request, options = {}) {
		this.#assert_client_request_allowed('sampling', 'sampling');

		// Validate the request
		const validated_request = v.parse(
			CreateMessageRequestParamsSchema,
			request,
		);

		const mrtr = this.#mrtr;
		if (mrtr !== undefined) {
			this.#assert_replayable(mrtr, 'sampling');
			const key = this.#next_input_key(mrtr, options.key);
			const has_response =
				mrtr.input_responses !== undefined &&
				Object.hasOwn(mrtr.input_responses, key);
			if (has_response) {
				try {
					const provided = mrtr.input_responses?.[key];
					const parsed = v.safeParse(
						CreateMessageResultSchema,
						provided,
					);
					if (!parsed.success) {
						throw new McpError(
							-32602,
							`Invalid input response for key "${key}": expected a sampling result (CreateMessageResult)`,
						);
					}
					mrtr.consumed_responses.set(key, parsed.output);
					return parsed.output;
				} catch (error) {
					this.#release_input_response(mrtr, key);
					throw error;
				}
			}
			mrtr.pending.set(
				key,
				Promise.resolve({
					method: 'sampling/createMessage',
					params: validated_request,
				}),
			);
			throw mrtr.signal;
		}

		this.#lazyily_create_client();

		// Make the request to the client
		const response = await this.#client?.request(
			'sampling/createMessage',
			validated_request,
			'standalone',
		);

		// Validate and return the response
		return v.parse(CreateMessageResultSchema, response);
	}

	/**
	 * Send a progress notification to the client. This is useful for long-running operations where you want to inform the user about the progress.
	 *
	 * @param {number} progress The current progress value, it should be between 0 and total and should always increase
	 * @param {number} [total] The total value, defaults to 1
	 * @param {string} [message] An optional message to accompany the progress update
	 */
	progress(progress, total = 1, message = undefined) {
		if (this.#progress_token != null) {
			this.#notify('notifications/progress', {
				progress,
				total,
				message,
				progressToken: this.#progress_token,
			});
		}
	}

	/**
	 * Log a message to the client if logging is enabled and the level is appropriate
	 *
	 * @param {LoggingLevel} level
	 * @param {unknown} data
	 * @param {string} [logger]
	 */
	log(level, data, logger) {
		if (!this.#options.capabilities?.logging) {
			throw new McpError(
				-32601,
				"The server doesn't support logging, please enable it in capabilities",
			);
		}

		const store = this.#ctx_storage.getStore();
		const current_session_level = store?.stateless
			? store.sessionInfo?.logLevel
			: (store?.sessionInfo?.logLevel ??
				this.#options.logging?.default ??
				'info');

		if (
			current_session_level &&
			this.#should_log(level, current_session_level)
		) {
			this.#notify('notifications/message', {
				level,
				data,
				logger,
			});
		}
	}

	/**
	 * Check if a log message should be sent based on severity levels
	 * @param {LoggingLevel} message_level
	 * @param {LoggingLevel} session_level
	 * @returns {boolean}
	 */
	#should_log(message_level, session_level) {
		const levels = [
			'debug',
			'info',
			'notice',
			'warning',
			'error',
			'critical',
			'alert',
			'emergency',
		];
		const message_severity = levels.indexOf(message_level);
		const session_severity = levels.indexOf(session_level);

		// Send if message severity is equal to or higher than session level
		return message_severity >= session_severity;
	}
}
