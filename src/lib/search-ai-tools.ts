import { AIFunctionSet } from "@agentic/core"
// import { ExaClient } from "@agentic/exa"
import { JinaClient } from "@agentic/jina"
import ky from "ky"

// [NOTE] Pause Exa Integration as CORS issues and a lot models not support schemas well
export function getSearchAITools(apiKeys: Record<string, string>) {
  const defaultKy = ky.extend({ timeout: 60_000 })

  return new AIFunctionSet(
    [
      apiKeys["Jina[Preset]"]
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
            apiKey: apiKeys["Jina[Preset]"],
          })
        : null,
      // apiKeys["Exa[Preset]"]
      //   ? new ExaClient({ ky: defaultKy, apiKey: apiKeys["Exa[Preset]"] || "" })
      //   : null,
    ].filter((t) => t !== null)
  )
}
