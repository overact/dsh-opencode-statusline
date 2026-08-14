import { credentialRef } from "@deepseek-ai/dsh-credentials";
import z from "@deepseek-ai/schemastery";

const name = "dsh-statusline";

const Config = z.object({
	usageUrl: z.string().pattern(/^https?:\/\//).default("https://opencode.ai/zen/go/v1/usage"),
	apiKeyEnv: z.string().role("credential-ref").default("OPENCODE_API_KEY"),
	cacheTtlMs: z.number().step(1).min(1).default(60000),
	fetchTimeoutMs: z.number().step(1).min(1).default(2500)
}).default();

const inject = ["webServer", "credentials"];

function apply(ctx, config) {
	let cache = null;

	const readKey = async () => {
		try {
			const credentials = ctx.get("credentials");
			if (credentials !== void 0) {
				const hit = await credentials.resolve(credentialRef(config.apiKeyEnv));
				if (hit !== void 0 && hit.value !== void 0 && hit.value.length > 0) return hit.value;
			}
		} catch {
			/* fall through to the ambient environment */
		}
		const ambient = process.env[config.apiKeyEnv];
		return ambient !== void 0 && ambient.length > 0 ? ambient : null;
	};

	const fetchUsage = async () => {
		const now = Date.now();
		if (cache !== null && now - cache.ts < config.cacheTtlMs) return cache.data;
		const key = await readKey();
		if (!key) return { error: "no-credential" };
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), config.fetchTimeoutMs);
		try {
			const res = await fetch(config.usageUrl, {
				headers: { authorization: `Bearer ${key}` },
				signal: controller.signal
			});
			clearTimeout(timer);
			if (!res.ok) return { error: `http-${res.status}` };
			const data = await res.json();
			cache = { ts: now, data };
			return data;
		} catch (error) {
			clearTimeout(timer);
			return { error: String(error?.name ?? "network") };
		}
	};

	const send = (res, status, body) => {
		res.writeHead(status, {
			"content-type": "application/json",
			"cache-control": "no-store"
		});
		res.end(JSON.stringify(body));
	};

	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/api/go-usage",
		handler: async (req, res) => {
			try {
				send(res, 200, await fetchUsage());
			} catch (error) {
				send(res, 500, { error: "internal", message: String(error?.message ?? error) });
			}
		}
	}), "dsh-statusline: go usage route");
}

export { Config, apply, inject, name };
