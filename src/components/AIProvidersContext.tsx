import { AIProviderManager, IAIProvider } from "@/lib/ai-providers"
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from "react"

export default function AIProviderContextProvider({
  children,
}: PropsWithChildren) {
  const context = useAIProviderContext()

  return (
    <AIProviderContext.Provider value={context}>
      {children}
    </AIProviderContext.Provider>
  )
}

export type TAIProviderContextType = ReturnType<typeof useAIProviderContext>
export const AIProviderContext = createContext<TAIProviderContextType>({
  providers: [],
  allProviders: [],
  selectedModel: null,
  isLoadingProviders: false,
  setSelectedModel: () => {},
  fetchProviders: (async () => []) as () => Promise<IAIProvider[]>,
})

function useAIProviderContext() {
  const [allProviders, setAllProviders] = useState<IAIProvider[]>([])
  /** Selected model is a tuple of [providerId, modelId] */
  const [selectedModel, setSelectedModel] = useState<[string, string] | null>(
    null
  )
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(false)

  const providers = useMemo(
    () => allProviders.filter((p) => p.models.length > 0),
    [allProviders]
  )

  const fetchProviders = useCallback(async () => {
    setIsLoadingProviders(true)
    const _providers = await AIProviderManager.loadProviders()
    setIsLoadingProviders(false)
    setAllProviders(_providers)

    return _providers
  }, [])

  return {
    providers,
    allProviders,
    selectedModel,
    isLoadingProviders,
    setSelectedModel,
    fetchProviders,
  }
}
