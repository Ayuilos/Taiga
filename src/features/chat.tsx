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
import { useIsDark } from "@/hooks/useIsDark"
import { t } from "@lingui/core/macro"
import { useRouter } from "@tanstack/react-router"
import { CoreMessage, generateText, LanguageModelV1 } from "ai"
import { produce } from "immer"
import {
  Check,
  History,
  MessageSquarePlus,
  SendHorizonal,
  StopCircle,
  Trash,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { getModelProvider } from "@/lib/ai-providers"
import { ChatPathStore } from "@/lib/chat-path-store"
import {
  ChatStore,
  ChatSummaryStore,
  TChatID,
  TChatNode,
} from "@/lib/chat-store"
import { sameArrays } from "@/lib/utils"
import { AIProviderContext } from "@/components/AIProvidersContext"
import { Aurora } from "@/components/Aurora"
import { ChatHistory } from "@/components/ChatHistory"
import { ChatMessage, IChatMessage } from "@/components/ChatMessage"
import { ErrorsToastText } from "@/components/ErrorsToastText"
import {
  ModelSelectorContext,
  TModelSelectorContext,
} from "@/components/ModelSelectorContext"
import {
  ScrollToBottom,
  SHOULD_RENDER_SCROLL_TO_BOTTOM_HEIGHT,
} from "@/components/ScrollToBottom"
import { ToolArea } from "@/components/ToolArea"
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
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface IInternalChat {
  chatId?: TChatID
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

function InternalChat({
  chatId,
  model,
  summarizeModel,
  requireModel,
}: IInternalChat) {
  const isDark = useIsDark()
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

  const [selectedSearchApi, setSelectedSearchApi] = useState<
    string | undefined
  >(undefined)
  const [selectedCommonTools, setSelectedCommonTools] = useState<string[]>([])

  const prevInputRef = useRef<string>("")

  const messages = useMemo(() => {
    let _messages: IChatMessage["message"][] = []
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
    availableSearchApis,
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
      allowCommonTools: selectedCommonTools,
      allowSearch: selectedSearchApi ? [selectedSearchApi] : undefined,
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

      await ChatStore.createOrUpdateChat({
        id,
        nodes: chatNodes,
        editTime: Date.now(),
        summary,
      })

      await router.navigate({ to: `/chat/${id}` })
    }
  }, [router, id, chatNodes, newMessageCreated, _createChatSummary])

  const saveChatPath = useCallback(async () => {
    if (chatPath.length) {
      await ChatPathStore.setChatPath(id, chatPath)
    }
  }, [id, chatPath])

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

  const _startNewChat = useCallback(
    (newChatId: TChatID) => {
      setChatNodes(initialChatNodes)
      setChatId(newChatId)
      setChatPath([0])
      sessionPath.current = [0]
      setInput("")
      prevInputRef.current = ""
      clearChat()
    },
    [clearChat]
  )

  const onChatIdChanged = useCallback(
    async (_id: TChatID) => {
      if (_id !== id) {
        const isHistoryChat = Boolean(
          await ChatStore.getChat(_id).catch(() => false)
        )

        if (!isHistoryChat) {
          _startNewChat(_id)
        } else {
          const { nodes: newChatNodes } = await ChatStore.getChat(_id)
          const historyChatPath = await ChatPathStore.getChatPath(_id)

          setChatId(_id)
          setInput("")
          setChatNodes(newChatNodes)
          clearChat()

          let _chatPath: number[] =
            historyChatPath ?? _resetSearchPath(newChatNodes)

          setChatPath(_chatPath)
          sessionPath.current = _chatPath
        }
      }
    },
    [id, clearChat, _startNewChat, _resetSearchPath]
  )

  const changeChatId = useCallback(
    async (chatId: TChatID) => {
      await router.navigate({ to: `/chat/${chatId}`, replace: true })
    },
    [router]
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

  const startNewChat = useCallback(() => {
    if (!chatIsFresh) {
      changeChatId(crypto.randomUUID())
    }
  }, [chatIsFresh, changeChatId])

  const deleteChat = useCallback(async () => {
    if (id) {
      await ChatStore.deleteChat(id)
      changeChatId(crypto.randomUUID())
    }
  }, [id, changeChatId])

  const onHistoryDelete = useCallback(async () => {
    onChatIdChanged(crypto.randomUUID())
  }, [onChatIdChanged])

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

  useEffect(() => {
    saveChatPath()
  }, [saveChatPath])

  useEffect(() => {
    if (chatId) {
      onChatIdChanged(chatId)
    }
  }, [chatId, onChatIdChanged])

  useLayoutEffect(() => {
    if (messagesRef.current && shouldAutoScroll) {
      messagesRef.current.scrollTop =
        messagesRef.current.scrollHeight - messagesRef.current.clientHeight
    }
  }, [result, shouldAutoScroll])

  const deleteChatTitleString = t`Are you sure to delete this chat?`
  const deleteChatConfirmString = t`Delete`
  const deleteChatCancelString = t`Cancel`
  const textareaPlaceholder = t`What can I help you?`

  const deleteChatButton = !chatIsFresh ? (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="shrink-0 border-red-500 text-red-500"
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
      <div className="w-[94%] self-center flex-auto flex flex-col items-center justify-end overflow-hidden gap-4 select-none">
        <div className="w-full relative flex-auto flex flex-col overflow-hidden">
          {isChatting ? (
            <div className="fixed z-12 top-25 left-0 w-screen h-[10vh]">
              {isDark ? (
                <Aurora speed={2.5} blend={1} amplitude={0.5} />
              ) : (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r/longer from-sky-200/0 via-yellow-300 to-sky-200/0 bg-[size:400%_100%] animate-loading-gradient" />
              )}
            </div>
          ) : null}
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
                const isLastChatting =
                  isChatting && index === messages.length - 1
                const isLastReasoning =
                  isReasoning && index === messages.length - 1
                // chatPath [0] -> systemRoleNode, chatPath [0, 0] -> userRoleNode
                // index = 0 -> userRoleNode -> chatPathLength = 2
                // index + 2 = chatPathLength
                const toEditNodePath = chatPath.slice(0, index + 2)
                const parentNodePath = toEditNodePath.slice(0, -1)

                return (
                  <ChatMessage
                    key={message.id || index}
                    message={message}
                    isChatting={isLastChatting}
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
        <div className="flex flex-col items-center relative shrink-0 pb-4 w-full">
          <Textarea
            className="w-[98%] resize-none pb-20 max-h-[30vh]"
            placeholder={textareaPlaceholder}
            onChange={(e) => setInput(e.target.value)}
            value={input}
          />
          <div className="absolute bottom-4 w-[98%] px-2 rounded-xl">
            <div className="flex justify-between items-center gap-8 py-1 bg-background">
              <div className="flex-auto flex gap-2 justify-start items-center overflow-x-auto">
                {editedNodePath ? (
                  <Button size="icon" variant="outline" onClick={cancelEdit}>
                    <X />
                  </Button>
                ) : (
                  <>
                    <ToolArea
                      availableSearchApis={availableSearchApis}
                      selectedSearchApi={selectedSearchApi}
                      selectedCommonTools={selectedCommonTools}
                      onSearchAPISelect={setSelectedSearchApi}
                      onCommonToolsSelect={setSelectedCommonTools}
                    />
                    <Button
                      className="shrink-0"
                      size="icon"
                      variant="outline"
                      onClick={startNewChat}
                    >
                      <MessageSquarePlus />
                    </Button>
                    <Button
                      className="shrink-0"
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
      </div>
      <ChatHistory
        selectedChatId={id}
        open={showChatHistory}
        onOpen={setShowChatHistory}
        onSelect={changeChatId}
        onHistoryDelete={onHistoryDelete}
      />
    </>
  )
}

export default function Chat({ chatId }: { chatId: TChatID }) {
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
      const modelProvider: any = getModelProvider(provider)

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
      chatId={chatId}
      model={model}
      summarizeModel={summarizeModel}
      requireModel={requireModel}
    />
  )
}
