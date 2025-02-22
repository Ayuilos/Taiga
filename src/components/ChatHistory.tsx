import { ChatSummaryStore, TChatID, TChatSummary } from "@/lib/chat-store"
import { useCallback, useEffect, useState } from "react"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer"
import { Button } from "./ui/button"
import { t } from "@lingui/core/macro"

interface IChatHistory {
  open: boolean
  selectedChatId: TChatID | null
  onSelect: (id: TChatID) => void
  onOpen: (_open: boolean) => void
}
export function ChatHistory({
  selectedChatId,
  open,
  onOpen,
  onSelect,
}: IChatHistory) {
  const [chatSummaries, setChatSummaries] = useState<TChatSummary[]>([])

  const getHistory = useCallback(async () => {
    const _chatSummaries = await ChatSummaryStore.getAllSummaries()

    setChatSummaries(_chatSummaries)
  }, [])

  useEffect(() => {
    if (open) getHistory()
  }, [open, getHistory])

  const titleString = t`Chat History`
  const descriptionString = t`[TODO: Support Delete]`
  const emptyString = t`No chats found`

  return (
    <Drawer open={open} onOpenChange={onOpen}>
      <DrawerContent className="flex flex-col min-h-[72vh] overflow-hidden">
        <DrawerHeader>
          <DrawerTitle>{titleString}</DrawerTitle>
          <DrawerDescription>{descriptionString}</DrawerDescription>
        </DrawerHeader>
        <div className="flex-auto flex flex-col gap-2 px-4 w-full overflow-auto-y">
          {chatSummaries.length ? (
            chatSummaries.map((chatSummary) => (
              <Button
                variant="outline"
                className={`${selectedChatId === chatSummary.id ? " border-accent-foreground order-1" : "order-2"}`}
                key={chatSummary.id}
                onClick={() => {
                  onSelect(chatSummary.id)
                  onOpen(false)
                }}
              >
                <span className="truncate px-2 overflow-hidden">
                  {chatSummary.summary}
                </span>
              </Button>
            ))
          ) : (
            <div className="flex-auto flex items-center justify-center text-gray-500 text-sm">
              {emptyString}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
