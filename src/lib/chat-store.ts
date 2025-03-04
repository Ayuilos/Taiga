import { TExpandedMessage } from "@/hooks/useChat"
import { load } from "@tauri-apps/plugin-store"

const chatStoreKey = "chats.json"
const chatSummaryStoreKey = "chat-summaries.json"
const lastChatIdStoreKey = "last-chat-id.json"

export type TChatID = ReturnType<typeof crypto.randomUUID>
export type TChat = {
  id: TChatID
  summary: string
  createdAt: number
  modifiedAt: number
  nodes: TChatNode[]
}
export type TChatNode = {
  message: TExpandedMessage
  children: TChatNode[]
}

export class ChatStore {
  static async createOrUpdateChat({
    id,
    summary,
    editTime,
    nodes,
  }: Pick<TChat, "id" | "summary" | "nodes"> & { editTime: number }) {
    const store = await load(chatStoreKey)

    await ChatSummaryStore.createOrUpdateSummary({
      id,
      editTime,
      summary,
    })
    const chatIns = await store.get<TChat>(id)
    if (chatIns) {
      await store.set(id, {
        ...chatIns,
        summary,
        modifiedAt: editTime,
        nodes,
      })
    } else {
      await store.set(id, {
        id,
        createdAt: editTime,
        modifiedAt: editTime,
        summary,
        nodes,
      })
    }
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
  createdAt: number
  modifiedAt: number
}
export class ChatSummaryStore {
  static async createOrUpdateSummary({
    id,
    editTime,
    summary,
  }: Pick<TChatSummary, "id" | "summary"> & { editTime: number }) {
    const store = await load(chatSummaryStoreKey)

    const summaryIns = await store.get(id)
    if (summaryIns) {
      await store.set(id, {
        ...summaryIns,
        summary,
        modifiedAt: editTime,
      })
    } else {
      await store.set(id, {
        id,
        createdAt: editTime,
        modifiedAt: editTime,
        summary,
      })
    }
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

export class LastChatIDStore {
  static async getLastChatID() {
    const store = await load(lastChatIdStoreKey)
    const lastChatID = await store.get("lastChatID")

    return lastChatID as TChatID
  }

  static async setLastChatID(id: TChatID) {
    const store = await load(lastChatIdStoreKey)
    await store.set("lastChatID", id)
  }
}