import { StandardSchemaV1 } from '@standard-schema/spec';
import { JSONRPCRequest } from 'json-rpc-2.0';

export type Tool<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<unknown> | unknown;
};

export type Completion = (
	argument: { name: string; value: string },
	context: { arguments: Record<string, string> },
) => string[];

export type Prompt<TSchema extends StandardSchemaV1 = StandardSchemaV1<any>> = {
	description: string;
	schema: TSchema;
	execute: (
		input?: StandardSchemaV1.InferInput<TSchema>,
	) => Promise<unknown> | unknown;
};

export type Resource = {
	description: string;
	name: string;
	template: boolean;
	execute: (uri: string, params?: unknown) => Promise<unknown> | unknown;
};

export type ServerOptions = {
	send?: (payload: JSONRPCRequest) => void;
	capabilities?: {
		tools?: { listChanged?: boolean };
		resources?: { listChanged?: boolean; subscribe?: boolean };
		prompts?: { listChanged?: boolean; subscribe?: boolean };
	};
	instructions?: string;
};

export type ServerInfo = {
	name: string;
	version: string;
	description: string;
};
