# @mcd0luo/dsh-opencode-statusline

Claude Code style statusline for [dsh](https://github.com/deepseek-ai/deepseek-harness) web UI.

Shows a status block at the bottom of the web app's sidebar:

- 目录 — current session's working directory
- 上下文 — context-window usage bar (from dsh's `contextPressure` session projection)
- Go 用量 — [OpenCode Go](https://opencode.ai/go) subscription usage (rolling / weekly / monthly, colored bars + reset countdown)

The Go usage is fetched server-side from the OpenCode Go API; the API key is read
from the dsh credentials service (`OPENCODE_API_KEY`), never exposed to the browser.

## Install

Requires [dsh](https://github.com/deepseek-ai/deepseek-harness) and an
[OpenCode Go](https://opencode.ai/go) subscription.

```sh
dsh plugin --profile web add @mcd0luo/dsh-opencode-statusline
```

Then enable it in `~/.dsh/profiles/web/cordis.patch.yml` (create the file if missing):

```yaml
- insert:
    - id: statusline
      name: @mcd0luo/dsh-opencode-statusline
      config:
        usageUrl: https://opencode.ai/zen/go/v1/usage
        apiKeyEnv: OPENCODE_API_KEY
        cacheTtlMs: 60000
        fetchTimeoutMs: 2500
```

Store your Go API key with the credentials service (the web Models page writes it,
or add `OPENCODE_API_KEY: sk-...` to `~/.dsh/.credentials.yaml`).

Restart `dsh web` and hard-refresh the browser (`Ctrl+Shift+R`). The status block
appears at the bottom of the sidebar (expand the sidebar if collapsed).

## Configuration

| key | type | default | description |
|---|---|---|---|
| `usageUrl` | url | `https://opencode.ai/zen/go/v1/usage` | OpenCode Go usage endpoint |
| `apiKeyEnv` | string | `OPENCODE_API_KEY` | credential name resolved through the dsh credentials service |
| `cacheTtlMs` | int | `60000` | how long a usage response is cached server-side |
| `fetchTimeoutMs` | int | `2500` | upstream request timeout |

## Build

```sh
npm run build
```

`lib/client.js` (the browser bundle) is generated from `src/client.js`; `lib/index.js`
(the host plugin) is copied from `src/index.js`.

## Compatibility

Tested with `@deepseek-ai/dsh` 0.1.0-rc.6. The client registers into the
`sidebar.footer.action` slot and reads the `contextPressure` session projection;
both are internal dsh web contracts and may change in future releases.
