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
	ToolAnnotations
} from '../validation/index.js';

export type Tool<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	title?: string;
	annotations?: ToolAnnotations;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<CallToolResult> | CallToolResult;
};

export type Completion = (
	query: string,
	context: { arguments: Record<string, string> },
) => CompleteResult | Promise<CompleteResult>;

export type Prompt<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	title?: string;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<GetPromptResult> | GetPromptResult;
};

export type StoredResource =
	| {
			description: string;
			name: string;
			template: true;
			title?: string;
			list_resources?: () =>
				| Promise<Array<Resource>>
				| Array<Resource>;
			execute: (
				uri: string,
				params: Record<string, string | string[]>,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  }
	| {
			description: string;
			name: string;
			template: false;
			title?: string;
			execute: (
				uri: string,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  };

export type ServerOptions<TSchema extends StandardSchemaV1> = {
	capabilities?: ServerCapabilities;
	instructions?: string;
	adapter: JsonSchemaAdapter<TSchema>;
	pagination?: {
		resources?: { size?: number };
		prompts?: { size?: number };
	};
	logging?: {
		default: LoggingLevel;
	}
};

export type ServerInfo = {
	name: string;
	version: string;
	description: string;
};

export type SubscriptionsKeys = 'resource';

export type McpEvents = {
	send: (message: {
		request: JSONRPCRequest;
		context: {
			sessions?: string[] | undefined;
		};
	}) => void;
	initialize: (initialize_request: InitializeRequestParams) => void;
};