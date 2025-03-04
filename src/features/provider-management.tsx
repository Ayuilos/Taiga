import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { t } from "@lingui/core/macro"
import { produce } from "immer"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  Minus,
  Plus,
} from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import {
  AIProviderManager,
  IAIProvider,
  listModels,
  zAIProvider,
} from "@/lib/ai-providers"
import { diffStringArrays } from "@/lib/utils"
import {
  AIProviderContext,
  TAIProviderContextType,
} from "@/components/AIProvidersContext"
import { APIKeyNavigationDescription } from "@/components/ProviderAPIKeyNavigationDescription"
import { Alert, AlertTitle } from "@/components/ui/alert"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"

const formSchema = zAIProvider

const getNewProvider = () =>
  ({
    name: "New Provider",
    apiKey: "",
    baseURL: "",
    models: [],
  }) as IAIProvider

export default function ProviderManagement(
  props: Pick<IProviderManagement, "initProviderName" | "directManageModel">
) {
  const { allProviders, fetchProviders } = useContext(AIProviderContext)

  return (
    <InternalProviderManagement
      {...props}
      providers={allProviders}
      fetchProviders={fetchProviders}
    />
  )
}

interface IProviderManagement {
  providers: TAIProviderContextType["providers"]
  fetchProviders: TAIProviderContextType["fetchProviders"]
  initProviderName?: string
  directManageModel?: boolean
}
function InternalProviderManagement({
  providers,
  initProviderName,
  directManageModel = false,
  fetchProviders,
}: IProviderManagement) {
  const [currentProvider, _setCurrentProvider] = useState<IAIProvider>()
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [showModelManagement, setShowModelManagement] =
    useState(directManageModel)
  const [showProviderSelect, setShowProviderSelect] = useState(false)

  const prevProvider = useRef<IAIProvider>(undefined)

  const providerNameDuplicatedString = t`Provider name already exists`
  const form = useForm<z.infer<typeof formSchema>>({
    context: { providers, currentProvider },
    resolver: async (
      data,
      context: { providers: IAIProvider[]; currentProvider: IAIProvider },
      options
    ) =>
      zodResolver(
        // Finish all validations here, refer to https://zod.dev/?id=refine
        formSchema.refine(
          ({ name }) =>
            // The `resolver` function will be cached, provide dependencies in `context`.
            // Refer to https://www.react-hook-form.com/api/useform/#resolver Rules#2
            {
              const _providers = context.providers

              return _providers.every(
                (p) =>
                  context.currentProvider.name === p.name || name !== p.name
              )
            },
          {
            message: providerNameDuplicatedString,
            path: ["name"],
          }
        )
      )(data, context, options),
    defaultValues: { models: [] as string[] },
  })

  const pendingValues = form.watch()

  const modelsChange = useMemo(() => {
    const { added, removed } = diffStringArrays(
      currentProvider?.models || [],
      pendingValues.models
    )
    const addedModelsString = t`Added models`
    const removedModelsString = t`Removed models`

    return added.length > 0 || removed.length > 0 ? (
      <div className="flex flex-col gap-2">
        {added.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm">{addedModelsString}</span>
            {added.map((model) => (
              <Badge key={model} variant="outline" className="mr-2">
                {model}
              </Badge>
            ))}
          </div>
        )}
        {removed.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm">{removedModelsString}</span>
            {removed.map((model) => (
              <Badge key={model} variant="outline" className="mr-2">
                {model}
              </Badge>
            ))}
          </div>
        )}
      </div>
    ) : null
  }, [pendingValues.models, currentProvider?.models])

  const updateProvider = useCallback(
    (provider: IAIProvider) => {
      _setCurrentProvider(provider)

      form.reset(provider)
    },
    [form]
  )

  const cancelChange = useCallback(() => {
    form.reset()
  }, [form])

  const loadProvidersFromStore = useCallback(async () => {
    const _providers = await fetchProviders()

    if (_providers) {
      updateProvider(
        (initProviderName &&
          _providers.find((p) => p.name === initProviderName)) ||
          _providers[0]
      )
    }
  }, [initProviderName, fetchProviders, updateProvider])

  const addNewProvider = useCallback(() => {
    setIsAddingNew(true)
    prevProvider.current = currentProvider

    updateProvider(getNewProvider())
  }, [currentProvider, updateProvider])

  const cancelAdd = useCallback(() => {
    setIsAddingNew(false)

    updateProvider(prevProvider.current!)
  }, [updateProvider])

  const deleteCurrentProvider = useCallback(async () => {
    const deletedProviderIdx = providers.findIndex(
      (p) => p.name === currentProvider!.name
    )

    const newCurrentProvider =
      providers[deletedProviderIdx === 0 ? 1 : deletedProviderIdx - 1]

    updateProvider(newCurrentProvider)

    await AIProviderManager.deleteProvider(currentProvider!.name)
    await fetchProviders()
  }, [updateProvider, providers, currentProvider, fetchProviders])

  const onProviderChange = useCallback(
    (name: string) => {
      const provider = providers.find((_p) => _p.name === name)!

      updateProvider(provider)
    },
    [providers, updateProvider]
  )

  const onModelsChange = useCallback(
    (models: string[]) => {
      const oldModels = (form.formState.defaultValues?.models as string[]) || []

      const changed =
        Object.values(diffStringArrays(oldModels, models)).flat().length > 0

      if (changed) {
        form.setValue("models", models, { shouldDirty: true })
      } else {
        form.resetField("models")
      }
    },
    [form]
  )

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (isAddingNew) {
        await AIProviderManager.addProvider(values)
        fetchProviders()
        setIsAddingNew(false)
      } else {
        // If provider name has changed
        if (currentProvider!.name !== values.name) {
          await AIProviderManager.addProvider(values)
          await AIProviderManager.deleteProvider(currentProvider!.name)
          fetchProviders()
        } else {
          await AIProviderManager.modifyProvider(values.name, values)
          fetchProviders()
        }
      }
      updateProvider(values)
    },
    [isAddingNew, currentProvider, fetchProviders, updateProvider]
  )

  const providerItems = useMemo(() => {
    const { preset, custom } = produce(providers, (draft) =>
      draft.sort((a, b) =>
        a.name === currentProvider?.name
          ? -1
          : b.name === currentProvider?.name
            ? 1
            : a.name.localeCompare(b.name)
      )
    ).reduce<{
      preset: IAIProvider[]
      custom: IAIProvider[]
    }>(
      (classified, curr) => {
        if (curr.preset) classified.preset.push(curr)
        else classified.custom.push(curr)

        return classified
      },
      { preset: [], custom: [] }
    )

    const presetString = t`Preset`
    const customString = t`Custom`

    const mapFunc = (provider: IAIProvider) => {
      const selected = currentProvider?.name === provider.name

      return (
        <CommandItem
          className="flex items-center justify-between"
          key={provider.name}
          value={provider.name}
          onSelect={() => {
            setShowProviderSelect(false)
            onProviderChange(provider.name)
          }}
        >
          <span>{provider.name}</span>
          {selected ? <Check /> : null}
        </CommandItem>
      )
    }

    return (
      <CommandList>
        <CommandGroup heading={presetString}>
          {preset.map(mapFunc)}
        </CommandGroup>
        <CommandGroup heading={customString}>
          {custom.map(mapFunc)}
        </CommandGroup>
      </CommandList>
    )
  }, [providers, currentProvider?.name, onProviderChange])

  useEffect(() => {
    loadProvidersFromStore()
  }, [loadProvidersFromStore])

  const providerSearchString = t`Search provider...`
  const noProviderEmptyString = t`No provider found`
  const addingNewProviderString = t`You're adding new provider`
  const nameLabelString = t`Name`
  const apiKeyLabelString = t`API Key`
  const baseUrlLabelString = t`Base URL`
  const submitButtonString = isAddingNew ? t`Add` : t`Confirm`
  const cancelButtonString = t`Cancel`
  const modelManagementString = t`Model Management`
  const modelManagementButtonString = t`Manage Models`
  const deleteProviderButtonString = t`Delete Provider`
  const deleteProviderDialogTitleString = t`Are you sure you want to delete this provider?`
  const deleteProviderDialogCancelString = t`Cancel`
  const deleteProviderDialogConfirmString = t`Delete`

  const submitButtonKey = "submit-button"
  const cancelButtonKey = "cancel-button"

  const isLoading = form.formState.isValidating || form.formState.isSubmitting
  const loadingIcon = isLoading ? <Loader2 className="animate-spin" /> : null

  return (
    <div className="w-[92%] flex flex-col gap-4">
      {!isAddingNew ? (
        <div className="flex gap-2 items-center">
          <Popover
            open={showProviderSelect}
            onOpenChange={setShowProviderSelect}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex gap-2 justify-between"
              >
                <span className="flex-auto text-start truncate">
                  {currentProvider?.name}
                </span>
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0">
              <Command value={currentProvider?.name}>
                <CommandInput placeholder={providerSearchString} />
                <CommandEmpty>{noProviderEmptyString}</CommandEmpty>
                {providerItems}
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            className="aspect-square"
            size="icon"
            onClick={addNewProvider}
          >
            <Plus />
          </Button>
        </div>
      ) : null}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {isAddingNew ? (
            <Alert>
              <Info />
              <AlertTitle>{addingNewProviderString}</AlertTitle>
            </Alert>
          ) : null}
          <FormField
            control={form.control}
            name="name"
            disabled={pendingValues.preset}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{nameLabelString}</FormLabel>
                <FormControl>
                  <Input placeholder={nameLabelString} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{apiKeyLabelString}</FormLabel>
                <FormControl>
                  <Input placeholder={apiKeyLabelString} {...field} />
                </FormControl>
                <FormMessage />
                <APIKeyNavigationDescription
                  providerName={currentProvider?.name}
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="baseURL"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{baseUrlLabelString}</FormLabel>
                <FormControl>
                  <Input placeholder={baseUrlLabelString} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="models"
            render={({ field }) => (
              <FormItem>
                <Card className="flex-auto mt-4 flex flex-col">
                  <CardHeader className="items-center w-full">
                    <CardTitle>{modelManagementString}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {modelsChange}
                    <Button
                      type="button"
                      onClick={() => setShowModelManagement(true)}
                    >
                      {modelManagementButtonString}
                      <Badge variant="secondary">{field.value.length}</Badge>
                    </Button>
                  </CardContent>
                </Card>
              </FormItem>
            )}
          />

          {isAddingNew ? (
            <>
              <Button key={submitButtonKey} type="submit" disabled={isLoading}>
                {loadingIcon}
                {submitButtonString}
              </Button>
              <Button
                key={cancelButtonKey}
                variant="secondary"
                onClick={cancelAdd}
              >
                {cancelButtonString}
              </Button>
            </>
          ) : form.formState.isDirty ? (
            <>
              <Button key={submitButtonKey} type="submit" disabled={isLoading}>
                {loadingIcon}
                {submitButtonString}
              </Button>
              <Button
                key={cancelButtonKey}
                variant="secondary"
                onClick={cancelChange}
              >
                {cancelButtonString}
              </Button>
            </>
          ) : null}

          {!isAddingNew && providers.length > 1 && !pendingValues.preset ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  {deleteProviderButtonString}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {deleteProviderDialogTitleString}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {deleteProviderDialogCancelString}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={deleteCurrentProvider}
                  >
                    {deleteProviderDialogConfirmString}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </form>
      </Form>

      <ModelManagement
        // Need use pending-values to make sure the data fetching dependency is following the real-time
        provider={pendingValues}
        open={showModelManagement}
        onModelsChange={onModelsChange}
        onClose={() => setShowModelManagement(false)}
      />
    </div>
  )
}

interface IModelManagementProps {
  provider: IAIProvider | undefined
  open: boolean
  onModelsChange: (availableModelIDs: string[]) => void
  onClose: () => void
}
const NO_CATEGORY = "::NO_CATEGORY::"
export function ModelManagement({
  provider,
  open,
  onModelsChange,
  onClose,
}: IModelManagementProps) {
  const prevProviderBaseURL = useRef(provider?.baseURL)

  const [availableModelIDs, setAvailableModelIDs] = useState<string[]>([])
  const [isGettingModels, setIsGettingModels] = useState(false)
  const [showAddedModelsPanel, setShowAddedModelsPanel] = useState(false)

  if (prevProviderBaseURL.current !== provider?.baseURL) {
    setAvailableModelIDs([])
    prevProviderBaseURL.current = provider?.baseURL
  }

  const categoriedModelRecord = useMemo(() => {
    return availableModelIDs.reduce(
      (acc, modelID) => {
        // Check if the model is already added to the provider's models list. If so, skip it.
        if (provider?.models.some((model) => model === modelID)) {
          return acc
        }

        const firstSpliterIndex = modelID.indexOf("/")

        if (firstSpliterIndex !== -1) {
          const category = modelID.substring(0, firstSpliterIndex)

          acc[category] = [...(acc[category] || []), modelID]
        } else {
          acc[NO_CATEGORY] = [...(acc[NO_CATEGORY] || []), modelID]
        }

        return acc
      },
      {} as Record<string, string[]>
    )
  }, [availableModelIDs, provider?.models])

  const sortedModels = useMemo(() => {
    return Object.entries(categoriedModelRecord).sort((a, b) => {
      if (a[0] === NO_CATEGORY) return 1
      if (b[0] === NO_CATEGORY) return -1

      return a[0].localeCompare(b[0])
    })
  }, [categoriedModelRecord])

  const changeChoosedModels = useCallback(
    (action: "add" | "remove", modelID: string) => {
      const oldModels = provider?.models || []
      let newModels = [...oldModels]

      if (action === "add") {
        newModels.push(modelID)
      } else {
        newModels = newModels.filter((model) => model !== modelID)
      }

      const sortedModels = newModels.sort((a, b) => a.localeCompare(b))

      onModelsChange(sortedModels)
    },
    [onModelsChange, provider?.models]
  )

  const onDrawerClose = useCallback(
    (open: boolean) => {
      if (!open) onClose()
    },
    [onClose]
  )

  const getModelsFromProvider = useCallback(async () => {
    if (provider?.baseURL) {
      setIsGettingModels(true)

      try {
        const response = await listModels({
          name: provider.name,
          baseURL: provider.baseURL,
          apiKey: provider.apiKey,
        })

        if ("data" in response) {
          setAvailableModelIDs(response.data.map((model) => model.id))
        } else if ("models" in response) {
          setAvailableModelIDs(response.models.map((model) => model.name))
        }
      } catch (e: any) {
        if (e.name === "TimeoutError") {
          toast.error(t`Request timeout`)
        } else {
          toast.error(e.message)
        }
        setAvailableModelIDs([])
      }

      setIsGettingModels(false)
    }
  }, [provider?.name, provider?.baseURL, provider?.apiKey])

  useEffect(() => {
    if (open) {
      getModelsFromProvider()
    }
  }, [open, getModelsFromProvider])

  useLayoutEffect(() => {
    if (provider && provider.models.length > 0) {
      setShowAddedModelsPanel(true)
    }
  }, [provider])

  const description = isGettingModels ? t`Getting models...` : t`Choose models`
  const addedModelButtonString = t`Added models`
  const availableModelBadgeString = t`Available models`

  return provider ? (
    <Drawer open={open} onOpenChange={onDrawerClose}>
      <DrawerContent className="flex flex-col gap-2 max-h-[80vh] px-4">
        <DrawerHeader>
          <DrawerTitle>{provider.name}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <Toggle
          className="self-start group/model-management-added-models-button py-2"
          pressed={showAddedModelsPanel}
          onPressedChange={setShowAddedModelsPanel}
        >
          <span>{addedModelButtonString}</span>
          <Badge>{provider?.models.length || 0}</Badge>
          <ChevronRight className="group-data-[state=on]/model-management-added-models-button:rotate-90 transition-transform ease-in-out duration-200" />
        </Toggle>
        <div className="flex flex-col h-[62vh] overflow-hidden">
          <div
            className={`max-h-[20vh] flex flex-col shrink-0 overflow-hidden${!showAddedModelsPanel ? " hidden" : ""}${provider && provider.models.length > 0 ? " p-2 border rounded-md" : ""}`}
          >
            <div className="h-full flex flex-col overflow-y-auto gap-2">
              {provider?.models.map((modelID) => {
                return (
                  <div
                    key={modelID}
                    className="flex gap-2 items-center justify-between"
                  >
                    <span>{modelID}</span>
                    <Button
                      className="aspect-square border-red-500"
                      variant="outline"
                      onClick={() => {
                        changeChoosedModels("remove", modelID)
                      }}
                    >
                      <Minus className="text-red-500" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex-auto flex flex-col py-2 gap-2 overflow-hidden">
            <Toggle pressed className="self-start">
              <span>{availableModelBadgeString}</span>
            </Toggle>
            <div className="flex-auto flex flex-col p-2 border rounded-md overflow-hidden">
              <div className="flex-auto flex flex-col gap-2 overflow-auto">
                {sortedModels.map(([category, models]) => {
                  const modelItems = models.map((modelID) => {
                    return (
                      <div
                        key={modelID}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{modelID.replace(`${category}/`, "")}</span>
                        <Button
                          className="aspect-square"
                          onClick={() => {
                            changeChoosedModels("add", modelID)
                          }}
                        >
                          <Plus />
                        </Button>
                      </div>
                    )
                  })

                  return category !== NO_CATEGORY ? (
                    <Collapsible key={category}>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="outline"
                          className="group/model-management-category-button sticky top-0 bg-background/10 backdrop-blur-xs"
                        >
                          {category}
                          <ChevronRight className="group-data-[state=open]/model-management-category-button:rotate-90 transition-transform ease-in-out duration-200" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="flex flex-col px-4 py-2 gap-2">
                        {modelItems}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    modelItems
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  ) : null
}
