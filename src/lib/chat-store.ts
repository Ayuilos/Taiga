import { TExpandedMessage } from "@/hooks/useChat"
import { load } from "@tauri-apps/plugin-store"
import { stringifyObject } from "./utils"

const chatStoreKey = "chats.json"
const chatSummaryStoreKey = "chat-summaries.json"

export type TChatID = ReturnType<typeof crypto.randomUUID>
export type TChat = {
  id: TChatID
  summary: string
  nodes: TChatNode[]
}
export type TChatNode = {
  message: TExpandedMessage
  children: TChatNode[]
}

export class ChatStore {
  static async createOrUpdateChat({ id, summary, nodes }: TChat) {
    const store = await load(chatStoreKey)
    
    await ChatSummaryStore.createOrUpdateSummary({ id, summary })
    await store.set(id, { id, summary, nodes })
  }

  static async getChat(id: string) {
    const store = await load(chatStoreKey)
    const chat = await store.get(id)
    if (!chat) {
      throw new Error(`Chat with id ${id} not found`)
    }
    console.log(stringifyObject(chat))
    return chat as TChat
  }

  static async deleteChat(id: string) {
    const store = await load(chatStoreKey)
    if (await store.has(id)) {
      await ChatSummaryStore.deleteSummary(id)
      await store.delete(id)
    } else {
      throw new Error(`Chat with id ${id} not found`)
    }
  }

  static async clearAllChats() {
    const store = await load(chatStoreKey)
    await store.clear()
    await ChatSummaryStore.clearAllSummaries()
  }
}

export type TChatSummary = {
  id: TChatID
  summary: string
}
export class ChatSummaryStore {
  static async createOrUpdateSummary({ id, summary }: TChatSummary) {
    const store = await load(chatSummaryStoreKey)
    await store.set(id, { id, summary })
  }

  static async getSummary(id: string) {
    const store = await load(chatSummaryStoreKey)
    const summary = await store.get(id)
    if (!summary) {
      throw new Error(`Summary for chat with id ${id} not found`)
    }
    return summary as TChatSummary
  }

  static async getAllSummaries() {
    const store = await load(chatSummaryStoreKey)
    const summaries = await store.values()
    return summaries as TChatSummary[]
  }

  static async deleteSummary(id: string) {
    const store = await load(chatSummaryStoreKey)
    if (await store.has(id)) {
      await store.delete(id)
    } else {
      throw new Error(`Summary for chat with id ${id} not found`)
    }
  }

  static async clearAllSummaries() {
    const store = await load(chatSummaryStoreKey)
    await store.clear()
  }
}
