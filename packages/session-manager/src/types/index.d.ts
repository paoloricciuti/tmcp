declare module '@tmcp/session-manager' {
	import type { SubscriptionFilter, Context } from 'tmcp';
	import type { JSONRPCRequest } from 'json-rpc-2.0';
	/**
	 * @import { Context, SubscriptionFilter } from "tmcp";
	 * @import { JSONRPCRequest } from "json-rpc-2.0";
	 */
	/**
	 * Determine whether a notification belongs on a subscription stream.
	 * Distributed managers can use this directly or maintain equivalent indexes.
	 * */
	export function matchesSubscription(
		filters: SubscriptionFilter,
		notification: JSONRPCRequest,
	): boolean;
	/**
	 * Routes notifications to long-lived per-request subscription streams.
	 * Callbacks remain local to the process serving the response stream. Brokered
	 * implementations can distribute notifications without persisting descriptors.
	 * @abstract
	 */
	export abstract class SubscriptionManager {
		/**
		 * @abstract
		 * Atomically register a subscription. Matching notifications must be
		 * buffered until acknowledgement completes and then delivered in order.
		 * */
		abstract create(
			subscription: Subscription,
			callbacks: SubscriptionCallbacks,
		): boolean | Promise<boolean>;
		/**
		 * @abstract
		 * */
		abstract send(notification: JSONRPCRequest): void | Promise<void>;
		/**
		 * @abstract
		 * Request closure of one subscription. Implementations must preserve the
		 * JSON-RPC ID type when identifying a registration.
		 * */
		abstract close(
			id: string | number,
			origin: string,
			reason: 'closed' | 'cancelled',
		): boolean | Promise<boolean>;
		/**
		 * @abstract
		 * Close every subscription, optionally limited to one transport origin.
		 * */
		abstract closeAll(
			origin?: string,
			reason?: 'closed' | 'cancelled',
		): void | Promise<void>;
	}
	/**
	 * Process-local subscription manager. Distributed implementations should
	 * mirror its acknowledgement buffering and per-subscription ordering.
	 */
	export class InMemorySubscriptionManager extends SubscriptionManager {
		create(
			subscription: Subscription,
			callbacks: SubscriptionCallbacks,
		): Promise<boolean>;
		send(notification: JSONRPCRequest): Promise<void>;
		close(
			id: string | number,
			origin: string,
			reason: 'closed' | 'cancelled',
		): Promise<boolean>;
		closeAll(
			origin?: string,
			reason?: 'closed' | 'cancelled',
		): Promise<void>;
		#private;
	}
	/**
	 * @abstract
	 */
	export abstract class StreamSessionManager {
		/**
		 * @abstract
		 * */
		abstract create(
			id: string,
			controller: ReadableStreamDefaultController,
		): void | Promise<void>;
		/**
		 * @abstract
		 * */
		abstract delete(id: string): void | Promise<void>;
		/**
		 * @abstract
		 * */
		abstract has(id: string): boolean | Promise<boolean>;
		/**
		 * @abstract
		 * */
		abstract send(
			sessions: string[] | undefined,
			data: string,
		): void | Promise<void>;
	}
	export class InMemoryStreamSessionManager extends StreamSessionManager {
		create(id: string, controller: ReadableStreamDefaultController): void;
		delete(id: string): void;
		has(id: string): Promise<boolean>;
		send(sessions: string[] | undefined, data: string): void;
		#private;
	}
	/**
	 * @abstract
	 */
	export abstract class InfoSessionManager {
		/**
		 * @abstract
		 * */
		abstract getClientInfo(
			id: string,
		): Promise<NonNullable<Context['sessionInfo']>['clientInfo']>;
		/**
		 * @abstract
		 * */
		abstract setClientInfo(
			id: string,
			client_info: NonNullable<Context['sessionInfo']>['clientInfo'],
		): void;
		/**
		 * @abstract
		 * */
		abstract getClientCapabilities(
			id: string,
		): Promise<NonNullable<Context['sessionInfo']>['clientCapabilities']>;
		/**
		 * @abstract
		 * */
		abstract setClientCapabilities(
			id: string,
			client_capabilities: NonNullable<
				Context['sessionInfo']
			>['clientCapabilities'],
		): void;
		/**
		 * @abstract
		 * */
		abstract getLogLevel(
			id: string,
		): Promise<NonNullable<Context['sessionInfo']>['logLevel']>;
		/**
		 * @abstract
		 * */
		abstract setLogLevel(
			id: string,
			log_level: NonNullable<Context['sessionInfo']>['logLevel'],
		): void;
		/**
		 * @abstract
		 * */
		abstract getSubscriptions(uri: string): Promise<string[]>;
		/**
		 * @abstract
		 * */
		abstract addSubscription(id: string, uri: string): void;
		/**
		 * @abstract
		 * */
		abstract removeSubscription(id: string, uri: string): void;
		/**
		 * @abstract
		 * */
		abstract delete(id: string): void;
	}
	export class InMemoryInfoSessionManager extends InfoSessionManager {
		#private;
	}
	export type Subscription = {
		id: string | number;
		origin: string;
		filters: SubscriptionFilter;
	};
	export type SubscriptionCallbacks = {
		acknowledge: () => void | Promise<void>;
		send: (notification: JSONRPCRequest) => void | Promise<void>;
		close: (reason: 'closed' | 'cancelled') => void | Promise<void>;
	};
	export {};
}
//# sourceMappingURL=index.d.ts.map
