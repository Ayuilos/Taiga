import { t } from "@lingui/core/macro"
import { openUrl } from "@tauri-apps/plugin-opener"

import { FormDescription } from "./ui/form"

interface IAPIIKNavigationDescription {
  providerName: string | undefined
}

export function APIKeyNavigationDescription({
  providerName,
}: IAPIIKNavigationDescription) {
  let url: string

  switch (providerName) {
    case "DeepSeek[Preset]":
      url = "https://platform.deepseek.com/api_keys"
      break
    case "Google[Preset]":
      url = "https://aistudio.google.com/apikey"
      break
    case "OpenAI[Preset]":
      url = "https://platform.openai.com/docs/overview"
      break
    case "OpenRouter[Preset]":
      url = "https://openrouter.ai/settings/keys"
      break
    case "Jina[Preset]":
      url = "https://jina.ai/api-dashboard/key-manager"
      break
    case "Exa[Preset]":
      url = "https://dashboard.exa.ai/api-keys"
      break
    default:
      return null
  }

  const getApiKeyString = t`Get API keys`

  return (
    <FormDescription>
      <a
        data-url={url}
        onClick={() => {
          openUrl(url)
        }}
        className="text-blue-500"
      >
        {getApiKeyString}
      </a>
    </FormDescription>
  )
}
