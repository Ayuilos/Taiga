import { t } from "@lingui/core/macro"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"
import { produce } from "immer"
import { Check } from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import { Button } from "./ui/button"
import { AIProviderContext, TAIProviderContextType } from "./AIProvidersContext"

export type TModelSelectorContext = ReturnType<typeof useModelSelector>
export const ModelSelectorContext = createContext<TModelSelectorContext>({
  showModel: false,
  closeModel: () => {},
  requireModel: () => {},
})
export function ModelSelectorContextProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const context = useModelSelector()

  return (
    <ModelSelectorContext.Provider value={context}>
      {children}
    </ModelSelectorContext.Provider>
  )
}

function useModelSelector() {
  const { fetchProviders } = useContext(AIProviderContext)

  const [showModel, setShowModel] = useState(false)

  const requireModel = useCallback(
    (callback?: () => void) => {
      if (!showModel) {
        setShowModel(true)
        fetchProviders().then(callback)
      }
    },
    [fetchProviders, showModel]
  )

  const closeModel = useCallback(() => {
    setShowModel(false)
  }, [])

  return {
    showModel,
    closeModel,
    requireModel,
  }
}

function InternalModelSelector({
  providers,
  selectedModel,
  showModel,
  setSelectedModel,
  requireModel,
  closeModel,
}: TAIProviderContextType & TModelSelectorContext) {
  // Check if `selectedModel` is still in `provider.models` and update if not
  // No unlimited rerender risk found
  if (selectedModel) {
    if (!providers.some((provider) => provider.models.includes(selectedModel[1]))) {
      setSelectedModel(null)
    }
  }

  const commandList = useMemo(() => {
    const sortedProviders = selectedModel
      ? produce(providers, (draft) => {
          const targetModel = selectedModel ? selectedModel[1] : ""
          const index = draft.findIndex((provider) =>
            provider.models.includes(targetModel)
          )

          if (index !== -1) {
            const [provider] = draft.splice(index, 1)
            const indexOfModel = provider.models.indexOf(targetModel)
            if (indexOfModel !== -1) {
              const [model] = provider.models.splice(indexOfModel, 1)
              provider.models.unshift(model)
            }

            draft.unshift(provider)
          }
        })
      : providers

    return sortedProviders.map((provider) => {
      return (
        <CommandGroup key={provider.name} heading={provider.name}>
          {provider.models.map((model) => {
            const modelName = model.replace(`${provider.name}/`, "")
            const selected = selectedModel && selectedModel[1] === model

            return (
              <CommandItem
                key={model}
                value={model}
                onSelect={() => {
                  closeModel()
                  setSelectedModel([provider.name, model])
                }}
              >
                <span>{modelName}</span>
                {selected && <Check className="ml-auto h-4 w-4" />}
              </CommandItem>
            )
          })}
        </CommandGroup>
      )
    })
  }, [providers, selectedModel, setSelectedModel, closeModel])

  const selectModelString = t`Select a model`
  const selectorName = selectedModel
    ? `${selectedModel[1]} | ${selectedModel[0]}`
    : selectModelString
  const emptyString = t`No models found`

  return (
    <>
      <Button variant="secondary" type="button" onClick={() => requireModel()}>
        <span className="max-w-[38vw] truncate text-left">{selectorName}</span>
      </Button>
      <CommandDialog open={showModel} onOpenChange={closeModel}>
        <CommandInput autoFocus={false} placeholder={selectModelString} />
        <CommandList>
          <CommandEmpty>{emptyString}</CommandEmpty>
          {commandList}
        </CommandList>
      </CommandDialog>
    </>
  )
}

export default function ModelSelector() {
  const providerContext = useContext(AIProviderContext)
  const selectorContext = useContext(ModelSelectorContext)

  return <InternalModelSelector {...providerContext} {...selectorContext} />
}
