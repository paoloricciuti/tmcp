// These tests use the generated declarations in `types`: run
// `pnpm generate:types` after changing the types of the sources.
import { fileURLToPath } from 'node:url';
import { check_consumer } from '@tmcp/internal-ts-helpers/check-consumer';
import { describe, expect, it } from 'vitest';

const auth = fileURLToPath(new URL('..', import.meta.url));
const tmcp = fileURLToPath(new URL('../../tmcp', import.meta.url));

describe('declarations', () => {
	it('lets consumers emit declarations for the values they export', () => {
		const { diagnostics, declarations } = check_consumer({
			packages: [auth, tmcp],
			files: {
				'src/index.ts': `
import { OAuth, ProxyOAuthServerProvider, MemoryClientStore } from '@tmcp/auth';

export const oauth = OAuth.issuer('https://example.com').memory().build();
export const verify = oauth.verify;
export const proxy = new ProxyOAuthServerProvider({
	endpoints: { authorizationUrl: 'https://example.com/authorize', tokenUrl: 'https://example.com/token' },
	verify: async (token) => ({ token, clientId: 'client', scopes: [] }),
	getClient: async () => undefined,
});
export const handlers = proxy.handlers();
const store = new MemoryClientStore();
export const get_client = store.getClient.bind(store);
`,
			},
			compilerOptions: { declaration: true },
		});
		expect(diagnostics).toEqual([]);
		const output = declarations['index.d.ts'];
		expect(output).toContain('import("@tmcp/auth").AuthInfo');
		expect(output).toContain('import("@tmcp/auth").SimplifiedHandlers');
		expect(output).not.toContain('/types/');
	});
});
