import { load } from "@tauri-apps/plugin-store"

import { AIProviderManager, IAIProvider } from "./ai-providers"
import { SearchApiStore, TBaseSearchAPI } from "./search-api-store"

const VERSION_TAGS_STORE_KEY = "VERSIONs.json"

type TUpdater = [string, () => Promise<void>]
async function excute([tag, updater]: TUpdater) {
  const store = await load(VERSION_TAGS_STORE_KEY)

  if (store && (await store.get(tag))) {
    return
  } else {
    await updater()
    await store.set(tag, true)
  }
}

export async function update() {
  updaters.forEach(excute)
}

const updaters: TUpdater[] = [
  [
    "0.1.0-rc.0",
    async () => {
      const presetProviders: IAIProvider[] = [
        {
          name: "OpenAI",
          baseURL: "https://api.openai.com/v1",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: "Google",
          baseURL: "https://generativelanguage.googleapis.com",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: "OpenRouter",
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: "DeepSeek",
          baseURL: "https://api.deepseek.com/v1",
          apiKey: "",
          models: [],
          preset: true,
        },
      ]

      for (let p of presetProviders) {
        await AIProviderManager.addProvider(p)
      }

      const presetSearchApis: TBaseSearchAPI[] = [
        {
          name: "Jina",
          searchURL: "https://s.jina.ai",
          apiKey: "",
        },
      ]

      for (let p of presetSearchApis) {
        await SearchApiStore.setSearchApi(p)
      }
    },
  ],
]
