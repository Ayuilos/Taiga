import { fetch as tFetch } from "@tauri-apps/plugin-http"
import { load } from "@tauri-apps/plugin-store"
import { z } from "zod"

import { stringifyObject } from "./utils"

export const zAIProvider = z.object({
  name: z.string().min(1),
  baseURL: z.string().url(),
  apiKey: z.string(),
  models: z.array(z.string().min(1)),
})

export type IAIProvider = z.infer<typeof zAIProvider>

const getDefaultAIProvider = () =>
  ({
    name: "default",
    baseURL: "http://localhost:1234/v1",
    apiKey: "",
    models: [],
  }) as IAIProvider

const providerStoreKey = "providers.json"

export class AIProviderManager {
  static providers: IAIProvider[]

  static async loadProviders() {
    const store = await load(providerStoreKey)

    if (store) {
      console.log("Store found")

      console.log("Getting provider counts")
      const providerCounts = await store.length()

      if (providerCounts === 0) {
        console.log("No provider found, adding a default one")

        const defaultAIProvider = getDefaultAIProvider()
        await store.set(defaultAIProvider.name, defaultAIProvider)

        console.log("Adding Success!")

        this.providers = [defaultAIProvider]
      } else {
        console.log(`${providerCounts} providers found, loading them`)
        const providers = await store.values<IAIProvider>()
        console.log(`Loading success!: ${stringifyObject(providers)}`)

        this.providers = providers
      }

      return this.providers
    }

    return []
  }

  static async addProvider(newProvider: IAIProvider) {
    if (newProvider.name === "") {
      throw new Error("Provider name cannot be empty!")
    }

    const store = await load(providerStoreKey)

    if (store) {
      if (await store.has(newProvider.name)) {
        throw new Error("Provider already exists! Please use a different name.")
      }

      await store.set(newProvider.name, newProvider)
      console.log(`Provider {${newProvider.name}} added successfully!`)
    }
  }

  static async modifyProvider(
    providerName: string,
    updatedProvider: IAIProvider
  ) {
    const store = await load(providerStoreKey)

    if (store) {
      if (!(await store.has(providerName))) {
        throw new Error("Provider not found!")
      }
      await store.set(providerName, updatedProvider)
      console.log(`Provider {${providerName}} updated successfully!`)
    }
  }

  static async deleteProvider(providerName: string) {
    const store = await load(providerStoreKey)

    if (store) {
      if (!(await store.has(providerName))) {
        throw new Error("Provider not found!")
      }
      await store.delete(providerName)
      console.log(`Provider {${providerName}} deleted successfully!`)
    }
  }
}

/** Refer to https://platform.openai.com/docs/api-reference/models/list
 * for more details on the response structure. */
const returnTypeOfListModels = z.object({
  object: z.string(),
  data: z.array(
    z.object({
      id: z.string(),
      object: z.string(),
      created: z.number(),
      owned_by: z.string(),
    })
  ),
})
type TReturnTypeOfListModels = z.infer<typeof returnTypeOfListModels>

export async function listModels({
  baseURL,
  apiKey,
}: Pick<IAIProvider, "baseURL" | "apiKey">): Promise<TReturnTypeOfListModels> {
  const url = `${baseURL}/models`

  console.log("Will call API to list models: ", url)

  try {
    // Use https://v2.tauri.app/plugin/http-client/ tauri fetch to avoid broswer `fetch` CORS issues.
    const response = await tFetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      // AbortSignal didn't work as native `fetch`, -> https://github.com/tauri-apps/plugins-workspace/pull/1395/files
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.statusText}`)
    }

    return await response.json()
  } catch (e) {
    // Catched `e` will be `string` type
    let error: Error
    if (typeof e === "string") {
      error = new Error(e)
      error.name = "TimeoutError"
    } else {
      error = e as Error
    }

    return Promise.reject(error)
  }
}
