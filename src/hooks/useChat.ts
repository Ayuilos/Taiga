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
import { UIMessage as Message } from "@ai-sdk/react"
import { t } from "@lingui/core/macro"
import {
  TextUIPart,
  ModelMessage,
  FinishReason,
  LanguageModelUsage,
  streamText,
  stepCountIs,
  ToolUIPart,
  LanguageModel,
  ReasoningUIPart,
} from "ai"
import { produce } from "immer"
import { z } from 'zod';

import { commonAITools } from "@/lib/common-ai-tools"
import { getSearchAITools } from "@/lib/search-ai-tools"
import { PRESET_NAMES } from "@/lib/updater"
import { stringifyObject } from "@/lib/utils"
import { SearchApisContext } from "@/components/SearchApisContext"

interface IUseChat {
  model: LanguageModel | null
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
        .map((api) => {
          if (api.name === PRESET_NAMES.SEARXNG_PRESET)
            return [api.name, api.searchURL]

          return [api.name, api.apiKey]
        })
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
        // v5: parameters → inputSchema
        ;(searchTool.inputSchema as any) = jina.SearchOptionsSchema.extend({
          json: z.boolean().optional().default(true),
        })
      }
    })
  }, [options, searchApis])

  // v5: LanguageModel 类型没有 modelId 属性，需要从 model 对象中获取
  const modelName = useMemo(() => {
    if (!model) return undefined
    // 尝试从不同的属性获取模型名称
    if (typeof model === 'string') return model
    if ('modelId' in model && typeof (model as any).modelId === 'string') return (model as any).modelId
    if ('id' in model && typeof (model as any).id === 'string') return (model as any).id
    return undefined
  }, [model])

  const result = useMemo(() => {
    const _result: TExpandedMessage = {
      id: messageId,
      role: "assistant",
      createdAt: startTimestamp,
      endedAt: endTimestamp,
      tokenUsage: (parts || [])
        .filter((part): part is TStepFlag => part.type === "flag")
        .reduce(
          (usage, curr) => {
            return {
              inputTokens: (usage?.inputTokens ?? 0) + (curr.tokenUsage.inputTokens ?? 0),
              outputTokens:
                (usage?.outputTokens ?? 0) + (curr.tokenUsage.outputTokens ?? 0),
              totalTokens: (usage?.totalTokens ?? 0) + (curr.tokenUsage.totalTokens ?? 0),
            };
          },
          {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
          } as TExpandedMessage["tokenUsage"]
        ),
      modelName,
      parts,
    }

    return _result
  }, [
    messageId,
    startTimestamp,
    endTimestamp,
    modelName,
    parts,
  ])

  const stopChatString = t`User stopped chat`

  const clearChat = useCallback(() => {
    userCancelController.current?.abort(stopChatString)
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
      messages?: Array<ModelMessage>
    }) => {
      if (model) {
        clearChat()
        setIsChatting(true)
        userCancelController.current = new AbortController()

        try {
          // v5: messages 不能为 undefined，需要条件性地传递
          const streamOptions = {
            model,
            system,
            temperature: DEFAULT_TEMPERATURE,
            stopWhen: stepCountIs(5),
            tools,
            abortSignal: userCancelController.current.signal,
            ...(messages ? { messages } : { prompt }),
          }
          const response = streamText(streamOptions as any)

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
              // v5: reasoning-start 表示推理开始
              case "reasoning-start":
                requestTimeout = false
                setIsReasoning(true)
                setParts((prev) => [
                  ...(prev || []),
                  {
                    type: "reasoning",
                    text: "",
                  } as ReasoningUIPart,
                ])
                break
              // v5: reasoning-delta 替代了 reasoning
              case "reasoning-delta":
                setIsReasoning(true)

                setParts((prev) => {
                  const draft = [...(prev || [])]
                  const lastPart = draft[draft.length - 1]

                  if (lastPart && lastPart.type === "reasoning") {
                    // 创建新的 reasoning part 以保持不可变性
                    draft[draft.length - 1] = {
                      ...lastPart,
                      text: (lastPart as ReasoningUIPart).text + chunk.text,
                    } as ReasoningUIPart
                  } else {
                    draft.push({
                      type: "reasoning",
                      text: chunk.text,
                    } as ReasoningUIPart)
                  }
                  return draft as TExpandedMessage["parts"]
                })

                break
              // v5: reasoning-end 表示推理结束
              case "reasoning-end":
                setIsReasoning(false)
                break
              // v5: text-start 表示文本开始
              case "text-start":
                requestTimeout = false
                newStep = true
                setMessageId(chunk.id)
                break
              // v5: text-delta 的属性从 textDelta 改为 text
              case "text-delta":
                setParts((prev) => {
                  const draft = [...(prev || [])]
                  if (newStep) {
                    draft.push({
                      type: "text",
                      text: chunk.text,
                    } as TextUIPart)
                  } else {
                    const lastPart = draft[draft.length - 1]

                    if (lastPart) {
                      if (lastPart.type !== "text") {
                        draft.push({
                          type: "text",
                          text: chunk.text,
                        } as TextUIPart)
                      } else {
                        draft[draft.length - 1] = {
                          ...lastPart,
                          text: (lastPart as TextUIPart).text + chunk.text,
                        } as TextUIPart
                      }
                    } else {
                      draft.push({
                        type: "text",
                        text: chunk.text,
                      } as TextUIPart)
                    }
                  }
                  return draft as TExpandedMessage["parts"]
                })

                newStep = false

                // If text gen start, means reasoning is over
                setIsReasoning(false)

                break
              // v5: text-end 表示文本结束
              case "text-end":
                break
              case "tool-call":
                setIsCallingTool(true)

                // v5: 工具部分使用 tool-${toolName} 格式的 type
                // 状态从 partial-call → input-streaming
                // args → input
                setParts((prev) => [
                  ...(prev || []),
                  {
                    type: `tool-${chunk.toolName}`,
                    toolCallId: chunk.toolCallId,
                    state: "input-available",
                    input: chunk.input,
                  } as ToolUIPart,
                ])
                newStep = false
                break
              case "tool-result":
                setIsCallingTool(false)

                setParts((prev) => {
                  const draft = [...(prev || [])]
                  // v5: 手动检查工具部分类型，因为 isToolUIPart 不能用于自定义类型
                  const targetIndex = draft.findIndex(
                    (p) =>
                      typeof p.type === "string" &&
                      p.type.startsWith("tool-") &&
                      "toolCallId" in p &&
                      (p as any).toolCallId === chunk.toolCallId
                  )

                  if (targetIndex !== -1) {
                    const targetPart = draft[targetIndex] as ToolUIPart
                    // v5: 状态从 result → output-available
                    // result → output
                    const isCallingSearchTool = SearchReturnSchema.safeParse(
                      chunk.output
                    ).success

                    const processedOutput = isCallingSearchTool
                      ? {
                          ...(chunk.output as TSearchReturnType),
                          data: (chunk.output as TSearchReturnType).data.map((item) => ({
                            ...item,
                            content: item.content.slice(0, KEEPED_SEARCH_CONTENT_CHARACTOR_COUNT),
                          })),
                        }
                      : chunk.output

                    draft[targetIndex] = {
                      ...targetPart,
                      state: "output-available",
                      output: processedOutput,
                    } as any
                  }
                  return draft as TExpandedMessage["parts"]
                })
                break
              // v5: tool-error 是新增的状态
              case "tool-error":
                setIsCallingTool(false)

                setParts((prev) => {
                  const draft = [...(prev || [])]
                  // v5: 手动检查工具部分类型
                  const targetIndex = draft.findIndex(
                    (p) =>
                      typeof p.type === "string" &&
                      p.type.startsWith("tool-") &&
                      "toolCallId" in p &&
                      (p as any).toolCallId === chunk.toolCallId
                  )

                  if (targetIndex !== -1) {
                    const targetPart = draft[targetIndex] as ToolUIPart
                    draft[targetIndex] = {
                      ...targetPart,
                      state: "output-error",
                      errorText: chunk.error,
                    } as any
                  }
                  return draft as TExpandedMessage["parts"]
                })
                break
              // v5: source 类型变成了 source-url 和 source-document
              case "source":
                // v5: source 事件现在直接包含 sourceType, url, title 等属性
                if (chunk.sourceType === "url") {
                  setParts((prev) => [
                    ...(prev || []),
                    {
                      type: "source-url",
                      url: chunk.url,
                      title: chunk.title,
                    } as any,
                  ])
                } else if (chunk.sourceType === "document") {
                  setParts((prev) => [
                    ...(prev || []),
                    {
                      type: "source-document",
                      documentId: (chunk as any).documentId,
                      title: (chunk as any).title,
                    } as any,
                  ])
                }
                break
              // v5: finish 事件包含 totalUsage 信息（从 usage 改名）
              case "finish":
                setParts((prev) => [
                  ...(prev || []),
                  {
                    type: "flag",
                    createdAt: Date.now(),
                    endedAt: Date.now(),
                    tokenUsage: chunk.totalUsage,
                  } as TStepFlag,
                ])
                setStartTimestamp((prevT) => prevT ?? Date.now())
                setEndTimestamp(Date.now())
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

                setParts((prev) => [
                  ...(prev || []),
                  {
                    type: "error",
                    createdAt: now,
                    error: recordedError,
                  } as TErrorPart,
                ])
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
