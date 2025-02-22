import { t } from "@lingui/core/macro"
import {
  CoreMessage,
  FinishReason,
  LanguageModelUsage,
  LanguageModelV1,
  streamText,
} from "ai"
import { Message } from "@ai-sdk/react"
import { useCallback, useMemo, useRef, useState } from "react"
import { stringifyObject } from "@/lib/utils"

interface IUseChat {
  model: LanguageModelV1 | null
  requireModel?: () => void
  onError?: (error: Error) => void
  onFinish?: (reason: FinishReason) => void
  options?: {
    timeout?: number
  }
}
export type TExpandedMessage = Omit<Message, "createdAt"> & {
  createdAt?: number
  endedAt?: number
  tokenUsage?: LanguageModelUsage
  modelName?: string
}
const REQUEST_TIMEOUT = 10_000

/** @notice `system` won't work if you use `messages`, add a `system` role part to `messages` */
export function useChat({
  model,
  requireModel,
  onFinish,
  onError,
  options,
}: IUseChat) {
  const userCancelController = useRef<AbortController | null>(null)
  const timer = useRef<number>(undefined)
  const [reasoningResult, setReasoningResult] = useState<string>("")
  const [textResult, setTextResult] = useState<string>("")
  const [messageId, setMessageId] = useState<string>("")
  const [startTimestamp, setStartTimestamp] = useState<number | undefined>(
    undefined
  )
  const [endTimestamp, setEndTimestamp] = useState<number | undefined>(
    undefined
  )
  const [tokenUsage, setTokenUsage] = useState<LanguageModelUsage>()
  const [isReasoning, setIsReasoning] = useState(false)
  const [isChatting, setIsChatting] = useState(false)

  const result = useMemo(() => {
    const _result: TExpandedMessage = {
      id: messageId,
      role: "assistant",
      createdAt: startTimestamp,
      endedAt: endTimestamp,
      tokenUsage,
      modelName: model?.modelId,
      content: textResult,
      parts: [{ type: "text", text: textResult }],
    }

    if (reasoningResult) {
      _result.parts!.push({ type: "reasoning", reasoning: reasoningResult })
    }

    return _result
  }, [
    messageId,
    startTimestamp,
    endTimestamp,
    model?.modelId,
    tokenUsage,
    textResult,
    reasoningResult,
  ])

  const stopChatString = t`User stopped chat`

  const clearChat = useCallback(() => {
    userCancelController.current?.abort(stopChatString)
    setTextResult("")
    setIsChatting(false)
    setIsReasoning(false)
    setReasoningResult("")
    setStartTimestamp(undefined)
    setEndTimestamp(undefined)
    setMessageId("")
    setTokenUsage(undefined)
  }, [stopChatString])

  const cancelChat = useCallback(() => {
    userCancelController.current?.abort(stopChatString)
    setIsChatting(false)
    setIsReasoning(false)

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
            messages,
            abortSignal: userCancelController.current.signal,
          })

          let text = ""
          let reasoningText = ""
          timer.current = window.setTimeout(() => {
            if (reasoningText === "" && text === "") {
              const errorReason = t`Request timeout`
              userCancelController.current?.abort(errorReason)

              setIsChatting(false)
              setIsReasoning(false)

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
                setMessageId(chunk.messageId)

                break
              case "text-delta":
                text += chunk.textDelta
                setTextResult(text)

                // If text gen start, means reasoning is over
                setIsReasoning(false)

                break
              case "reasoning":
                reasoningText += chunk.textDelta
                setReasoningResult(reasoningText)
                setIsReasoning(true)
                break
              case "step-finish":
                setStartTimestamp(chunk.response.timestamp.getTime())
                setEndTimestamp(Date.now())
                setTokenUsage(chunk.usage)
                break
              case "error":
                console.log("Error:", stringifyObject(chunk.error))
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

          if (onError) onError(e)
          else throw e
        }

        setIsReasoning(false)
        setIsChatting(false)
      } else if (requireModel) {
        requireModel()
      }
    },
    [model, options?.timeout, onError, onFinish, requireModel, clearChat]
  )

  return {
    isChatting,
    isReasoning,
    result,
    startChat,
    cancelChat,
    clearChat,
  }
}
