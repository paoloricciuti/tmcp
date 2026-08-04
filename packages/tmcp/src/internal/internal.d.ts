import { StandardSchemaV1 } from '@standard-schema/spec';
import { JSONRPCRequest } from 'json-rpc-2.0';
import { JsonSchemaAdapter } from '../adapter.js';
import {
	GetPromptResult,
	CallToolResult,
	ReadResourceResult,
	CompleteResult,
	InitializeRequestParams,
	Resource,
	ServerCapabilities,
	LoggingLevel,
	ToolAnnotations,
	Icons,
	McpError,
	SubscriptionFilter,
	RequestId,
} from '../validation/index.js';
import { ExtractURITemplateVariables } from './uri-template.js';

declare const created_tool: unique symbol;
declare const created_prompt: unique symbol;
declare const created_resource: unique symbol;
declare const created_template: unique symbol;

export type AllSame<T, U> = [T] extends [U] ? true : false;

/** @internal Work data used only while one request is running. */
export type MrtrState = {
	input_responses: Record<string, unknown> | undefined;
	incoming_state: unknown;
	ordinal: number;
	used_keys: Set<string>;
	pending: Map<
		string,
		Promise<{ method: string; params: Record<string, unknown> }>
	>;
	consumed_responses: Map<string, unknown>;
	outgoing_state: unknown;
	registration:
		| { kind: string; name: string; replayable: boolean }
		| undefined;
	input_error: McpError | undefined;
	signal: Error;
	signal_at_boundary: boolean;
};

export type SubscriptionOrigin = string;

export type Subscription = {
	id: RequestId;
	origin: SubscriptionOrigin;
	filters: SubscriptionFilter;
};

export type SubscriptionCallbacks = {
	acknowledge: () => void | Promise<void>;
	send: (notification: JSONRPCRequest) => void | Promise<void>;
	close: (reason: 'closed' | 'cancelled') => void | Promise<void>;
};

export type SubscriptionManager = {
	create(
		subscription: Subscription,
		callbacks: SubscriptionCallbacks,
	): boolean | Promise<boolean>;
	send(notification: JSONRPCRequest): void | Promise<void>;
	close(
		id: RequestId,
		origin: SubscriptionOrigin,
		reason: 'closed' | 'cancelled',
	): boolean | Promise<boolean>;
	closeAll(
		origin?: SubscriptionOrigin,
		reason?: 'closed' | 'cancelled',
	): void | Promise<void>;
};

export type Replayable = {
	/**
	 * Allow tmcp to run this handler again after asking the client for input.
	 *
	 * For standalone requests, the server cannot pause and wait for the client.
	 * It returns the questions to the client, which then retries the original
	 * request with the answers. The handler starts again FROM THE TOP on every
	 * retry. This means work done before an input call, such as database writes,
	 * emails, or payments, may happen more than once. Set `replayable: true`
	 * only when that work is safe to repeat or is delayed until all answers are
	 * available.
	 *
	 * Without this flag, tmcp returns an error rather than risk repeating work.
	 * This is a tmcp safety check, not an MCP requirement. Requests using an
	 * open client session are unaffected because their handlers do not restart.
	 */
	replayable?: boolean;
};

export type PromptOptions<
	TSchema extends StandardSchemaV1 | undefined = undefined,
> = {
	name: string;
	description: string;
	title?: string;
	enabled?: () => boolean | Promise<boolean>;
	schema?: StandardSchemaV1.InferInput<
		TSchema extends undefined ? never : TSchema
	> extends Record<string, unknown>
		? TSchema
		: never;
	complete?: NoInfer<
		TSchema extends undefined
			? never
			: Partial<
					Record<
						keyof StandardSchemaV1.InferInput<
							TSchema extends undefined ? never : TSchema
						>,
						Completion
					>
				>
	>;
} & Icons &
	Replayable;

export type ToolOptions<
	TSchema extends StandardSchemaV1 | undefined = undefined,
	TOutputSchema extends StandardSchemaV1 | undefined = undefined,
> = {
	name: string;
	_meta?: Record<string, any>;
	description: string;
	title?: string;
	enabled?: () => boolean | Promise<boolean>;
	schema?: StandardSchemaV1.InferInput<
		TSchema extends undefined ? never : TSchema
	> extends Record<string, unknown>
		? TSchema
		: never;
	outputSchema?: StandardSchemaV1.InferOutput<
		TOutputSchema extends undefined ? never : TOutputSchema
	> extends Record<string, unknown>
		? TOutputSchema
		: never;
	annotations?: ToolAnnotations;
} & Icons &
	Replayable;

export type ResourceOptions = {
	name: string;
	description: string;
	title?: string;
	uri: string;
	mimeType?: string;
	enabled?: () => boolean | Promise<boolean>;
} & Icons &
	Replayable;

export type TemplateOptions<
	TUri extends string = string,
	TVariables extends ExtractURITemplateVariables<TUri> =
		ExtractURITemplateVariables<TUri>,
> = {
	name: string;
	description: string;
	title?: string;
	mimeType?: string;
	enabled?: () => boolean | Promise<boolean>;
	uri: TUri;
	complete?: NoInfer<
		TVariables extends never
			? never
			: Partial<Record<TVariables, Completion>>
	>;
	list?: () => Promise<Array<Resource>> | Array<Resource>;
} & Icons &
	Replayable;

export type CreatedTool<
	TSchema extends StandardSchemaV1 | undefined = undefined,
	TOutputSchema extends StandardSchemaV1 | undefined = undefined,
> = ToolOptions<TSchema, TOutputSchema> & { [created_tool]: created_tool };
export type CreatedPrompt<
	TSchema extends StandardSchemaV1 | undefined = undefined,
> = PromptOptions<TSchema> & { [created_prompt]: created_prompt };
export type CreatedResource = ResourceOptions & {
	[created_resource]: created_resource;
};
export type CreatedTemplate<TUri extends string = string> =
	TemplateOptions<TUri> & { [created_template]: created_template };

export type Tool<
	TSchema extends StandardSchemaV1 = StandardSchemaV1<any>,
	TOutputSchema extends StandardSchemaV1 = StandardSchemaV1<any>,
> = ToolOptions<TSchema, TOutputSchema> & {
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<CallToolResult> | CallToolResult;
};

export type Completion = (
	query: string,
	context: { arguments: Record<string, string> },
) => CompleteResult | Promise<CompleteResult>;

export type Prompt<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> =
	PromptOptions<TSchema> & {
		execute: (
			input?: StandardSchemaV1.InferInput<TSchema>,
		) => Promise<GetPromptResult> | GetPromptResult;
	};

export type StoredResource =
	| (TemplateOptions<string, string> & {
			template: true;
			list_resources?: () => Promise<Array<Resource>> | Array<Resource>;
			execute: (
				uri: string,
				params: Record<string, string | string[]>,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  })
	| (ResourceOptions & {
			template: false;
			execute: (
				uri: string,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  });

export type CachePolicy = {
	/**
	 * Time-to-live in milliseconds for cacheable results (>= 0). Defaults to 0 (no caching).
	 */
	ttlMs?: number;
	/**
	 * Cache scope for cacheable results. Defaults to 'private'. `public` must be
	 * explicitly opted into: `enabled` callbacks, auth context, and dynamic
	 * resource/template listings can make otherwise identical lists user-specific.
	 */
	cacheScope?: 'public' | 'private';
};

export type ServerOptions<TSchema extends StandardSchemaV1 | undefined> = {
	capabilities?: ServerCapabilities;
	instructions?: string;
	adapter: JsonSchemaAdapter<TSchema> | undefined;
	pagination?: {
		tools?: { size?: number };
		resources?: { size?: number };
		prompts?: { size?: number };
	};
	logging?: {
		default: LoggingLevel;
	};
	/**
	 * Cache policy for per-request protocol cacheable results
	 * (`server/discover`, `tools/list`, `prompts/list`, `resources/list`,
	 * `resources/read`, `resources/templates/list`). Defaults to
	 * `{ ttlMs: 0, cacheScope: 'private' }`. Per-method overrides win over
	 * the top-level defaults.
	 */
	cache?: CachePolicy & {
		methods?: Record<string, CachePolicy>;
	};
	/**
	 * Convert tmcp's retry data to text before sending it to the client, and
	 * restore that data when the client retries the request. The value includes
	 * data saved by the handler and validated answers needed to restart it from
	 * the beginning. Treat the value passed to `encode` as tmcp-owned data; its
	 * internal shape may grow in future protocol versions.
	 *
	 * SECURITY: the default uses plain JSON, so the client can read, change, or
	 * replace the saved data. Do not store secrets in it or use it to make
	 * authorization decisions. Use a protected converter if the server must
	 * detect changes. That converter should also tie the data to the current
	 * user, the original request, and a short expiry time.
	 *
	 * tmcp limits the text length before calling `decode`. `decode` may be
	 * asynchronous. Custom converters should also limit the restored value if
	 * needed, because tmcp cannot measure every application-specific value.
	 */
	requestStateCodec?: {
		encode: (state: unknown) => string | Promise<string>;
		decode: (encoded: string) => unknown | Promise<unknown>;
	};
};

export type ChangedArgs = {
	resource: [id: string];
	tools: [];
	prompts: [];
	resources: [];
};

type SubscriptionsKeysObj = {
	[K in keyof ChangedArgs as ChangedArgs[K]['length'] extends 0
		? 'without_args'
		: 'with_args']: K;
};

export type SubscriptionsKeys = SubscriptionsKeysObj['with_args'];

export type McpEvents = {
	send: (message: {
		request: JSONRPCRequest;
		subscriptionId?: RequestId;
		subscriptionOrigin?: SubscriptionOrigin;
	}) => void;
	broadcast: (message: {
		request: JSONRPCRequest;
		subscriptionOnly?: boolean;
	}) => void;
	initialize: (initialize_request: InitializeRequestParams) => void;
	subscription: (subscriptions_request: {
		uri: string;
		action?: 'add' | 'remove';
	}) => void;
	loglevelchange: (change: { level: LoggingLevel }) => void;
};
