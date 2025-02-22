import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { LanguageModelV1 } from "ai"
import { ClipboardCopy, StopCircle } from "lucide-react"
import { Trans } from "@lingui/react/macro"
import { Textarea } from "../components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { LANG, LANG_CODE } from "../lib/consts"
import { Button } from "../components/ui/button"
import { AIProviderContext } from "@/components/AIProvidersContext"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import {
  ModelSelectorContext,
  TModelSelectorContext,
} from "@/components/ModelSelectorContext"
import { t } from "@lingui/core/macro"
import { toast } from "sonner"
import ReasoningDisplay from "@/components/ReasoningDisplay"
import { useChat } from "@/hooks/useChat"
import { ErrorsToastText } from "@/components/ErrorsToastText"
import { stringifyObject } from "@/lib/utils"

interface ITranslator {
  model: LanguageModelV1 | null
  requireModel: TModelSelectorContext["requireModel"]
}

function InternalTranslator({ model, requireModel }: ITranslator) {
  const [sourceText, setSourceText] = useState("")
  const [targetLang, setTargetLang] = useState(LANG_CODE.LANG_EN)
  const {
    isChatting: isTranslating,
    isReasoning,
    result,
    startChat: translate,
    cancelChat: cancelTranslate,
  } = useChat({
    model,
    requireModel,
    onFinish: (finishReason) => {
      if (finishReason === "stop") toast.success(t`Translation completed`)
    },
    onError: (e) => {
      console.log(stringifyObject(e))
      if (e.name === "AbortError") toast.info(t`Translation cancelled`)
      else if (e.name === "TimeoutError") toast.error(ErrorsToastText[e.name])
    },
  })
  const targetLangTextareaRef = useRef<HTMLTextAreaElement>(null)
  const reasoningTextRef = useRef<HTMLParagraphElement>(null)

  const targetText = result.parts?.find((p) => p.type === "text")?.text
  const reasoningText = result.parts?.find(
    (p) => p.type === "reasoning"
  )?.reasoning

  const langs = useMemo(() => {
    return Object.entries(LANG)
      .filter(([key]) => key !== LANG_CODE.AUTO)
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, value]) => (
        <SelectItem key={key} value={key}>
          {value}
        </SelectItem>
      ))
  }, [])

  const writeToClipboard = useCallback(() => {
    if (targetText) {
      navigator.clipboard.writeText(targetText).then(() => {
        toast.info(t`Text copied to clipboard`)
      })
    }
  }, [targetText])

  const requestTranslate = useCallback(() => {
    translate({
      prompt: sourceText,
      system: `You're a translation engine now. Only translate the provided text to ${targetLang.replace("LANG_", "")} with no more words`,
    })
  }, [sourceText, targetLang, translate])

  // Not supported in Webview currently, use other solution LATER
  // const read = useCallback(() => {
  //   console.log(`${stringifyObject(window.navigator.userAgent)}`)
  //   const utterance = new window.SpeechSynthesisUtterance(targetText)
  //   utterance.lang = targetLang.replace("LANG_", "")

  //   speechSynthesis.speak(utterance)
  // }, [targetLang, targetText])

  useLayoutEffect(() => {
    if (targetLangTextareaRef.current) {
      targetLangTextareaRef.current.scrollTop =
        targetLangTextareaRef.current.scrollHeight
    }
  }, [targetText])

  useLayoutEffect(() => {
    if (reasoningTextRef.current) {
      reasoningTextRef.current.scrollTop = reasoningTextRef.current.scrollHeight
    }
  }, [reasoningText])

  return (
    <div className="w-[92%] self-center flex-auto flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <p className="whitespace-nowrap">
          <Trans>You're translating</Trans>
        </p>
        <Select disabled value={LANG_CODE.AUTO}>
          <SelectTrigger className="max-w-[200px]">
            <SelectValue></SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[32vh]">
            <SelectItem value={LANG_CODE.AUTO}>{LANG.AUTO}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        className="resize-none max-h-[15vh] py-2 focus:max-h-[42vh] transition-all"
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
      />
      <div className="flex items-center gap-2 self-start w-full">
        <p className="whitespace-nowrap">
          <Trans>Into</Trans>
        </p>
        <div className="flex-auto flex gap-2 justify-between">
          <Select
            value={targetLang}
            onValueChange={(lang: LANG_CODE) => setTargetLang(lang)}
          >
            <SelectTrigger className="max-w-[200px]">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent className="max-h-[32vh]">{langs}</SelectContent>
          </Select>
          <Button
            className="flex shrink-0 items-center gap-2"
            disabled={!sourceText}
            variant={isTranslating ? "destructive" : "default"}
            onClick={isTranslating ? cancelTranslate : requestTranslate}
          >
            {isTranslating && <StopCircle />}
            {isTranslating ? (
              <Trans>Stop</Trans>
            ) : model ? (
              <Trans>Translate</Trans>
            ) : (
              <Trans>Select model</Trans>
            )}
          </Button>
        </div>
      </div>
      <div className="flex flex-col w-full gap-4">
        {reasoningText && (
          <ReasoningDisplay
            isReasoning={isReasoning}
            reasoningText={
              result.parts?.find((p) => p.type === "reasoning")?.reasoning
            }
            buttonContent={
              <span>
                {isReasoning ? (
                  <Trans>Reasoning...</Trans>
                ) : (
                  <Trans>Check reasoning process</Trans>
                )}
              </span>
            }
            title={<Trans>Reasoning Process</Trans>}
            description={
              <Trans>
                You're using reasoning model in translation which is not
                recommended
              </Trans>
            }
          />
        )}
        {targetText && targetText.length > 0 && (
          <div className="relative w-full">
            <Textarea
              ref={targetLangTextareaRef}
              className="resize-none max-h-[23vh] w-full py-2 focus:max-h-[50vh] transition-all"
              readOnly
              value={targetText}
            />

            <Button
              variant="outline"
              className="absolute right-2 bottom-2 z-2"
              onClick={writeToClipboard}
            >
              <ClipboardCopy />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Translator() {
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

  return <InternalTranslator model={model} requireModel={requireModel} />
}
