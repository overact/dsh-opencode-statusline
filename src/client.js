let react = require("react");

const CSS_TAG = "dsh-opencode-statusline/styles";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(CSS_TAG) + "]") === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-statusline";
	tag.dataset.pluginCss = CSS_TAG;
	tag.textContent = ".dsl-root{display:flex;flex-direction:column;gap:5px;padding:8px 10px;border-top:1px solid var(--dsw-alias-border-l1,rgba(127,127,127,.18));font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary,#9a9a9a);min-width:0}.dsl-line{display:flex;align-items:center;gap:6px;min-width:0}.dsl-label{flex:none;color:var(--dsw-alias-label-caption,#777)}.dsl-cwd{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.dsl-bar{display:inline-flex;gap:2px;flex:none}.dsl-seg{width:4px;height:10px;border-radius:1px;background:var(--dsw-alias-bg-elevation-l1,rgba(127,127,127,.22))}.dsl-seg.on.s{background:var(--dsw-alias-state-success-primary,#22c55e)}.dsl-seg.on.w{background:var(--dsw-alias-state-warn-label,#eab308)}.dsl-seg.on.d{background:var(--dsw-alias-state-error-primary,#ef4444)}.dsl-pct{flex:none;font-variant-numeric:tabular-nums}.dsl-pct.s{color:var(--dsw-alias-state-success-primary,#22c55e)}.dsl-pct.w{color:var(--dsw-alias-state-warn-label,#eab308)}.dsl-pct.d{color:var(--dsw-alias-state-error-primary,#ef4444)}.dsl-usage{display:flex;flex-direction:column;gap:2px}.dsl-usage-bit{display:flex;align-items:center;gap:5px;min-width:0}.dsl-usage-label{flex:none;width:26px;color:var(--dsw-alias-label-caption,#777)}.dsl-reset{flex:none;color:var(--dsw-alias-label-tertiary,#666)}.dsl-muted{color:var(--dsw-alias-label-tertiary,#666)}";
	document.head.appendChild(tag);
}

const h = react.createElement;

// ---- i18n: follow the active document language (zh/en) ----
const STR = {
  zh: {
    reset: '已重置',
    goUsage: 'Go 用量 …',
    rolling: '滚动',
    weekly: '周',
    monthly: '月',
    dir: '目录',
    context: '上下文',
    contextEllipsis: '上下文 …',
  },
  en: {
    reset: 'reset',
    goUsage: 'Go usage …',
    rolling: 'Rolling',
    weekly: 'Weekly',
    monthly: 'Monthly',
    dir: 'Directory',
    context: 'Context',
    contextEllipsis: 'Context …',
  },
};
const currentLang = () => (typeof document !== "undefined" && document.documentElement.lang && String(document.documentElement.lang).toLowerCase().startsWith("en") ? "en" : "zh");
const t = (key) => (STR[currentLang()] && STR[currentLang()][key]) || key;


function fmt(n) {
	if (n == null || !Number.isFinite(n)) return "?";
	if (n >= 1e9) return (n / 1e9).toFixed(1) + "b";
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "m";
	if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
	return String(Math.round(n));
}

function visLen(s) {
	return String(s).length;
}

function truncatePath(p, maxLen) {
	if (visLen(p) <= maxLen) return p;
	const segs = p.split(/[\\/]/).filter(Boolean);
	let out = segs[segs.length - 1] || "";
	for (let i = segs.length - 2; i >= 0; i--) {
		const cand = segs[i] + "/" + out;
		if (visLen("…/" + cand) > maxLen) break;
		out = cand;
	}
	const prefixed = "…/" + out;
	return visLen(prefixed) > maxLen ? "…" + out.slice(-Math.max(1, maxLen - 2)) : prefixed;
}

function relReset(iso) {
	if (!iso) return null;
	const diff = new Date(iso).getTime() - Date.now();
	if (!Number.isFinite(diff)) return null;
	if (diff <= 0) return t('reset');
	const mins = Math.round(diff / 60000);
	if (mins < 60) return mins + "m";
	const hrs = Math.round(diff / 3600000);
	if (hrs < 48) return hrs + "h";
	return Math.round(diff / 86400000) + "d";
}

function tone(pct) {
	return pct >= 80 ? "d" : pct >= 50 ? "w" : "s";
}

function Bar({ pct, segs }) {
	const filled = pct == null ? 0 : Math.max(0, Math.min(segs, Math.round((pct / 100) * segs)));
	const color = tone(pct);
	const cells = [];
	for (let i = 0; i < segs; i++) {
		cells.push(h("span", { className: "dsl-seg" + (i < filled ? " on " + color : ""), key: i }));
	}
	return h("span", { className: "dsl-bar" }, cells);
}

function GoUsage({ usage }) {
	const u = usage && usage.usage;
	if (!u) return h("div", { className: "dsl-usage" }, h("span", { className: "dsl-muted" }, t('goUsage')));
	const seg = (label, w) => {
		if (!w || typeof w.percent !== "number") return null;
		return h("span", { className: "dsl-usage-bit", key: label }, [
			h("span", { className: "dsl-usage-label" }, label),
			h(Bar, { pct: w.percent, segs: 8 }),
			h("span", { className: "dsl-pct " + tone(w.percent) }, w.percent + "%"),
			h("span", { className: "dsl-reset" }, "·" + (relReset(w.resetsAt) || "?"))
		]);
	};
	const bits = [seg(t('rolling'), u.rolling), seg(t('weekly'), u.weekly), seg(t('monthly'), u.monthly)].filter(Boolean);
	if (bits.length === 0) return h("div", { className: "dsl-usage" }, h("span", { className: "dsl-muted" }, t('goUsage')));
	return h("div", { className: "dsl-usage" }, bits);
}

function StatuslineBlock({ wide, useSessions }) {
	const list = useSessions((s) => s);
	const summary = list.current === void 0 ? void 0 : list.byId[list.current];
	const cwd = summary === void 0 ? void 0 : summary.cwd;
	const pressure = summary === void 0 ? void 0 : summary.projectionValues === void 0 ? void 0 : summary.projectionValues.contextPressure;
	const usedTokens = pressure === void 0 ? void 0 : pressure.projectedTokens !== void 0 ? pressure.projectedTokens : pressure.pressureTokens;
	const contextWindow = pressure === void 0 ? void 0 : pressure.contextWindow;
	const pct = usedTokens !== void 0 && contextWindow !== void 0 ? Math.min(100, Math.round((usedTokens / contextWindow) * 100)) : null;

	const [usage, setUsage] = react.useState(null);
	react.useEffect(() => {
		let alive = true;
		const tick = () => {
			fetch("/api/go-usage", { cache: "no-store" })
				.then((res) => res.ok ? res.json() : null)
				.then((data) => {
					if (alive && data !== null) setUsage(data);
				})
				.catch(() => {});
		};
		tick();
		const timer = window.setInterval(tick, 60000);
		return () => {
			alive = false;
			window.clearInterval(timer);
		};
	}, []);

	if (!wide) return h("div", { className: "dsl-root" }, h("div", { className: "dsl-line" }, pct === null ? h("span", { className: "dsl-muted" }, "·") : h("span", { className: "dsl-pct " + tone(pct) }, pct + "%")));

	const cwdLine = cwd === void 0 || cwd === "" ? h("span", { className: "dsl-muted" }, "—") : h("span", { className: "dsl-cwd", title: cwd }, truncatePath(cwd, 40));
	const contextLine = pct === null ? h("span", { className: "dsl-muted" }, t('contextEllipsis')) : [
		h(Bar, { pct, segs: 10, key: "bar" }),
		h("span", { className: "dsl-pct " + tone(pct), key: "pct" }, pct + "%"),
		h("span", { className: "dsl-reset", key: "num" }, fmt(usedTokens) + "/" + fmt(contextWindow))
	];

	return h("div", { className: "dsl-root" }, [
		h("div", { className: "dsl-line", key: "cwd" }, [h("span", { className: "dsl-label" }, t('dir')), cwdLine]),
		h("div", { className: "dsl-line", key: "ctx" }, [h("span", { className: "dsl-label" }, t('context')), contextLine]),
		h(GoUsage, { usage, key: "go" })
	]);
}

const inject = ["slots"];

function apply(ctx) {
	try {
		ctx.slots.inject("sidebar.footer.action", () => {
			console.log("[dsh-statusline] registering footer action");
			return ctx.slots.register({
				name: "sidebar.footer.action",
				id: "statusline",
				order: 1000
			}, StatuslineBlock);
		});
		console.log("[dsh-statusline] mounted");
	} catch (error) {
		console.error("[dsh-statusline] apply failed", error);
	}
}

exports.StatuslineBlock = StatuslineBlock;
exports.apply = apply;
exports.inject = inject;
