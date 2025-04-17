import { t } from "@lingui/core/macro"
import { openUrl } from "@tauri-apps/plugin-opener"

import { PRESET_NAMES } from "@/lib/updater"
import { FormDescription } from "./ui/form"

interface INavigationDescription {
  providerName: string | undefined
  type: "search_api_key" | "provider_api_key" | "search_api_url" | "customize_theme"
}

export function NavigationDescription({
  providerName,
  type,
}: INavigationDescription) {
  let url: string
  let customDescription: string | undefined

  switch (type) {
    case "provider_api_key": {
      switch (providerName) {
        case PRESET_NAMES.DEEPSEEK_PRESET:
          url = "https://platform.deepseek.com/api_keys"
          break
        case PRESET_NAMES.GOOGLE_PRESET:
          url = "https://aistudio.google.com/apikey"
          break
        case PRESET_NAMES.OPENAI_PRESET:
          url = "https://platform.openai.com/docs/overview"
          break
        case PRESET_NAMES.OPENROUTER_PRESET:
          url = "https://openrouter.ai/settings/keys"
          break
        default:
          return null
      }
      break
    }
    case "search_api_url": {
      switch (providerName) {
        case PRESET_NAMES.SEARXNG_PRESET:
          url = "https://searx.space/"
          customDescription = t`Find more Searxng instances`
          break
        default:
          return null
      }
      break
    }
    case "search_api_key": {
      switch (providerName) {
        case PRESET_NAMES.JINA_PRESET:
          url = "https://jina.ai/api-dashboard/key-manager"
          break
        default:
          return null
      }
      break
    }
    case "customize_theme": {
      url = "https://tweakcn.com"
      customDescription = t`Customize your own theme from tweakcn`
      break
    }
  }

  const getApiKeyString = customDescription ?? t`Get API keys`

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
