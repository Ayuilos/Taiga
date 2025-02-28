import { useCallback, useEffect, useMemo, useState } from "react"
import { t } from "@lingui/core/macro"
import { AlertDialogTrigger } from "@radix-ui/react-alert-dialog"
import { produce } from "immer"

import {
  ChatStore,
  ChatSummaryStore,
  TChatID,
  TChatSummary,
} from "@/lib/chat-store"
import { getRelativeTime } from "@/lib/relative-time"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "./ui/alert-dialog"
import { Badge } from "./ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer"

interface IChatHistory {
  open: boolean
  selectedChatId: TChatID | null
  onSelect: (id: TChatID) => void
  onOpen: (_open: boolean) => void
  onHistoryDelete: () => Promise<void>
}
export function ChatHistory({
  selectedChatId,
  open,
  onOpen,
  onSelect,
  onHistoryDelete,
}: IChatHistory) {
  const [chatSummaries, setChatSummaries] = useState<TChatSummary[]>([])

  const deleteAllChatHistory = async () => {
    await ChatStore.clearAllChats()
    setChatSummaries([])
    await onHistoryDelete()
  }

  const getHistory = useCallback(async () => {
    const _chatSummaries = await ChatSummaryStore.getAllSummaries()

    setChatSummaries(_chatSummaries)
  }, [])

  useEffect(() => {
    if (open) getHistory()
  }, [open, getHistory])

  const titleString = t`Chat History`
  const deleteAllHistoryString = t`Delete all chat history`
  const deleteAllHistoryTitleString = t`Are you sure you want to delete all chat history?`
  const deleteAllHistoryConfirmString = t`Confirm`
  const deleteAllHistoryCancelString = t`Cancel`
  const emptyString = t`No chats found`

  const deleteHistoryBadge = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Badge variant="destructive">{deleteAllHistoryString}</Badge>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>{deleteAllHistoryTitleString}</AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            variant="destructive"
            onClick={deleteAllChatHistory}
          >
            {deleteAllHistoryConfirmString}
          </AlertDialogAction>
          <AlertDialogCancel>{deleteAllHistoryCancelString}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const summaryItems = useMemo(() => {
    const sortedSummaries = produce(chatSummaries, (draft) =>
      draft.sort((a, b) => b.modifiedAt - a.modifiedAt)
    )

    const categoriedSummaries = sortedSummaries.reduce<
      [string, TChatSummary[]][]
    >(
      produce((summaryCategores, currSummary) => {
        const category = summaryCategores[summaryCategores.length - 1]

        const currSummaryModifiedRelativeTime = getRelativeTime(
          new Date(currSummary.modifiedAt)
        )
        if (category && category[0] === currSummaryModifiedRelativeTime) {
          category[1].push(currSummary)
        } else {
          summaryCategores.push([
            currSummaryModifiedRelativeTime,
            [currSummary],
          ])
        }
      }),
      []
    )

    return categoriedSummaries.map(([category, summaries]) => {
      return (
        <CommandGroup key={category} heading={category}>
          {summaries.map((summary) => {
            return (
              <CommandItem
                className="truncate"
                key={summary.id}
                value={summary.id}
              >
                {summary.summary}
              </CommandItem>
            )
          })}
        </CommandGroup>
      )
    })
  }, [chatSummaries])

  const onValueChange = useCallback(
    (value: string) => {
      onSelect(value as TChatID)
      onOpen(false)
    },
    [onSelect, onOpen]
  )

  return (
    <Drawer open={open} onOpenChange={onOpen}>
      <DrawerContent className="flex flex-col min-h-[72vh] overflow-hidden">
        <DrawerHeader>
          <DrawerTitle className="flex justify-between">
            <span>{titleString}</span>
            {chatSummaries.length > 0 && deleteHistoryBadge}
          </DrawerTitle>
          <DrawerDescription></DrawerDescription>
        </DrawerHeader>
        <div className="flex-auto flex flex-col gap-2 px-4 w-full overflow-auto-y">
          {summaryItems.length > 0 ? (
            <Command
              value={selectedChatId || undefined}
              onValueChange={onValueChange}
            >
              <CommandList>
                <CommandEmpty>{emptyString}</CommandEmpty>
                {summaryItems}
              </CommandList>
            </Command>
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
