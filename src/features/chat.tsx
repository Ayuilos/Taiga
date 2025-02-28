import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { TExpandedMessage, useChat } from "@/hooks/useChat"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { t } from "@lingui/core/macro"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { useRouter } from "@tanstack/react-router"
import { CoreMessage, generateText, LanguageModelV1 } from "ai"
import dayjs from "dayjs"
import { produce } from "immer"
import {
  Check,
  Copy,
  Globe,
  History,
  MessageSquarePlus,
  Pen,
  RefreshCw,
  SendHorizonal,
  Sparkle,
  StopCircle,
  Trash,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  ChatStore,
  ChatSummaryStore,
  TChatID,
  TChatNode,
} from "@/lib/chat-store"
import { sameArrays } from "@/lib/utils"
import { AIProviderContext } from "@/components/AIProvidersContext"
import { ChatHistory } from "@/components/ChatHistory"
import { ErrorsToastText } from "@/components/ErrorsToastText"
import { Markdown } from "@/components/Markdown"
import {
  ModelSelectorContext,
  TModelSelectorContext,
} from "@/components/ModelSelectorContext"
import ReasoningDisplay from "@/components/ReasoningDisplay"
import { RelativeTime } from "@/components/RelativeTime"
import {
  ScrollToBottom,
  SHOULD_RENDER_SCROLL_TO_BOTTOM_HEIGHT,
} from "@/components/ScrollToBottom"
import { SimplePagination } from "@/components/SimplePagination"
import ToolCallDisplay from "@/components/ToolCallDisplay"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"

interface IInternalChat {
  model: LanguageModelV1 | null
  summarizeModel: LanguageModelV1 | null
  requireModel: TModelSelectorContext["requireModel"]
}

const initialChatNodes: TChatNode[] = [
  {
    children: [],
    message: {
      role: "system",
      content: `You're a friendly assistant, ready to help user solve any of their problem. If necessary, you can use the provided tools to help user.`,
    },
  },
]

function InternalChat({ model, summarizeModel, requireModel }: IInternalChat) {
  const router = useRouter()
  const [chatNodes, setChatNodes] = useState<TChatNode[]>(initialChatNodes)
  // `chatPath` for rendering chat flow
  const [chatPath, setChatPath] = useState<number[]>([0])
  // `sessionPath` for tracing actual chat data when `startChat`
  const sessionPath = useRef<number[]>([])
  const [input, setInput] = useState<string>("")
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [id, setChatId] = useState(crypto.randomUUID())
  const [editedNodePath, setEditedNodePath] = useState<number[] | null>(null)

  const [openSearch, setOpenSearch] = useState(false)
  const [openCommonTools, setOpenCommonTools] = useState(false)

  const [showSearchApiSetPopover, setShowSearchApiSetPopover] = useState(false)

  const prevInputRef = useRef<string>("")

  const messages = useMemo(() => {
    let _messages: IMessage["message"][] = []
    let node: TChatNode | undefined
    let nodes = chatNodes

    for (let index of chatPath) {
      node = nodes[index]
      if (node) {
        _messages.push({
          ...node.message,
          currentIndex: index,
          all: nodes.length,
        })
        nodes = node.children
      }
    }

    return _messages
  }, [chatNodes, chatPath])

  const {
    isChatting,
    isReasoning,
    isCallingTool,
    result,
    searchApiIsSet,
    startChat,
    cancelChat,
    clearChat,
  } = useChat({
    model,
    requireModel,
    onError: (error) => {
      switch (error.name) {
        case "AbortError":
          toast.info(t`Chat stopped by user`)
          break
        case "TimeoutError":
          toast.error(ErrorsToastText[error.name])
          break
        default:
          console.log(`(${error.name}):${error.message}`)
          toast.error(`${ErrorsToastText["unknown"]}: ${error.message}`)
          break
      }
    },
    options: {
      allowCommonTools: openCommonTools,
      allowSearch: openSearch,
    },
  })

  const messagesRef = useRef<HTMLDivElement>(null)

  const newMessageCreated = result.createdAt

  const chatIsFresh = useMemo(
    () => newMessageCreated === undefined && messages.length <= 1,
    [newMessageCreated, messages.length]
  )

  const updateChatNodes = useCallback(
    (
      newMessage: TExpandedMessage | null,
      toUpdatePath = chatPath,
      updateChatPath: boolean = true
    ) => {
      let newIndex = 0

      if (newMessage) {
        // Can not use callback in `setChatNodes`, because there's effect in the function
        const newChatNodes = produce(chatNodes, (draft) => {
          let toUpdateNode: TChatNode | undefined
          let nodes = draft

          for (let index of toUpdatePath) {
            // @ts-ignore
            toUpdateNode = nodes[index]
            // @ts-ignore
            if (toUpdateNode) {
              nodes = toUpdateNode.children
            }
          }

          // this is the effect, if put this logic as a function to `setChatNodes`
          // this function excution will be delayed, so the `newIndex` may always be `0`
          // when we calculate `newPath`
          newIndex = toUpdateNode!.children.length

          toUpdateNode!.children.push({
            message: newMessage,
            children: [],
          })

          return draft
        })

        setChatNodes(newChatNodes)
      }

      const newPath = newMessage ? [...toUpdatePath, newIndex] : toUpdatePath
      if (updateChatPath) {
        setChatPath(newPath)
      }
      sessionPath.current = newPath
    },
    [chatPath, chatNodes]
  )

  const prevIsChatting = useRef(isChatting)
  if (prevIsChatting.current && !isChatting) {
    // If chat is over, update `chatNodes`
    // Use `sessionPath` to make sure the `result` is saved in correct ChatNode
    updateChatNodes(
      result,
      sessionPath.current,
      sameArrays(sessionPath.current, chatPath)
    )
  }
  prevIsChatting.current = isChatting

  const _createChatSummary = useCallback(async () => {
    const toSummarizeModel = summarizeModel || model
    if (toSummarizeModel) {
      const chatContent = messages
        .map((message) => `${message.role}: ${message.content}`)
        .concat([`${result.role}: ${result.content}`])
        .join("\n")

      let summaryText = t`Failed to summarize`
      try {
        const { text } = await generateText({
          model: toSummarizeModel,
          system: `You're good at summarizing, summarize the content provided by user in 10 words directly, don't add extra words`,
          prompt: chatContent,
          abortSignal: AbortSignal.timeout(10_000),
        })
        summaryText = text
      } catch (error) {
        try {
          const oldSummary = await ChatSummaryStore.getSummary(id)
          summaryText = oldSummary.summary
        } catch (e) {}
      }

      await ChatSummaryStore.createOrUpdateSummary({
        id,
        editTime: Date.now(),
        summary: summaryText,
      })

      return summaryText
    }
  }, [id, model, summarizeModel, result, messages])

  const saveChatHistory = useCallback(async () => {
    if (newMessageCreated) {
      let summary: string
      summary = (await _createChatSummary())!

      await ChatStore.createOrUpdateChat({ id, nodes: chatNodes, editTime: Date.now(), summary })
    }
  }, [id, chatNodes, newMessageCreated, _createChatSummary])

  const _resetSearchPath = useCallback(
    (nodes: TChatNode[], startPath: number[] = []) => {
      let _chatPath: number[] = []
      let pointer = 0
      // Parse default `chatPath` from `chatNodes`
      function _parseDefaultChatPath(nodes: TChatNode[]) {
        const index = startPath[pointer] || 0
        let node = nodes[index]
        pointer++

        if (node) {
          _chatPath.push(index)
          _parseDefaultChatPath(node.children)
        }
      }

      _parseDefaultChatPath(nodes)

      return _chatPath
    },
    []
  )

  const onHistoryChatSelect = useCallback(
    async (_id: TChatID) => {
      if (_id !== id) {
        const { nodes: newChatNodes } = await ChatStore.getChat(_id)

        setChatId(_id)
        setInput("")
        setChatNodes(newChatNodes)
        clearChat()

        let _chatPath: number[] = _resetSearchPath(newChatNodes)

        setChatPath(_chatPath)
        sessionPath.current = _chatPath
      }
    },
    [id, clearChat, _resetSearchPath]
  )

  const startEditMessage = useCallback(
    async (messagePath: number[]) => {
      let targetNode
      let nodes = chatNodes

      for (let index of messagePath) {
        // @ts-ignore
        targetNode = nodes[index]
        // @ts-ignore
        if (targetNode) {
          nodes = targetNode.children
        }
      }

      if (targetNode) {
        // NOTE: Edit means add a new node which will have the same parent node with the target node
        // this is why we need to slice `messagePath`
        setEditedNodePath(messagePath.slice(0, -1))
        prevInputRef.current = input
        setInput(targetNode.message.content!)
      }
    },
    [chatNodes, input]
  )

  const cancelEdit = useCallback(() => {
    setEditedNodePath(null)
    setInput(prevInputRef.current)
  }, [])

  const reGenerateReply = useCallback(
    async (regenerateNodePath: number[]) => {
      if (model) {
        updateChatNodes(null, regenerateNodePath)

        const keepedMessages = messages.slice(0, regenerateNodePath.length)

        startChat({
          messages: keepedMessages.map((message) => {
            return {
              role: message.role,
              content: message.content,
            } as CoreMessage
          }),
        })
      } else {
        requireModel()
      }
    },
    [messages, model, requireModel, startChat, updateChatNodes]
  )

  const editMessage = useCallback(async () => {
    if (model) {
      const newMessage = {
        role: "user",
        content: input,
        createdAt: Date.now(),
        parts: [{ type: "text", text: input }],
      } as TExpandedMessage

      updateChatNodes(newMessage, editedNodePath!)
      setInput(prevInputRef.current)
      setEditedNodePath(null)

      const keepedMessages = messages.slice(0, editedNodePath!.length)

      startChat({
        messages: [...keepedMessages, newMessage].map((message) => {
          return {
            role: message.role,
            content: message.content,
          } as CoreMessage
        }),
      })
    } else {
      requireModel()
    }
  }, [
    editedNodePath,
    input,
    messages,
    model,
    requireModel,
    startChat,
    updateChatNodes,
  ])

  const sendMessage = useCallback(async () => {
    if (model) {
      const newMessage = {
        role: "user",
        content: input,
        createdAt: Date.now(),
        parts: [{ type: "text", text: input }],
      } as TExpandedMessage
      updateChatNodes(newMessage)
      setInput("")

      startChat({
        messages: [...messages, newMessage].map((message) => {
          return {
            role: message.role,
            content: message.content,
          } as CoreMessage
        }),
      })
    } else {
      requireModel()
    }
  }, [model, messages, input, startChat, requireModel, updateChatNodes])

  const _startNewChat = useCallback(() => {
    setChatNodes(initialChatNodes)
    setChatId(crypto.randomUUID())
    setChatPath([0])
    sessionPath.current = [0]
    setInput("")
    prevInputRef.current = ""
    clearChat()
  }, [clearChat])

  const startNewChat = useCallback(() => {
    if (!chatIsFresh) {
      _startNewChat()
    }
  }, [_startNewChat, chatIsFresh])

  const deleteChat = useCallback(async () => {
    if (id) {
      await ChatStore.deleteChat(id)
      _startNewChat()
    }
  }, [id, _startNewChat])

  const onHistoryDelete = useCallback(async () => {
    _startNewChat()
  }, [_startNewChat])

  const onSearchButtonClick = useCallback(async () => {
    if (openSearch) {
      setOpenSearch(false)
    } else {
      if (!searchApiIsSet) {
        console.log("not set")
        setShowSearchApiSetPopover(true)
      } else {
        setOpenSearch(true)
      }
    }
  }, [searchApiIsSet, openSearch])

  useEffect(() => {
    if (messagesRef.current) {
      const element = messagesRef.current

      const scrollListener = () => {
        const difference = Math.abs(
          element.scrollHeight - element.scrollTop - element.clientHeight
        )
        setShouldAutoScroll(difference < SHOULD_RENDER_SCROLL_TO_BOTTOM_HEIGHT)
      }
      element.addEventListener("scrollend", scrollListener)

      return () => {
        element.removeEventListener("scrollend", scrollListener)
      }
    }
  }, [])

  useEffect(() => {
    saveChatHistory()
  }, [saveChatHistory])

  useLayoutEffect(() => {
    if (messagesRef.current && shouldAutoScroll) {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight - messagesRef.current.clientHeight
    }
  }, [result, shouldAutoScroll])

  const deleteChatTitleString = t`Are you sure to delete this chat?`
  const deleteChatConfirmString = t`Delete`
  const deleteChatCancelString = t`Cancel`
  const jumpToSearchApiSetPageString = t`Your search api is not set`
  const jumpToSearchApiSetPageButtonString = t`Set now`
  const textareaPlaceholder = t`What can I help you?`

  const openSearchButton = (
    <Popover
      open={showSearchApiSetPopover}
      onOpenChange={setShowSearchApiSetPopover}
    >
      <PopoverAnchor asChild>
        <Button
          className={`flex items-center gap-1 transition-all border-none rounded-full${openSearch ? " bg-blue-500 text-white" : " bg-blue-200/60"}`}
          size="icon"
          variant={openSearch ? "default" : "outline"}
          onClick={onSearchButtonClick}
        >
          <Globe />
        </Button>
      </PopoverAnchor>
      <PopoverContent
        className="flex flex-col gap-2 w-64"
        side="top"
        sideOffset={12}
        align="start"
      >
        <p>{jumpToSearchApiSetPageString}</p>
        <Button
          variant="secondary"
          onClick={() => {
            router.navigate({
              to: "/settings/manage-search-apis",
            })
          }}
        >
          {jumpToSearchApiSetPageButtonString} →
        </Button>
      </PopoverContent>
    </Popover>
  )

  const openCommonToolsButton = (
    <Button
      className={`flex items-center gap-1 transition-all border-none rounded-full${openCommonTools ? " bg-blue-500 text-white" : " bg-blue-200/60"}`}
      size="icon"
      variant={openCommonTools ? "default" : "outline"}
      onClick={() => setOpenCommonTools((o) => !o)}
    >
      <Sparkle fill="currentColor" fillOpacity={openCommonTools ? 100 : 0} />
    </Button>
  )

  // [TODO] Need a UX, check if jina apiKey is set, if not show a dialog or what to let user redirect to search apiKey set page
  const toolArea = (
    <div className="flex items-center gap-1 p-1 bg-blue-100/40 rounded-full">
      {openSearchButton}
      {openCommonToolsButton}
    </div>
  )

  const deleteChatButton = !chatIsFresh ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="border-red-500 text-red-500"
          size="icon"
          variant="outline"
        >
          <Trash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{deleteChatTitleString}</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{deleteChatCancelString}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={deleteChat}>
            {deleteChatConfirmString}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null

  return (
    <>
      <div className="w-[94%] self-center flex-auto flex flex-col items-center justify-end gap-4 max-h-screen select-none">
        <div className="w-full relative flex-auto flex flex-col overflow-hidden">
          <div
            ref={messagesRef}
            className="w-full pt-20 flex-auto flex flex-col gap-4 overflow-y-auto"
          >
            {/* Use this flex-auto div to make message show at the bottom.
             * This is a trick, as `justify-end` will cause overflow-auto invalid for unknown reason.
             * Refer to https://stackoverflow.com/a/37515194 */}
            <div className="flex-auto"></div>

            {(isChatting && sameArrays(chatPath, sessionPath.current)
              ? messages.concat(result)
              : messages
            )
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((message, index) => {
                const isLastReasoning =
                  isReasoning && index === messages.length - 1
                // chatPath [0] -> systemRoleNode, chatPath [0, 0] -> userRoleNode
                // index = 0 -> userRoleNode -> chatPathLength = 2
                // index + 2 = chatPathLength
                const toEditNodePath = chatPath.slice(0, index + 2)
                const parentNodePath = toEditNodePath.slice(0, -1)

                return (
                  <Message
                    key={message.id || index}
                    message={message}
                    isReasoning={isLastReasoning}
                    isCallingTool={isCallingTool}
                    onEdit={
                      message.role === "user"
                        ? () => {
                            startEditMessage(toEditNodePath)
                          }
                        : message.role === "assistant"
                          ? () => {
                              reGenerateReply(parentNodePath)
                            }
                          : undefined
                    }
                    onChange={(idx: number) => {
                      setChatPath(
                        _resetSearchPath(chatNodes, [...parentNodePath, idx])
                      )
                    }}
                  />
                )
              })}
          </div>
          <ScrollToBottom
            observedRef={messagesRef}
            onClick={() => setShouldAutoScroll(true)}
          />
        </div>
        {/** Input Section */}
        <div className="relative shrink-0 pb-4 w-full">
          <Textarea
            className="w-full resize-none pb-20"
            placeholder={textareaPlaceholder}
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <div className="absolute bottom-4 flex justify-between items-center w-full p-2">
            <div className="flex-auto flex gap-2 items-center">
              {editedNodePath ? (
                <Button size="icon" variant="outline" onClick={cancelEdit}>
                  <X />
                </Button>
              ) : (
                <>
                  {toolArea}
                  <Button size="icon" variant="outline" onClick={startNewChat}>
                    <MessageSquarePlus />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      setShowChatHistory(true)
                    }}
                  >
                    <History />
                  </Button>
                  {deleteChatButton}
                </>
              )}
            </div>
            <div>
              <Button
                size="icon"
                variant={isChatting ? "destructive" : "default"}
                onClick={
                  isChatting
                    ? cancelChat
                    : editedNodePath
                      ? editMessage
                      : sendMessage
                }
                disabled={!isChatting && input === ""}
              >
                {isChatting ? (
                  <StopCircle />
                ) : editedNodePath ? (
                  <Check />
                ) : (
                  <SendHorizonal />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ChatHistory
        selectedChatId={id}
        open={showChatHistory}
        onOpen={setShowChatHistory}
        onSelect={onHistoryChatSelect}
        onHistoryDelete={onHistoryDelete}
      />
    </>
  )
}

interface IMessage {
  message: TExpandedMessage & { currentIndex?: number; all?: number }
  isReasoning: boolean
  isCallingTool: boolean
  onEdit?: () => void
  onChange: (index: number) => void
}
function Message({
  message,
  isReasoning,
  isCallingTool,
  onEdit,
  onChange,
}: IMessage) {
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
  const stepOverString = t`Step Over`
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
                      <Badge className="truncate" key={key} variant="outline">
                        {key}: {JSON.stringify(value)}
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

export default function Chat() {
  const {
    providers,
    selectedModel,
    defaultModels,
    setSelectedModel,
    fetchDefaultModels,
  } = useContext(AIProviderContext)
  const { requireModel } = useContext(ModelSelectorContext)
  let model: LanguageModelV1 | null = null
  let summarizeModel: LanguageModelV1 | null = null

  const setModelToDefault = useCallback(async () => {
    const defaultModels = await fetchDefaultModels()

    if (defaultModels.chat) {
      setSelectedModel(defaultModels.chat)
    }
  }, [setSelectedModel, fetchDefaultModels])

  useEffect(() => {
    setModelToDefault()
  }, [setModelToDefault])

  const getModelFrom = ([providerName, modelName]: [string, string]) => {
    const provider = providers.find((p) => p.name === providerName)

    if (provider) {
      let modelProvider: any

      switch (providerName) {
        case "OpenAI":
          modelProvider = createOpenAI({
            apiKey: provider.apiKey,
          })
          break
        case "Google":
          modelProvider = createGoogleGenerativeAI({
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
          })
          break
        case "OpenRouter":
          modelProvider = createOpenRouter({
            apiKey: provider.apiKey,
          })
          break
        case "DeepSeek":
          modelProvider = createDeepSeek({
            apiKey: provider.apiKey,
          })
          break
        default:
          modelProvider = createOpenAICompatible({
            name: providerName,
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
          })
      }

      return modelProvider(modelName)
    }

    return null
  }

  if (selectedModel) {
    model = getModelFrom(selectedModel)
  }

  if (defaultModels.summarize) {
    summarizeModel = getModelFrom(defaultModels.summarize)
  }

  return (
    <InternalChat
      model={model}
      summarizeModel={summarizeModel}
      requireModel={requireModel}
    />
  )
}
