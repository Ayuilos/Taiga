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
import {
  History,
  MessageSquarePlus,
  SendHorizonal,
  StopCircle,
} from "lucide-react"
import { toast } from "sonner"

import { ChatStore, ChatSummaryStore, TChatID } from "@/lib/chat-store"
import { stringifyObject } from "@/lib/utils"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface IInternalChat {
  model: LanguageModelV1 | null
  requireModel: TModelSelectorContext["requireModel"]
}

const initialMessages: Partial<TExpandedMessage>[] = [
  {
    role: "system",
    content:
      "You're a friendly assistant, ready to help user solve any of their problem",
  },
]

function InternalChat({ model, requireModel }: IInternalChat) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState<string>("")
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [id, setChatId] = useState(crypto.randomUUID())

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

  const prevIsChatting = useRef(isChatting)
  if (prevIsChatting.current && !isChatting) {
    // If chat is over, update `messages`
    setMessages((prev) => [...prev, result])
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

  const saveChatHistory = useCallback(async () => {
    if (newMessageCreated) {
      let summary: string
      summary = (await _createChatSummary())!

      await ChatStore.createOrUpdateChat({ id, messages, summary })
    }
  }, [id, messages, newMessageCreated, _createChatSummary])

  const onHistoryChatSelect = useCallback(
    async (_id: TChatID) => {
      const { messages: historyMessages } = await ChatStore.getChat(_id)

      console.log(stringifyObject(historyMessages))
      setChatId(_id)
      setInput("")
      clearChat()
      setMessages(historyMessages)
    },
    [clearChat]
  )

  const sendMessage = useCallback(async () => {
    if (model) {
      const newMessages = [
        ...messages,
        {
          role: "user",
          content: input,
          createdAt: Date.now(),
          parts: [{ type: "text", text: input }],
        } as TExpandedMessage,
      ]
      setMessages(newMessages)
      setInput("")

      startChat({
        messages: newMessages.map((message) => {
          return {
            role: message.role,
            content: message.content,
          } as CoreMessage
        }),
      })
    } else {
      requireModel()
    }
  }, [model, messages, input, startChat, requireModel])

  const startNewChat = useCallback(() => {
    if (!chatIsFresh) {
      setMessages(initialMessages)
      setChatId(crypto.randomUUID())
      setInput("")
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

  const reasoningButtonStrings = [t`Is reasoning...`, t`Reasoning process`]
  const reasoningDialogDescString = t`You're using reasoning model!`

  return (
    <>
      <div className="w-[94%] self-center flex-auto flex flex-col items-center justify-end gap-4 max-h-screen">
        <div className="w-full relative flex-auto flex flex-col overflow-hidden">
          <div
            ref={messagesRef}
            className="w-full pt-20 flex-auto flex flex-col gap-4 overflow-y-auto"
          >
            {(isChatting ? messages.concat(result) : messages)
              .filter((m) => m.role === "user" || m.role === "assistant")
              .map((message, index) => {
                const date = message.endedAt || message.createdAt

                return (
                  <div
                    key={index}
                    className={`flex flex-col max-w-[88%] gap-1 ${
                      message.role === "user"
                        ? "self-end items-end"
                        : "self-start items-start"
                    }`}
                  >
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
                            const isLastReasoning =
                              isReasoning && index === messages.length - 1
                            const buttonString = isLastReasoning
                              ? reasoningButtonStrings[0]
                              : reasoningButtonStrings[1]

                            return (
                              <div key={i} className="order-1">
                                <ReasoningDisplay
                                  isReasoning={isLastReasoning}
                                  buttonContent={buttonString}
                                  reasoningText={p.reasoning}
                                  title={buttonString}
                                  description={reasoningDialogDescString}
                                />
                              </div>
                            )
                          case "text":
                            return (
                              <div key={i} className="order-2">
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
            </div>
            <div>
              <Button
                size="icon"
                variant={isChatting ? "destructive" : "default"}
                onClick={isChatting ? cancelChat : sendMessage}
                disabled={!isChatting && input === ""}
              >
                {isChatting ? <StopCircle /> : <SendHorizonal />}
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
