import { useCallback, useRef } from "react"
import { TExpandedMessage } from "@/hooks/useChat"
import { t } from "@lingui/core/macro"
import dayjs from "dayjs"
import { Copy, Pen, RefreshCw } from "lucide-react"
import Markdown from "react-markdown"
import { toast } from "sonner"

import ReasoningDisplay from "./ReasoningDisplay"
import { RelativeTime } from "./RelativeTime"
import { SimplePagination } from "./SimplePagination"
import ToolCallDisplay from "./ToolCallDisplay"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Badge } from "./ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./ui/context-menu"

export interface IChatMessage {
  message: TExpandedMessage & { currentIndex?: number; all?: number }
  isReasoning: boolean
  isCallingTool: boolean
  onEdit?: () => void
  onChange: (index: number) => void
}
export function ChatMessage({
  message,
  isReasoning,
  isCallingTool,
  onEdit,
  onChange,
}: IChatMessage) {
  const copyToClipboard = useCallback(async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(message.content!)
    } else {
      toast.error(t`Failed to copy to clipboard`)
    }
  }, [message.content])
  const messageRef = useRef<HTMLDivElement>(null)

  // TODO: find a reasonable solution
  // const startSelection = useCallback(() => {
  //   if (messageRef.current) {
  //     const selection = window.getSelection()
  //     if (selection) {
  //       const range = document.createRange()
  //       messageRef.current.style.userSelect = "text"
  //       range.selectNodeContents(messageRef.current)
  //       selection.removeAllRanges()
  //       selection.addRange(range)
  //     }
  //   }
  // }, [])

  const date = message.endedAt || message.createdAt
  const reasoningButtonStrings = [t`Is reasoning...`, t`Reasoning process`]
  const reasoningDialogDescString = t`You're using reasoning model!`
  const callingToolButtonStrings = [t`Is calling tool...`, t`Tool-Call Result`]
  const callingToolDescStrings = [t`Used Tool`, t`Args Input by Model`]
  const callingToolWaitingString = t`Waiting...`
  const stepOverString = t`Step End`
  const stepSpendTimeString = t`Spend Time`
  const errorMessageString = t`Error Happen`
  const editMessageString =
    message.role === "user"
      ? [<Pen />, t`Edit message`]
      : message.role === "assistant"
        ? [<RefreshCw />, t`Regenerate reply`]
        : null
  const copyString = [<Copy />, t`Copy`]

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`flex flex-col max-w-[88%] gap-1 select-none ${
            message.role === "user"
              ? "self-end items-end"
              : "self-start items-start"
          }`}
        >
          {message.all && message.all > 1 ? (
            <SimplePagination
              page={message.currentIndex! + 1}
              totalPages={message.all}
              setPage={(page) => onChange(page - 1)}
            />
          ) : null}
          {message.modelName ? (
            <Badge variant="outline">{message.modelName}</Badge>
          ) : null}
          <div
            className={`${
              message.role === "user"
                ? "bg-blue-500 text-white"
                : "border bg-gray-50 text-black"
            } flex flex-col gap-2 p-2 whitespace-pre-wrap break-words hyphens-auto rounded-lg max-w-full`}
          >
            {message.parts?.map((p, i) => {
              switch (p.type) {
                case "reasoning":
                  const reasoningButtonString = isReasoning
                    ? reasoningButtonStrings[0]
                    : reasoningButtonStrings[1]

                  return (
                    <div key={i} className="order-1">
                      <ReasoningDisplay
                        isReasoning={isReasoning}
                        buttonContent={reasoningButtonString}
                        reasoningText={p.reasoning}
                        title={reasoningButtonString}
                        description={reasoningDialogDescString}
                      />
                    </div>
                  )

                case "text":
                  return (
                    <div ref={messageRef} key={i} className="order-2">
                      <Markdown>{p.text || "..."}</Markdown>
                    </div>
                  )
                case "tool-invocation": {
                  const isCalling =
                    isCallingTool && p.toolInvocation.state !== "result"
                  const toolCallingButtonString = isCalling
                    ? callingToolButtonStrings[0]
                    : callingToolButtonStrings[1]
                  const { toolName, args } = p.toolInvocation

                  const argsDisplay = Object.entries(args).map(
                    ([key, value]) => (
                      <Badge key={key} variant="outline">
                        <span className="text-left whitespace-pre-wrap">
                          {key}: {JSON.stringify(value)}
                        </span>
                      </Badge>
                    )
                  )

                  const description = (
                    <div className="flex flex-col gap-1 border rounded-md p-2">
                      <div className="flex items-center gap-1">
                        {callingToolDescStrings[0]}
                        <Badge variant="secondary">{toolName}</Badge>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <div>{callingToolDescStrings[1]}</div>
                        <div className="flex gap-1 flex-wrap">
                          {argsDisplay.length > 0 ? (
                            argsDisplay
                          ) : (
                            <Badge variant="outline">None</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )

                  return (
                    <div key={i} className="order-2">
                      <ToolCallDisplay
                        isCalling={isCalling}
                        buttonContent={toolCallingButtonString}
                        toolCallResult={
                          p.toolInvocation.state === "result"
                            ? p.toolInvocation.result
                            : callingToolWaitingString
                        }
                        title={toolCallingButtonString}
                        description={description}
                      />
                    </div>
                  )
                }
                case "flag": {
                  const spendTime = dayjs(p.endedAt).diff(p.createdAt, "second")

                  return (
                    <div
                      key={i}
                      className="order-2 rounded-md p-1 flex gap-2 items-center justify-between last:hidden bg-gray-200"
                    >
                      <Badge>{stepOverString}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>
                          {stepSpendTimeString}: {spendTime}s
                        </span>
                        <span>
                          {p.tokenUsage.promptTokens}↑{" "}
                          {p.tokenUsage.completionTokens}↓
                        </span>
                      </div>
                    </div>
                  )
                }
                case "error": {
                  const { error } = p

                  return (
                    <Alert className="bg-red-200 text-red-500 border-none order-2">
                      <AlertTitle>{errorMessageString}</AlertTitle>
                      <AlertDescription className="overflow-auto">{`(${error.name}) / ${error.message}`}</AlertDescription>
                    </Alert>
                  )
                }
                default:
                  return null
              }
            })}
          </div>
          <span
            className={`inline-flex gap-2 text-xs text-gray-400 ${message.role === "user" ? "self-end" : "self-start"}`}
          >
            {date ? <RelativeTime date={date} /> : null}
            {message.tokenUsage ? (
              <span>
                {message.tokenUsage.promptTokens}↑{" "}
                {message.tokenUsage.completionTokens}↓
              </span>
            ) : null}
          </span>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onEdit ? (
          <ContextMenuItem className="flex items-center gap-2" onClick={onEdit}>
            {editMessageString}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem
          className="flex items-center gap-2"
          onClick={copyToClipboard}
        >
          {copyString}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
