import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { createAISDKTools } from "@agentic/ai-sdk"
import { jina } from "@agentic/jina"
import { Message } from "@ai-sdk/react"
import { TextUIPart, ToolInvocationUIPart } from "@ai-sdk/ui-utils"
import { t } from "@lingui/core/macro"
import {
  CoreMessage,
  FinishReason,
  LanguageModelUsage,
  LanguageModelV1,
  streamText,
  ToolResult,
} from "ai"
import { produce } from "immer"
import { z } from "zod"

import { commonAITools } from "@/lib/common-ai-tools"
import { getSearchAITools } from "@/lib/search-ai-tools"
import { stringifyObject } from "@/lib/utils"
import { SearchApisContext } from "@/components/SearchApisContext"

interface IUseChat {
  model: LanguageModelV1 | null
  requireModel?: () => void
  onError?: (error: Error) => void
  onFinish?: (reason: FinishReason) => void
  options?: {
    timeout?: number
    allowSearch?: boolean | string[]
    allowCommonTools?: boolean | string[]
  }
}
// type WithType<T, U> = T extends (infer A)[] | undefined
//   ? (A | U)[] | undefined
//   : never
type ExtendTupleType<T, U> =
  | (T extends (infer V)[] ? (V | U)[] : never)
  | undefined
type TStepFlag = {
  type: "flag"
  tokenUsage: LanguageModelUsage
  createdAt: number
  endedAt: number
}
type TErrorPart = {
  type: "error"
  createdAt: number
  error: Error
}

export type TExpandedMessage = Partial<Omit<Message, "createdAt" | "parts">> & {
  createdAt?: number
  endedAt?: number
  tokenUsage?: LanguageModelUsage
  modelName?: string
  parts?: ExtendTupleType<Message["parts"], TStepFlag | TErrorPart>
}

export const SearchReturnSchema = z.object({
  code: z.number(),
  status: z.number(),
  data: z.array(
    z.object({
      url: z.string().url(),
      title: z.string(),
      description: z.string(),
      content: z.string(),
      favicon: z.string().optional(),
      usage: z.object({
        tokens: z.number(),
      }),
    })
  ),
})
export type TSearchReturnType = z.infer<typeof SearchReturnSchema>

const REQUEST_TIMEOUT = 30_000
const KEEPED_SEARCH_CONTENT_CHARACTOR_COUNT = 3_000
const DEFAULT_TEMPERATURE = 0.7

export type TUseChatReturnType = ReturnType<typeof useChat>
/** @notice `system` won't work if you use `messages`, add a `system` role part to `messages` */
export function useChat({
  model,
  requireModel,
  onFinish,
  onError,
  options,
}: IUseChat) {
  const { searchApis, fetchSearchApis } = useContext(SearchApisContext)

  const userCancelController = useRef<AbortController | null>(null)
  const timer = useRef<number>(undefined)

  const [textResult, setTextResult] = useState<string>("")
  const [messageId, setMessageId] = useState<string>("")
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>(
    undefined
  )
  const [endTimestamp, setEndTimestamp] = useState<number | undefined>(
    undefined
  )

  const [isReasoning, setIsReasoning] = useState(false)
  const [isChatting, setIsChatting] = useState(false)
  const [isCallingTool, setIsCallingTool] = useState(false)

  const [parts, setParts] = useState<TExpandedMessage["parts"]>([])

  const tools = useMemo(() => {
    const searchApiKeys: Record<string, string> = Object.fromEntries(
      searchApis
        .map((api) => [api.name, api.apiKey])
        .filter(([_, apiKey]) => !!apiKey)
    )

    const _tools = createAISDKTools(
      ...[
        options?.allowSearch
          ? getSearchAITools(
              typeof options.allowSearch === "boolean"
                ? searchApiKeys
                : options.allowSearch.reduce(
                    (filteredKeys, curr) => {
                      filteredKeys[curr] = searchApiKeys[curr]
                      return filteredKeys
                    },
                    {} as Record<string, string>
                  )
            )
          : null,
        options?.allowCommonTools
          ? typeof options.allowCommonTools === "boolean"
            ? commonAITools
            : commonAITools.pick(...options.allowCommonTools)
          : null,
      ].filter((t) => t !== null)
    )
    return produce(_tools, (draft) => {
      const searchTool = draft["search"]

      if (searchTool) {
        ;(searchTool.parameters as any) = jina.SearchOptionsSchema.extend({
          json: z.boolean().optional().default(true),
        })
      }
    })
  }, [options, searchApis])

  const result = useMemo(() => {
    const _result: TExpandedMessage = {
      id: messageId,
      role: "assistant",
      createdAt: startTimestamp,
      endedAt: endTimestamp,
      tokenUsage: (parts || [])
        .filter((part) => part.type === "flag")
        .reduce(
          (usage, curr) => {
            return {
              promptTokens: usage!.promptTokens + curr.tokenUsage.promptTokens,
              completionTokens:
                usage!.completionTokens + curr.tokenUsage.completionTokens,
              totalTokens: usage!.totalTokens + curr.tokenUsage.totalTokens,
            }
          },
          {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          } as TExpandedMessage["tokenUsage"]
        ),
      modelName: model?.modelId,
      content: textResult,
      parts,
    }

    return _result
  }, [
    messageId,
    startTimestamp,
    endTimestamp,
    model?.modelId,
    parts,
    textResult,
  ])

  const stopChatString = t`User stopped chat`

  const clearChat = useCallback(() => {
    userCancelController.current?.abort(stopChatString)
    setTextResult("")
    setIsChatting(false)
    setIsReasoning(false)
    setIsCallingTool(false)
    setParts([])
    setStartTimestamp(undefined)
    setEndTimestamp(undefined)
    setMessageId("")
  }, [stopChatString])

  const cancelChat = useCallback(() => {
    userCancelController.current?.abort(stopChatString)
    setIsChatting(false)
    setIsReasoning(false)
    setIsCallingTool(false)

    if (timer.current) window.clearTimeout(timer.current)
  }, [stopChatString])

  const startChat = useCallback(
    async ({
      system,
      prompt,
      messages,
    }: {
      prompt?: string
      system?: string
      messages?: Array<CoreMessage>
    }) => {
      if (model) {
        clearChat()
        setIsChatting(true)
        userCancelController.current = new AbortController()

        try {
          const response = await streamText({
            model,
            system,
            prompt,
            temperature: DEFAULT_TEMPERATURE,
            maxSteps: 5,
            messages,
            tools,
            abortSignal: userCancelController.current.signal,
          })

          let requestTimeout = true
          let newStep = false
          timer.current = window.setTimeout(() => {
            if (requestTimeout) {
              const errorReason = t`Request timeout`
              userCancelController.current?.abort(errorReason)

              setIsChatting(false)
              setIsReasoning(false)
              setIsCallingTool(false)

              if (onError) {
                const err = new Error(errorReason)
                err.name = "TimeoutError"

                onError(new Error(errorReason))
              }
            }
          }, options?.timeout || REQUEST_TIMEOUT)

          let _log_type = ""
          for await (const chunk of response.fullStream) {
            if (_log_type !== chunk.type) {
              console.log(chunk.type)
              _log_type = chunk.type
            }

            switch (chunk.type) {
              case "step-start":
                requestTimeout = false
                newStep = true
                setMessageId(chunk.messageId)

                break
              case "reasoning":
                setIsReasoning(true)

                setParts(
                  produce((draft) => {
                    if (newStep) {
                      draft!.push({
                        type: "reasoning",
                        reasoning: chunk.textDelta,
                        details: [{ type: "text", text: chunk.textDelta }],
                      })
                      newStep = false
                    } else {
                      const lastPart = draft![draft!.length - 1]

                      if (lastPart) {
                        if (lastPart.type !== "reasoning") {
                          draft!.push({
                            type: "reasoning",
                            reasoning: chunk.textDelta,
                            details: [{ type: "text", text: chunk.textDelta }],
                          })
                        } else {
                          lastPart.reasoning += chunk.textDelta

                          const textTypeDetail = lastPart.details.find(
                            (detail) => detail.type === "text"
                          )
                          textTypeDetail!.text += chunk.textDelta
                        }
                      } else {
                        draft!.push({
                          type: "reasoning",
                          reasoning: chunk.textDelta,
                          details: [{ type: "text", text: chunk.textDelta }],
                        })
                      }
                    }
                  })
                )

                break
              case "reasoning-signature":
                setParts(
                  produce((draft) => {
                    const reasoningPart = draft![draft!.length - 1]

                    if (reasoningPart!.type === "reasoning") {
                      const textTypeDetail = reasoningPart!.details!.find(
                        (detail) => detail.type === "text"
                      )
                      textTypeDetail!.signature = chunk.signature
                    }
                  })
                )

                break
              case "redacted-reasoning":
                setParts(
                  produce((draft) => {
                    const reasoningPart = draft![draft!.length - 1]

                    if (reasoningPart.type === "reasoning") {
                      reasoningPart.details.push({
                        type: "redacted",
                        data: chunk.data,
                      })
                    }
                  })
                )

                break
              case "text-delta":
                setParts(
                  produce((draft) => {
                    if (newStep) {
                      draft!.push({
                        type: "text",
                        text: chunk.textDelta,
                      })
                    } else {
                      const lastPart = draft![draft!.length - 1]

                      if (lastPart) {
                        if (lastPart.type !== "text") {
                          draft!.push({
                            type: "text",
                            text: chunk.textDelta,
                          })
                        } else {
                          ;(lastPart as TextUIPart).text += chunk.textDelta
                        }
                      } else {
                        draft!.push({
                          type: "text",
                          text: chunk.textDelta,
                        })
                      }
                    }
                  })
                )

                newStep = false

                setTextResult((r) =>
                  newStep ? chunk.textDelta : r + chunk.textDelta
                )

                // If text gen start, means reasoning is over
                setIsReasoning(false)

                break
              case "tool-call":
                setIsCallingTool(true)

                setParts(
                  produce((draft) => {
                    draft!.push({
                      type: "tool-invocation",
                      toolInvocation: {
                        state: "partial-call",
                        toolName: chunk.toolName,
                        toolCallId: chunk.toolCallId,
                        args: chunk.args,
                      },
                    })
                    newStep = false
                  })
                )
                break
              case "tool-call-delta":
                break
              case "tool-result":
                setIsCallingTool(false)

                setParts(
                  produce((draft) => {
                    const targetPart = draft!.find(
                      (p) =>
                        p.type === "tool-invocation" &&
                        p.toolInvocation.toolCallId === chunk.toolCallId
                    ) as ToolInvocationUIPart

                    targetPart.toolInvocation.state = "result"

                    const isCallingSearchTool = SearchReturnSchema.safeParse(
                      chunk.result
                    ).success

                    ;(
                      targetPart.toolInvocation as ToolResult<string, any, any>
                    ).result = isCallingSearchTool
                      ? produce(chunk.result as TSearchReturnType, (draft) => {
                          draft.data.forEach((item) => {
                            // Cut down the content to 2000 characters
                            item.content = item.content.slice(
                              0,
                              KEEPED_SEARCH_CONTENT_CHARACTOR_COUNT
                            )
                          })
                        })
                      : chunk.result
                  })
                )
                break
              case "step-finish":
                setParts(
                  produce((draft) => {
                    draft!.push({
                      type: "flag",
                      createdAt: chunk.response.timestamp.getTime(),
                      endedAt: Date.now(),
                      tokenUsage: chunk.usage,
                    })
                  })
                )
                setStartTimestamp(
                  (prevT) => prevT ?? chunk.response.timestamp.getTime()
                )
                setEndTimestamp(Date.now())

                break
              case "finish":
                break
              case "error":
                requestTimeout = false
                console.log("Error:", stringifyObject(chunk.error))

                let recordedError = new Error()
                if (typeof chunk.error === "string") {
                  recordedError.message = chunk.error
                } else if (chunk.error instanceof Error) {
                  recordedError.name = chunk.error.name
                  recordedError.message = chunk.error.message
                }

                const now = Date.now()

                setParts(
                  produce((draft) => {
                    draft!.push({
                      type: "error",
                      createdAt: now,
                      error: recordedError,
                    })
                  })
                )
                setStartTimestamp(now)
                setEndTimestamp(now)

                throw chunk.error
              default:
                break
            }
          }

          const finishReason = await response.finishReason
          if (onFinish) onFinish(finishReason)
        } catch (e: any) {
          setIsReasoning(false)
          setIsChatting(false)
          setIsCallingTool(false)

          if (onError) onError(e)
          else throw e
        }

        setIsReasoning(false)
        setIsChatting(false)
        setIsCallingTool(false)
      } else if (requireModel) {
        requireModel()
      }
    },
    [model, options, tools, onError, onFinish, requireModel, clearChat]
  )

  const availableSearchApis = useMemo(
    () => searchApis.filter((api) => api.apiKey !== ""),
    [searchApis]
  )

  useEffect(() => {
    fetchSearchApis()
  }, [fetchSearchApis])

  return {
    isChatting,
    isReasoning,
    isCallingTool,
    result,
    availableSearchApis,
    startChat,
    cancelChat,
    clearChat,
  }
}
