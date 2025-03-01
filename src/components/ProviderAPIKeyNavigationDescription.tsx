import { t } from "@lingui/core/macro"
import { Link } from "@tanstack/react-router"

import { FormDescription } from "./ui/form"

interface IProviderAPIIKNavigationDescription {
  providerName: string | undefined
}

export function ProviderAPIKeyNavigationDescription({
  providerName,
}: IProviderAPIIKNavigationDescription) {
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
    default:
      return null
  }

  const getApiKeyString = t`Get API keys`

  return (
    <FormDescription>
      <Link to={url} className="text-blue-500">
        {getApiKeyString}
      </Link>
    </FormDescription>
  )
}
