import {
  createContext,
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from "react"
import { produce } from "immer"

import { AIProviderManager, IAIProvider } from "@/lib/ai-providers"
import {
  DefaultModelStore,
  TDefaultModels,
} from "@/lib/default-model-store"

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
  defaultModels: {
    translate: null,
    chat: null,
    summarize: null,
  },
  selectedModel: null,
  isLoadingProviders: false,
  setDefaultModel: async () => {},
  setSelectedModel: () => {},
  fetchProviders: (async () => []) as () => Promise<IAIProvider[]>,
  fetchDefaultModels: (async () => ({})) as () => Promise<TDefaultModels>,
})

function useAIProviderContext() {
  const [allProviders, setAllProviders] = useState<IAIProvider[]>([])
  /** Selected model is a tuple of [providerId, modelId] */
  const [selectedModel, setSelectedModel] = useState<[string, string] | null>(
    null
  )
  const [defaultModels, setDefaultModels] = useState<TDefaultModels>({
    translate: null,
    chat: null,
    summarize: null,
  })
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

  const fetchDefaultModels = useCallback(async () => {
    const _defaultModels = await DefaultModelStore.getDefaultModels()
    const newProviders = await fetchProviders()

    const validDefaultModels = produce(_defaultModels, (draft) => {
      Object.entries(draft)
        .filter(([_, model]) => model !== null)
        .forEach(async ([type, model]) => {
          let found = false
          for (const provider of newProviders) {
            if (provider.name === model![0]) {
              if (provider.models.includes(model![1])) {
                found = true
                break
              } else {
                break
              }
            }
          }
          if (!found) {
            draft[type as keyof TDefaultModels] = null

            // effect
            await DefaultModelStore.setDefaultModel(
              type as keyof TDefaultModels,
              null
            )
          }
        })
    })

    setDefaultModels(validDefaultModels)

    return validDefaultModels
  }, [fetchProviders])

  const setDefaultModel = useCallback<typeof DefaultModelStore.setDefaultModel>(
    async (type, model) => {
      await DefaultModelStore.setDefaultModel(type, model)
      await fetchDefaultModels()
    },
    [fetchDefaultModels]
  )

  return {
    providers,
    allProviders,
    selectedModel,
    defaultModels,
    isLoadingProviders,
    setDefaultModel,
    setSelectedModel,
    fetchProviders,
    fetchDefaultModels,
  }
}
