import { load } from "@tauri-apps/plugin-store"

import { AIProviderManager, IAIProvider } from "./ai-providers"
import { GithubAPI } from "./github-get-latest-release-response-schema"
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

export enum PRESET_NAMES {
  OPENAI_PRESET = "OpenAI[Preset]",
  GOOGLE_PRESET = "Google[Preset]",
  OPENROUTER_PRESET = "OpenRouter[Preset]",
  DEEPSEEK_PRESET = "DeepSeek[Preset]",
  JINA_PRESET = "Jina[Preset]",
  SEARXNG_PRESET = "Searxng[Preset]",
}

export const TAIGA_GITHUB_URL = "https://github.com/Ayuilos/Taiga"

export const updaters: TUpdater[] = [
  [
    "0.1.0-rc.0",
    async () => {
      const presetProviders: IAIProvider[] = [
        {
          name: PRESET_NAMES.OPENAI_PRESET,
          baseURL: "https://api.openai.com/v1",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: PRESET_NAMES.GOOGLE_PRESET,
          baseURL: "https://generativelanguage.googleapis.com/v1beta",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: PRESET_NAMES.OPENROUTER_PRESET,
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: "",
          models: [],
          preset: true,
        },
        {
          name: PRESET_NAMES.DEEPSEEK_PRESET,
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
          name: PRESET_NAMES.JINA_PRESET,
          searchURL: "https://s.jina.ai",
          apiKey: "",
        },
        // [NOTE] Not applicable as public searxng instance always return 429
        // haven't find ways to avoid searxng limiter currently
        // {
        //   name: PRESET_NAMES.SEARXNG_PRESET,
        //   searchURL: "https://baresearch.org",
        // },
      ]

      for (let p of presetSearchApis) {
        await SearchApiStore.setSearchApi(p)
      }
    },
  ],
  ["0.1.0-rc.1", async () => {}],
  ["0.1.0-rc.2", async () => {}],
  ["0.1.0-rc.3", async () => {}],
]
export const getCurrentVersion = () => updaters[updaters.length - 1][0]

export const checkForUpdates = async (error_fallback: (e: any) => void) => {
  try {
    const response = await fetch(
      "https://api.github.com/repos/Ayuilos/Taiga/releases/latest",
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(10_000),
      }
    )

    if (response.ok) {
      const { tag_name }: GithubAPI.Release = await response.json()
      const tagName = tag_name.replace("v", "")

      const store = await load(VERSION_TAGS_STORE_KEY)
      const isLatest = await store.has(tagName)

      return { isLatest, tagName }
    }
  } catch (e) {
    error_fallback(e)
  }
}
