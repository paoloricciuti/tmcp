
import { InfoSessionManager } from "@tmcp/session-manager";

type ToOmit = 'removeSubscription';

export type OptionalizeSessionManager<TInfoSessionManager extends InfoSessionManager> = Omit<TInfoSessionManager, ToOmit> & Partial<Pick<TInfoSessionManager, ToOmit>>;