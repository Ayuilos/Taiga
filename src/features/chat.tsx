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
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { t } from "@lingui/core/macro"
import { CoreMessage, generateText, LanguageModelV1 } from "ai"
import { produce } from "immer"
import {
  Check,
  History,
  MessageSquarePlus,
  SendHorizonal,
  StopCircle,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  ChatStore,
  ChatSummaryStore,
  TChatID,
  TChatNode,
} from "@/lib/chat-store"
import { sameArrays, stringifyObject } from "@/lib/utils"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Textarea } from "@/components/ui/textarea"

interface IInternalChat {
  model: LanguageModelV1 | null
  requireModel: TModelSelectorContext["requireModel"]
}

const initialChatNodes: TChatNode[] = [
  {
    children: [],
    message: {
      role: "system",
      content:
        "You're a friendly assistant, ready to help user solve any of their problem",
    },
  },
]

function InternalChat({ model, requireModel }: IInternalChat) {
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

  const { isChatting, isReasoning, result, startChat, cancelChat, clearChat } =
    useChat({
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
            console.log(error.name)
            toast.error(ErrorsToastText["unknown"])
            break
        }
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
      newMessage: TExpandedMessage,
      toUpdatePath = chatPath,
      updateChatPath: boolean = true
    ) => {
      let newIndex = 0
      setChatNodes(
        produce((draft) => {
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

          newIndex = toUpdateNode!.children.length

          toUpdateNode!.children.push({
            message: newMessage,
            children: [],
          })

          return draft
        })
      )

      if (updateChatPath) {
        setChatPath([...toUpdatePath, newIndex])
      }
      sessionPath.current = [...toUpdatePath, newIndex]
    },
    [chatPath]
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
    if (model) {
      const chatContent = messages
        .map((message) => `${message.role}: ${message.content}`)
        .concat([`${result.role}: ${result.content}`])
        .join("\n")

      let summaryText = t`Failed to summarize`
      try {
        const { text } = await generateText({
          model,
          system: `You're good at summarizing, summarize the content provided by user in 15 words directly, don't say extra words`,
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
        summary: summaryText,
      })

      return summaryText
    }
  }, [id, model, result, messages])

  const clearAllHistory = async () => {
    await ChatStore.clearAllChats()
  }

  const saveChatHistory = useCallback(async () => {
    if (newMessageCreated) {
      let summary: string
      summary = (await _createChatSummary())!

      await ChatStore.createOrUpdateChat({ id, nodes: chatNodes, summary })
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
      console.log(stringifyObject(keepedMessages))

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

  const startNewChat = useCallback(() => {
    if (!chatIsFresh) {
      setChatNodes(initialChatNodes)
      setChatId(crypto.randomUUID())
      setChatPath([0])
      sessionPath.current = [0]
      setInput("")
      prevInputRef.current = ""
      clearChat()
    }
  }, [clearChat, chatIsFresh])

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

  return (
    <>
      <div className="w-[94%] self-center flex-auto flex flex-col items-center justify-end gap-4 max-h-screen select-none">
        <div className="w-full relative flex-auto flex flex-col overflow-hidden">
          <div
            ref={messagesRef}
            className="w-full pt-20 flex-auto flex flex-col gap-4 overflow-y-auto"
          >
            {(isChatting && sameArrays(chatPath, sessionPath.current)
              ? messages.concat(result)
              : messages
            )
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((message, index) => {
                const isLastReasoning =
                  isReasoning && index === messages.length - 1
                const toEditNodePath = chatPath.slice(0, index + 2)

                return (
                  <Message
                    key={message.id || index}
                    message={message}
                    isReasoning={isLastReasoning}
                    onEdit={
                      message.role === "user"
                        ? () => {
                            startEditMessage(toEditNodePath)
                          }
                        : undefined
                    }
                    onChange={(idx: number) => {
                      setChatPath(
                        _resetSearchPath(chatNodes, [
                          ...toEditNodePath.slice(0, -1),
                          idx,
                        ])
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
            placeholder="Type a message..."
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
                  <Button variant="destructive" onClick={clearAllHistory}>
                    X
                  </Button>
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
      />
    </>
  )
}

interface IMessage {
  message: TExpandedMessage & { currentIndex?: number; all?: number }
  isReasoning: boolean
  onEdit?: () => void
  onChange: (index: number) => void
}
function Message({ message, isReasoning, onEdit, onChange }: IMessage) {
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
  const editMessageString = t`Edit message`
  const copyString = t`Copy`

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
              message.role === "user" ? "bg-blue-500" : "bg-gray-500"
            } flex flex-col gap-2 text-white p-2 whitespace-pre-wrap break-words rounded-lg max-w-full`}
          >
            {message.parts?.map((p, i) => {
              switch (p.type) {
                case "reasoning":
                  const buttonString = isReasoning
                    ? reasoningButtonStrings[0]
                    : reasoningButtonStrings[1]

                  return (
                    <div key={i} className="order-1">
                      <ReasoningDisplay
                        isReasoning={isReasoning}
                        buttonContent={buttonString}
                        reasoningText={p.reasoning}
                        title={buttonString}
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
          <ContextMenuItem onClick={onEdit}>
            {editMessageString}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onClick={copyToClipboard}>
          {copyString}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default function Chat() {
  const { providers, selectedModel } = useContext(AIProviderContext)
  const { requireModel } = useContext(ModelSelectorContext)
  let model: LanguageModelV1 | null = null

  if (selectedModel) {
    const provider = providers.find((p) => p.name === selectedModel[0])

    if (provider) {
      const aiCompaProvider = createOpenAICompatible({
        name: provider.name,
        baseURL: provider.baseURL,
        apiKey: provider.apiKey,
      })

      model = aiCompaProvider(selectedModel[1])
    }
  }

  return <InternalChat model={model} requireModel={requireModel} />
}
