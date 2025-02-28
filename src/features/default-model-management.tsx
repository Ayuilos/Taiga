import { useContext, useEffect, useMemo, useState } from "react"
import { t } from "@lingui/core/macro"
import { produce } from "immer"
import {
  Check,
  ChevronDown,
  Languages,
  MessageSquare,
  Sticker,
} from "lucide-react"

import { IAIProvider } from "@/lib/ai-providers"
import { TDefaultModel, TDefaultModels } from "@/lib/default-model-store"
import { AIProviderContext } from "@/components/AIProvidersContext"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DefaultModelManagement() {
  const { providers, defaultModels, fetchDefaultModels, setDefaultModel } =
    useContext(AIProviderContext)

  return (
    <InternalDefaultModelManagement
      providers={providers}
      defaultModels={defaultModels}
      fetchDefaultModels={fetchDefaultModels}
      setDefaultModel={setDefaultModel}
    />
  )
}

interface IDefaultModelManagement {
  providers: IAIProvider[]
  defaultModels: TDefaultModels
  setDefaultModel: (
    type: keyof TDefaultModels,
    model: TDefaultModel
  ) => Promise<void>
  fetchDefaultModels: () => Promise<TDefaultModels>
}

function InternalDefaultModelManagement({
  providers,
  defaultModels,
  setDefaultModel,
  fetchDefaultModels,
}: IDefaultModelManagement) {
  useEffect(() => {
    fetchDefaultModels()
  }, [fetchDefaultModels])

  const labels = {
    translate: [<Languages size={20} />, t`Default Translate Model`],
    chat: [<MessageSquare size={20} />, t`Default Chat Model`],
    summarize: [<Sticker size={20} />, t`Default Chat Summarize Model`],
  }

  return (
    <div className="flex flex-col gap-8 w-[96%] items-center">
      {Object.entries(defaultModels).map((entry) => {
        const type = entry[0] as keyof TDefaultModels
        const model = entry[1]

        return (
          <div className="flex flex-col gap-2" key={type}>
            <Label className="flex items-center gap-2">{labels[type]}</Label>
            <DefaultModelSelector
              providers={providers}
              selectedModel={model}
              setSelectedModel={(model) => setDefaultModel(type, model)}
            />
          </div>
        )
      })}
    </div>
  )
}

interface IDefaultModelSelector {
  providers: IAIProvider[]
  selectedModel: TDefaultModel
  setSelectedModel: (defaultModel: TDefaultModel) => void
}
function DefaultModelSelector({
  providers,
  selectedModel,
  setSelectedModel,
}: IDefaultModelSelector) {
  const [open, setOpen] = useState(false)

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
            const selected = selectedModel && selectedModel[1] === model

            return (
              <CommandItem
                key={model}
                value={model}
                onSelect={() => {
                  setOpen(false)
                  setSelectedModel([provider.name, model])
                }}
              >
                <span>{model}</span>
                {selected && <Check />}
              </CommandItem>
            )
          })}
        </CommandGroup>
      )
    })
  }, [providers, selectedModel, setSelectedModel])

  const searchModelString = t`Search models...`
  const noModelEmptyString = t`No models found`

  return (
    <div className="flex flex-col w-60 gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full flex gap-2 justify-between"
          >
            <span className="flex-auto text-start truncate">
              {selectedModel?.[1]}
            </span>
            <ChevronDown />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder={searchModelString} />
            <CommandEmpty>{noModelEmptyString}</CommandEmpty>
            <CommandList>{commandList}</CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
