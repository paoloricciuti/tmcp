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
	Icons
} from '../validation/index.js';

export type Tool<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>, TOutputSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	outputSchema?: TOutputSchema;
	title?: string;
	annotations?: ToolAnnotations;
	_meta?: Record<string, unknown>;
	enabled?: () => boolean | Promise<boolean>;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<CallToolResult> | CallToolResult;
} & Icons;

export type Completion = (
	query: string,
	context: { arguments: Record<string, string> },
) => CompleteResult | Promise<CompleteResult>;

export type Prompt<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	title?: string;
	enabled?: () => boolean | Promise<boolean>;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<GetPromptResult> | GetPromptResult;
} & Icons;

export type StoredResource =
	| {
			description: string;
			name: string;
			template: true;
			title?: string;
			enabled?: () => boolean | Promise<boolean>;
			list_resources?: () =>
				| Promise<Array<Resource>>
				| Array<Resource>;
			execute: (
				uri: string,
				params: Record<string, string | string[]>,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  } & Icons
	| {
			description: string;
			name: string;
			template: false;
			title?: string;
			enabled?: () => boolean | Promise<boolean>;
			execute: (
				uri: string,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  } & Icons;

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
	}
};

export type ChangedArgs = {
	'resource': [id: string];
	'tools': [];
	'prompts': [];
	'resources': [];
}

type SubscriptionsKeysObj = {
	[K in keyof ChangedArgs as ChangedArgs[K]["length"] extends 0 ? "without_args" : "with_args"]: K
};

export type SubscriptionsKeys = SubscriptionsKeysObj["with_args"];

export type McpEvents = {
	send: (message: {
		request: JSONRPCRequest;
	}) => void;
	broadcast: (message: {
		request: JSONRPCRequest;
	}) => void;
	initialize: (initialize_request: InitializeRequestParams) => void;
	subscription: (subscriptions_request: { uri: string, action?: "add" | "remove" }) => void;
	loglevelchange: (change: { level: LoggingLevel }) => void;
};