import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuth } from '../src/index.js';

const client_id = 'https://client.example/oauth/client.json';
const redirect_uri = 'https://client.example/callback';

afterEach(() => vi.unstubAllGlobals());

function create_handlers(authorize) {
	return {
		authorize,
		async exchange() {
			return { access_token: 'token', token_type: 'bearer' };
		},
		async verify(token) {
			return { token, clientId: client_id, scopes: [] };
		},
	};
}

function create_authorization_request(request_client_id = client_id) {
	const url = new URL('https://auth.example.com/authorize');
	url.searchParams.set('client_id', request_client_id);
	url.searchParams.set('redirect_uri', redirect_uri);
	url.searchParams.set('response_type', 'code');
	return new Request(url);
}

function create_metadata(overrides = {}) {
	return {
		client_id,
		client_name: 'Example MCP client',
		redirect_uris: [redirect_uri],
		token_endpoint_auth_method: 'none',
		...overrides,
	};
}

describe('2026-07-28 authorization', () => {
	it('advertises Client ID Metadata Document support', async () => {
		const oauth = OAuth.issuer('https://auth.example.com')
			.handlers(
				create_handlers(
					async () => new Response(null, { status: 204 }),
				),
			)
			.build();

		const response = await oauth.respond(
			new Request(
				'https://auth.example.com/.well-known/oauth-authorization-server',
			),
		);

		expect(await response?.json()).toMatchObject({
			client_id_metadata_document_supported: true,
			token_endpoint_auth_methods_supported: expect.arrayContaining([
				'none',
			]),
		});
	});

	it('fetches and validates a Client ID Metadata Document for each request', async () => {
		let received_client;
		const metadata_fetch = vi.fn(async () => {
			return new Response(JSON.stringify(create_metadata()));
		});
		vi.stubGlobal('fetch', metadata_fetch);
		const oauth = OAuth.issuer('https://auth.example.com')
			.handlers(
				create_handlers(async (request) => {
					received_client = request.client;
					return new Response(null, { status: 204 });
				}),
			)
			.build();

		await oauth.respond(create_authorization_request());
		await oauth.respond(create_authorization_request());

		expect(received_client).toMatchObject({
			client_id,
			client_name: 'Example MCP client',
		});
		expect(metadata_fetch).toHaveBeenCalledTimes(2);
	});

	it('resolves metadata-document clients at the token endpoint', async () => {
		let exchanged_client;
		const handlers = create_handlers(
			async () => new Response(null, { status: 204 }),
		);
		handlers.exchange = async (request) => {
			exchanged_client = request.client;
			return { access_token: 'token', token_type: 'bearer' };
		};
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(create_metadata()))),
		);
		const oauth = OAuth.issuer('https://auth.example.com')
			.handlers(handlers)
			.build();
		const body = new URLSearchParams({
			client_id,
			grant_type: 'refresh_token',
			refresh_token: 'refresh-token',
		});

		const response = await oauth.respond(
			new Request('https://auth.example.com/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body,
			}),
		);

		expect(response?.status).toBe(200);
		expect(exchanged_client).toMatchObject({ client_id });
	});

	it.each([
		'http://client.example/oauth/client.json',
		'https://client.example',
		'https://user@client.example/oauth/client.json',
		'https://client.example/oauth/../client.json',
		'https://client.example/oauth/client.json#fragment',
	])(
		'rejects invalid client ID URL %s before fetching',
		async (invalid_client_id) => {
			const metadata_fetch = vi.fn();
			vi.stubGlobal('fetch', metadata_fetch);
			const oauth = OAuth.issuer('https://auth.example.com')
				.handlers(
					create_handlers(
						async () => new Response(null, { status: 204 }),
					),
				)
				.build();

			const response = await oauth.respond(
				create_authorization_request(invalid_client_id),
			);

			expect(response?.status).toBe(401);
			expect(metadata_fetch).not.toHaveBeenCalled();
		},
	);

	it.each([
		create_metadata({ client_id: 'https://client.example/wrong.json' }),
		create_metadata({ client_name: undefined }),
		create_metadata({ redirect_uris: [] }),
		create_metadata({ client_secret: 'secret' }),
		create_metadata({ token_endpoint_auth_method: 'client_secret_basic' }),
	])('rejects invalid Client ID Metadata Documents', async (metadata) => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify(metadata))),
		);
		const oauth = OAuth.issuer('https://auth.example.com')
			.handlers(
				create_handlers(
					async () => new Response(null, { status: 204 }),
				),
			)
			.build();

		const response = await oauth.respond(create_authorization_request());

		expect(response?.status).toBe(401);
	});
});
