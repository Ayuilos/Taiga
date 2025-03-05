import { memo, useCallback, useState } from "react"
import { TUseChatReturnType } from "@/hooks/useChat"
import { t } from "@lingui/core/macro"
import { useRouter } from "@tanstack/react-router"
import { produce } from "immer"
import { Globe, Sparkle } from "lucide-react"

import { commonAITools } from "@/lib/common-ai-tools"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { Switch } from "./ui/switch"

interface IToolArea {
  availableSearchApis: TUseChatReturnType["availableSearchApis"]
  selectedSearchApi: string | undefined
  selectedCommonTools: string[]
  onSearchAPISelect: (apiName: string | undefined) => void
  onCommonToolsSelect: (toolName: string[]) => void
}
function UnMemoizedToolArea({
  availableSearchApis,
  selectedSearchApi,
  selectedCommonTools,
  onSearchAPISelect,
  onCommonToolsSelect,
}: IToolArea) {
  const router = useRouter()
  const [openSearch, setOpenSearch] = useState(false)
  const [openCommonTools, setOpenCommonTools] = useState(false)

  const [showSearchApiSetPopover, setShowSearchApiSetPopover] = useState(false)
  const [showCommonToolsPopover, setShowCommonToolsPopover] = useState(false)

  if (selectedSearchApi !== undefined && !openSearch) setOpenSearch(true)
  if (selectedCommonTools.length !== 0 && !openCommonTools)
    setOpenCommonTools(true)

  const noAvailableSearchApi = availableSearchApis.length === 0
  const searchIsOpen = selectedSearchApi !== undefined && openSearch
  const commonToolsIsOpen = selectedCommonTools.length !== 0 && openCommonTools

  const onSearchButtonClick = useCallback(async () => {
    if (openSearch) {
      setOpenSearch(false)
    } else {
      setShowSearchApiSetPopover(true)
      if (selectedSearchApi !== undefined) {
        setOpenSearch(true)
      }
    }
  }, [openSearch, selectedSearchApi])

  const onCommonToolsButtonClick = useCallback(async () => {
    if (openCommonTools) {
      setOpenCommonTools(false)
    } else {
      setShowCommonToolsPopover(true)
      if (selectedCommonTools.length !== 0) {
        setOpenCommonTools(true)
      }
    }
  }, [openCommonTools, selectedCommonTools.length])

  const jumpToSearchApiSetPageString = t`Your search api is not set`
  const jumpToSearchApiSetPageButtonString = t`Set now`
  const searchToolTitleString = t`Search Tool`
  const commonToolTitleString = t`Common Tool`

  const jumpToSearchApiSetPageContent = (
    <>
      <p>{jumpToSearchApiSetPageString}</p>
      <Button
        variant="ghost"
        onClick={() => {
          router.navigate({
            to: "/settings/manage-search-apis",
          })
        }}
      >
        {jumpToSearchApiSetPageButtonString} →
      </Button>
    </>
  )

  const openSearchButton = (
    <Popover
      open={showSearchApiSetPopover}
      onOpenChange={setShowSearchApiSetPopover}
    >
      <PopoverTrigger asChild>
        <Button
          className={`flex items-center gap-1 transition-all data-[state=open]:border-blue-200 data-[state=open]:border-2 data-[state=closed]:border-none rounded-full text-secondary-foreground${searchIsOpen ? " bg-blue-500 text-white" : " bg-blue-200/60"}`}
          size="icon"
          variant={searchIsOpen ? "default" : "outline"}
          onClick={onSearchButtonClick}
        >
          <Globe />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col p-2 gap-2 max-h-[40vh] w-fit bg-gradient-to-b from-blue-500/82 to-blue-500/40 backdrop-blur-xs text-white shadow-none border-none"
        side="top"
        sideOffset={12}
        align="start"
      >
        <p className="flex items-center gap-1">
          <Globe />
          {searchToolTitleString}
        </p>
        {noAvailableSearchApi
          ? jumpToSearchApiSetPageContent
          : availableSearchApis.map(({ name: apiName }) => (
              <div key={apiName} className="flex items-center gap-1">
                <Switch
                  className="data-[state=checked]:bg-blue-500"
                  id={apiName}
                  checked={selectedSearchApi === apiName}
                  onCheckedChange={(checked) =>
                    checked
                      ? onSearchAPISelect(apiName)
                      : onSearchAPISelect(undefined)
                  }
                />
                <Label htmlFor={apiName}>{apiName}</Label>
              </div>
            ))}
      </PopoverContent>
    </Popover>
  )

  const openCommonToolsButton = (
    <Popover
      open={showCommonToolsPopover}
      onOpenChange={setShowCommonToolsPopover}
    >
      <PopoverTrigger asChild>
        <Button
          className={`flex items-center gap-1 transition-all data-[state=open]:border-blue-200 data-[state=open]:border-2 data-[state=closed]:border-none rounded-full text-secondary-foreground${commonToolsIsOpen ? " bg-blue-500 text-white" : " bg-blue-200/60"}`}
          size="icon"
          variant={commonToolsIsOpen ? "default" : "outline"}
          onClick={onCommonToolsButtonClick}
        >
          <Sparkle
            fill="currentColor"
            fillOpacity={commonToolsIsOpen ? 100 : 0}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="flex flex-col p-2 gap-2 max-h-[40vh] w-fit bg-gradient-to-br from-blue-500/20 to-blue-500/90 backdrop-blur-xs text-white shadow-none border-none"
        side="top"
        sideOffset={12}
        align="start"
      >
        <p className="flex items-center gap-1">
          <Sparkle fill="currentColor" />
          {commonToolTitleString}
        </p>
        {commonAITools.map((_tool) => {
          const toolName = _tool.spec.name

          const index = selectedCommonTools.findIndex(
            (_toolName) => _toolName === toolName
          )
          const checked = index > -1
          const newSelectedCommonTools = produce(
            selectedCommonTools,
            (draft) => {
              if (checked) {
                draft.splice(index, 1)
              } else {
                draft.push(toolName)
              }
            }
          )

          return (
            <div key={toolName} className="flex items-center gap-1">
              <Switch
                className="data-[state=checked]:bg-blue-500"
                id={toolName}
                checked={selectedCommonTools.includes(toolName)}
                onCheckedChange={() => {
                  onCommonToolsSelect(newSelectedCommonTools)
                }}
              />
              <Label htmlFor={toolName}>{toolName}</Label>
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="flex items-center gap-1 p-1 bg-blue-100/40 rounded-full">
      {openSearchButton}
      {openCommonToolsButton}
    </div>
  )
}

export const ToolArea = memo(UnMemoizedToolArea)
