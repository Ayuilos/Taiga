import { AIFunctionSet } from "@agentic/core"
import { ExaClient } from "@agentic/exa"
import { JinaClient } from "@agentic/jina"
import ky from "ky"

export function getSearchAITools(apiKeys: Record<string, string>) {
  const defaultKy = ky.extend({ timeout: 60_000 })

  return new AIFunctionSet(
    [
      apiKeys["Jina[Preset]"]
        ? new JinaClient({ ky: defaultKy, apiKey: apiKeys["Jina[Preset]"] })
        : null,
      apiKeys["Exa[Preset]"]
        ? new ExaClient({ ky: defaultKy, apiKey: apiKeys["Exa[Preset]"] || "" })
        : null,
    ].filter((t) => t !== null)
  )
}
