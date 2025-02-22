import { TExpandedMessage } from "@/hooks/useChat"
import { load } from "@tauri-apps/plugin-store"

const chatStoreKey = "chats.json"

export type TChatID = ReturnType<typeof crypto.randomUUID>
export type TChat = {
  id: TChatID
  summary: string
  messages: Partial<TExpandedMessage>[]
}

export class ChatStore {
  static async createOrUpdateChat({ id, summary, messages }: TChat) {
    const store = await load(chatStoreKey)
    await store.set(id, { id, summary, messages })
  }

  static async getChat(id: string) {
    const store = await load(chatStoreKey)
    const chat = await store.get(id)
    if (!chat) {
      throw new Error(`Chat with id ${id} not found`)
    }
    return chat as TChat
  }

  static async deleteChat(id: string) {
    const store = await load(chatStoreKey)
    if (await store.has(id)) {
      await store.delete(id)
    } else {
      throw new Error(`Chat with id ${id} not found`)
    }
  }
}

export type TChatSummary = {
  id: TChatID
  summary: string
}
export class ChatSummaryStore {
  static async createOrUpdateSummary({ id, summary }: TChatSummary) {
    const store = await load(chatStoreKey)
    await store.set(id, { id, summary })
  }

  static async getSummary(id: string) {
    const store = await load(chatStoreKey)
    const summary = await store.get(id)
    if (!summary) {
      throw new Error(`Summary for chat with id ${id} not found`)
    }
    return summary as TChatSummary
  }

  static async getAllSummaries() {
    const store = await load(chatStoreKey)
    const summaries = await store.values()
    return summaries as TChatSummary[]
  }

  static async deleteSummary(id: string) {
    const store = await load(chatStoreKey)
    if (await store.has(id)) {
      await store.delete(id)
    } else {
      throw new Error(`Summary for chat with id ${id} not found`)
    }
  }
}
