import { StandardSchemaV1 } from '@standard-schema/spec';
import { JSONRPCRequest } from 'json-rpc-2.0';
import { JsonSchemaAdapter } from '../adapter.js';
import {
	GetPromptResult,
	CallToolResult,
	ReadResourceResult,
	CompleteResult,
	InitializeRequest,
} from '../validation/index.js';

export type Tool<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<CallToolResult> | CallToolResult;
};

export type Completion = (
	query: string,
	context: { arguments: Record<string, string> },
) => CompleteResult;

export type Prompt<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<GetPromptResult> | GetPromptResult;
};

export type Resource =
	| {
			description: string;
			name: string;
			template: true;
			execute: (
				uri: string,
				params: Record<string, string | string[]>,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  }
	| {
			description: string;
			name: string;
			template: false;
			execute: (
				uri: string,
			) => Promise<ReadResourceResult> | ReadResourceResult;
	  };

export type ServerOptions<TSchema extends StandardSchemaV1> = {
	capabilities?: {
		tools?: { listChanged?: boolean };
		resources?: { listChanged?: boolean; subscribe?: boolean };
		prompts?: { listChanged?: boolean };
	};
	instructions?: string;
	adapter: JsonSchemaAdapter<TSchema>;
	pagination?: {
		resources?: { size?: number };
		prompts?: { size?: number };
	};
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
	initialize: (initialize_request: InitializeRequest) => void;
};
