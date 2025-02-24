import { load } from "@tauri-apps/plugin-store"

const defaultModelStoreKey = "default-model.json"

export type TDefaultModel = [string, string] | null
export type TDefaultModels = Record<
  "translate" | "chat" | "summarize",
  TDefaultModel
>

export class DefaultModelStore {
  static async getDefaultModels() {
    const store = await load(defaultModelStoreKey)
    const models: TDefaultModels = {
      translate: null,
      chat: null,
      summarize: null,
    }
    const saveddefaultModels = (await store.entries<TDefaultModel>()) as [
      keyof TDefaultModels,
      TDefaultModel,
    ][]

    for (const [key, value] of saveddefaultModels) {
      models[key] = value
    }

    return models
  }

  static async setDefaultModel(type: keyof TDefaultModels, model: TDefaultModel) {
    const store = await load(defaultModelStoreKey)
    await store.set(type, model)
  }
}
