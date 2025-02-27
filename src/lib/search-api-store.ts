import { load } from "@tauri-apps/plugin-store"
import { z } from "zod"

const searchAPIStoreKey = "search-api-store.json"

export const SearchApiSchema = z.object({
  name: z.string().min(1),
  apiKey: z.string(),
  searchURL: z.string().url(),
})

export type TBaseSearchAPI = z.infer<typeof SearchApiSchema>
export type TJinaSearchAPI = TBaseSearchAPI & {
  name: "jina"
}

export class SearchApiStore {
  static async getSearchApi(name: string) {
    const store = await load(searchAPIStoreKey)
    return store.get<TBaseSearchAPI>(name)
  }

  static async getAllSearchApis() {
    const store = await load(searchAPIStoreKey)

    return store.values<TBaseSearchAPI>()
  }

  static async setSearchApi(api: TBaseSearchAPI) {
    const store = await load(searchAPIStoreKey)
    await store.set(api.name, api)
  }
}
