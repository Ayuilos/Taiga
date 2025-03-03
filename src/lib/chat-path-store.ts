import { load } from "@tauri-apps/plugin-store"

const chatPathStoreKey = "chat-path-store.json"

export class ChatPathStore {
  static async getChatPath(id: string) {
    const store = await load(chatPathStoreKey)
    const chatPath = await store.get(id)
    if (!chatPath) {
      throw new Error(`Chat path for chat with id ${id} not found`)
    }
    return chatPath as number[]
  }

  static async setChatPath(id: string, chatPath: number[]) {
    const store = await load(chatPathStoreKey)
    await store.set(id, chatPath)
  }
}
