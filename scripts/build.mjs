import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

mkdirSync(join(root, "lib"), { recursive: true });

copyFileSync(join(root, "src", "index.js"), join(root, "lib", "index.js"));

const body = readFileSync(join(root, "src", "client.js"), "utf8");
const bundle = `window.__ModuleLoader__.load({
	id: "@mcd0luo/dsh-opencode-statusline",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${body}
		return module.exports;
	}
});
`;
writeFileSync(join(root, "lib", "client.js"), bundle);

console.log("dsh-statusline: lib/index.js + lib/client.js built");
