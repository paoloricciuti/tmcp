import { SimpleProvider } from '@tmcp/auth';

const codes = new Map();
const clients = new Map();
const tokens = new Map();
const refresh_tokens = new Map();

const chars =
	'abcdefghijkmnpqrstuvwxyz23456789';

function random_string(length = 32) {
	let random_bytes = new Uint8Array(length);
	crypto.getRandomValues(random_bytes);
	let result = '';
	for (let i = 0; i < random_bytes.byteLength; i++) {
		result += chars[random_bytes[i] >> 3];
	}
	return result;
}

export const oauth = new SimpleProvider({
	clients: {
		async get(client_id) {
			return clients.get(client_id);
		},
		async register(client_info) {
			const client_id = random_string(13);
			const new_client = {
				...client_info,
				client_id,
				client_id_issued_at: Date.now()
			};
			clients.set(client_id, new_client);
			return new_client;
		}
	},
	codes: {
		async get(code) {
			return codes.get(code);
		},
		async store(code, code_data) {
			codes.set(code, code_data);
		},
		async delete(code) {
			codes.delete(code);
		}
	},
	tokens: {
		async get(token) {
			return tokens.get(token);
		},
		async store(token, token_data) {
			tokens.set(token, token_data);
		},
		async delete(token) {
			tokens.delete(token);
		}
	},
	refreshTokens: {
		async get(token) {
			return refresh_tokens.get(token);
		},
		async store(token, token_data) {
			refresh_tokens.set(token, token_data);
		},
		async delete(token) {
			refresh_tokens.delete(token);
		}
	}
}).build('http://localhost:3000', {
	bearer: {
		paths: {{BEARER_PATHS}}
	},
	cors: {
		origin: '*',
		credentials: true
	},
	registration: true
});