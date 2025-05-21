import { useCallback, useMemo, useRef } from "react"
import { TExpandedMessage } from "@/hooks/useChat"
import { t } from "@lingui/core/macro"
import { openUrl } from "@tauri-apps/plugin-opener"
import dayjs from "dayjs"
import { Copy, Pen, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Markdown } from "./Markdown"
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
  isChatting: boolean
  isReasoning: boolean
  isCallingTool: boolean
  onEdit?: () => void
  onChange: (index: number) => void
}
export function ChatMessage({
  message,
  isChatting,
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

  const [inBox, citations] = useMemo(() => {
    const reasoningButtonStrings = [t`Is reasoning...`, t`Reasoning process`]
    const reasoningDialogDescString = t`You're using reasoning model!`
    const callingToolButtonStrings = [
      t`Is calling tool...`,
      t`Tool-Call Result`,
    ]
    const callingToolDescStrings = [t`Used Tool`, t`Args Input by Model`]
    const callingToolWaitingString = t`Waiting...`
    const stepOverString = t`Step End`
    const stepSpendTimeString = t`Spend Time`
    const errorMessageString = t`Error Happen`

    let _inBox: any[] = [],
      _citations: any[] = []

    message.parts?.forEach((p, i) => {
      switch (p.type) {
        case "reasoning":
          const reasoningButtonString = isReasoning
            ? reasoningButtonStrings[0]
            : reasoningButtonStrings[1]

          _inBox.push(
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
          break

        case "text":
          _inBox.push(
            <div ref={messageRef} key={i} className="order-2">
              <Markdown>{p.text}</Markdown>
            </div>
          )
          break
        case "tool-invocation": {
          const isCalling = isCallingTool && p.toolInvocation.state !== "result"
          const toolCallingButtonString = isCalling
            ? callingToolButtonStrings[0]
            : callingToolButtonStrings[1]
          const { toolName, args } = p.toolInvocation

          const argsDisplay = Object.entries(args).map(([key, value]) => (
            <Badge key={key} variant="outline">
              <span className="text-left whitespace-pre-wrap">
                {key}: {JSON.stringify(value)}
              </span>
            </Badge>
          ))

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

          _inBox.push(
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
          break
        }
        case "flag": {
          const spendTime = dayjs(p.endedAt).diff(p.createdAt, "second")

          _inBox.push(
            <div
              key={i}
              className="order-2 rounded-md p-1 flex gap-2 items-center justify-between last:hidden bg-accent"
            >
              <Badge>{stepOverString}</Badge>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>
                  {stepSpendTimeString}: {spendTime}s
                </span>
                <span>
                  {p.tokenUsage.promptTokens}↑ {p.tokenUsage.completionTokens}↓
                </span>
              </div>
            </div>
          )
          break
        }
        case "source": {
          const sourceTitle = p.source.title || new URL(p.source.url).hostname
          const len = _citations.length

          _citations.push(
            <div
              key={i}
              className="flex flex-col gap-1 min-w-40 max-w-60 border rounded-md p-1 overflow-hidden"
              onClick={() => {
                openUrl(p.source.url)
              }}
            >
              <span className="overflow-ellipsis overflow-hidden">
                {`[${len + 1}]`}{sourceTitle}
              </span>
              <span className="text-xs max-w-full overflow-ellipsis overflow-hidden">
                {p.source.url}
              </span>
            </div>
          )
          break
        }
        case "error": {
          const { error } = p

          _inBox.push(
            <Alert className="bg-red-200 text-red-500 border-none order-2">
              <AlertTitle>{errorMessageString}</AlertTitle>
              <AlertDescription className="overflow-auto">{`(${error.name}) / ${error.message}`}</AlertDescription>
            </Alert>
          )
          break
        }
        default:
          return null
      }
    })

    return [_inBox, _citations]
  }, [isCallingTool, isReasoning, message.parts])

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
  const editMessageString =
    message.role === "user"
      ? [<Pen />, t`Edit message`]
      : message.role === "assistant"
        ? [<RefreshCw />, t`Regenerate reply`]
        : null
  const copyString = [<Copy />, t`Copy`]
  const citationString = t`Citations`

  const loadingComp = isChatting ? (
    <div className="flex text-2xl items-center gap-1 order-3">
      {"...".split("").map((dot, i) => (
        <span
          key={i}
          style={{
            animationDelay: `${i * 216}ms`,
            transitionDelay: `${i * 216}ms`,
          }}
          className="animate-bounce"
        >
          {dot}
        </span>
      ))}
    </div>
  ) : null

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
                : "border bg-background text-foreground"
            } flex flex-col gap-2 p-2 hyphens-auto rounded-lg max-w-full`}
          >
            {loadingComp}
            {inBox}
          </div>

          {citations.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {citationString}: {citations.length}
            </span>
          ) : null}
          <div className="overflow-auto w-full">
            <div className="flex gap-1">{citations}</div>
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
