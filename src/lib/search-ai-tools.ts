import { AIFunctionSet } from "@agentic/core"
// import { ExaClient } from "@agentic/exa"
import { JinaClient } from "@agentic/jina"
// import { SearxngClient } from "@agentic/searxng"
// import { fetch as tFetch } from "@tauri-apps/plugin-http"
import ky from "ky"

import { PRESET_NAMES } from "./updater"

// [NOTE] Pause Exa Integration as CORS issues and a lot models not support schemas well
// [NOTE] Pause Searxng Integration as no way to avoid limiter of searxng instance now
export function getSearchAITools(apiKeys: Record<string, string>) {
  const defaultKy = ky.extend({ timeout: 60_000 })

  return new AIFunctionSet(
    [
      // apiKeys[PRESET_NAMES.SEARXNG_PRESET]
      //   ? new SearxngClient({
      //       ky: defaultKy.extend({
      //         fetch: tFetch,
      //         headers: {
      //           Accept:
      //             "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      //           "User-Agent":
      //             "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
      //           "Accept-Encoding": "gzip, deflate, br, zstd",
      //           "Accept-Language": "en-US,en;q=0.9",
      //           "Cache-Control": "no-cache",
      //           "Sec-Ch-Ua": `"Not(A:Brand";v="99", "Chromium";v="133", "Google Chrome";v="133"`,
      //           "Sec-Fetch-Dest": "document",
      //           "Sec-Fetch-Mode": "navigate",
      //           "Sec-Fetch-Site": "none",
      //           "Sec-Fetch-User": "?1",
      //           Pragma: "no-cache",
      //           Priority: "u=0, i",
      //           "Upgrade-Insecure-Requests": "1",
      //         },
      //       }),
      //       apiBaseUrl: apiKeys[PRESET_NAMES.SEARXNG_PRESET],
      //     })
      //   : null,
      apiKeys[PRESET_NAMES.JINA_PRESET]
        ? new JinaClient({
            ky: defaultKy.extend({
              hooks: {
                beforeRequest: [
                  (rq) => {
                    rq.headers.set("Accept", "application/json")
                    rq.headers.set("X-With-Favicons", "true")
                  },
                ],
              },
            }),
            apiKey: apiKeys[PRESET_NAMES.JINA_PRESET],
          })
        : null,
      // apiKeys["Exa[Preset]"]
      //   ? new ExaClient({ ky: defaultKy, apiKey: apiKeys["Exa[Preset]"] || "" })
      //   : null,
    ].filter((t) => t !== null)
  )
}
