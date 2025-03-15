import { useCallback, useEffect, useState } from "react"
import { t } from "@lingui/core/macro"
import {
  createRootRoute,
  Outlet,
  useMatchRoute,
  useRouter,
} from "@tanstack/react-router"
import { openUrl } from "@tauri-apps/plugin-opener"
import {
  ChevronRight,
  CloudCog,
  Download,
  Languages,
  MessageSquare,
  Moon,
  Smartphone,
  Sun,
} from "lucide-react"
import { toast } from "sonner"

import { LastChatIDStore } from "@/lib/chat-store"
import {
  checkForUpdates,
  getCurrentVersion,
  TAIGA_GITHUB_URL,
  update,
} from "@/lib/updater"
import { dynamicActivate } from "@/lib/utils"
import ModelSelector from "@/components/ModelSelectorContext"
import { SettingsFeatureToggle } from "@/components/SettingsFeatureToggle"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Toaster } from "@/components/ui/sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import "../App.css"

// import { TanStackRouterDevtools } from "@tanstack/router-devtools"

dynamicActivate(navigator.language).catch((e) => {
  console.error(e)
  dynamicActivate("en")
})

export const Route = createRootRoute({
  component: function Root() {
    useEffect(() => {
      update()
    }, [])

    return (
      <>
        <div className="pt-8 min-h-screen max-h-screen flex flex-col">
          <header className="fixed top-0 z-20 flex justify-between items-center p-4 pt-12 border-b w-full bg-background/90 backdrop-blur-xs">
            <Navigation />
            <HeaderRegister />
          </header>
          <main className="flex-auto container flex flex-col">
            <Outlet />
          </main>
        </div>
        <Toaster />
        {/* <TanStackRouterDevtools /> */}
      </>
    )
  },
})

function Navigation() {
  const { theme, setTheme } = useTheme()
  const [showNavigationDialog, setShowNavigationDialog] = useState(false)
  const [isLatest, setIsLatest] = useState<boolean | undefined>(undefined)
  const [latestTag, setLatestTag] = useState("")
  // @ts-expect-error
  const registry: Map<string[] | string, [string, React.ReactNode]> = new Map([
    [
      ["/", "/chat"],
      [t`Chat`, <MessageSquare />],
    ],
    ["/translate", [t`Translate`, <Languages />]],
    ["/settings", [t`Settings`, <CloudCog />]],
  ])
  const router = useRouter()
  const matchRoute = useMatchRoute()

  const checkUpdate = useCallback(async () => {
    if (showNavigationDialog) {
      setIsLatest(undefined)
      setLatestTag("")

      const data = await checkForUpdates((e) => {
        toast.error(typeof e === "string" ? e : e.message)
        setLatestTag("Error")
      })

      if (data) {
        setIsLatest(data.isLatest)
        setLatestTag(data.tagName)
      }
    }
  }, [showNavigationDialog])

  useEffect(() => {
    checkUpdate()
  }, [checkUpdate])

  let matchedLabel = ""
  let matchedIcon = null

  const menuItems = Array.from(registry.entries()).map(
    ([paths, [label, icon]]) => {
      let matched =
        typeof paths === "string"
          ? matchRoute({ to: paths, fuzzy: true }) !== false
          : paths.some(
              (path) => matchRoute({ to: path, fuzzy: true }) !== false
            )

      if (matched) {
        matchedLabel = label
        matchedIcon = icon
      }

      return (
        <Button
          className={`${matched ? "border-primary" : ""}`}
          variant={matched ? "outline" : "secondary"}
          key={paths.toString()}
          onClick={async () => {
            if (!matched) {
              if (typeof paths === "string" && paths !== "/") {
                router.navigate({ to: paths, replace: true })
              } else if (Array.isArray(paths) && paths.includes("/chat")) {
                const lastChatId = await LastChatIDStore.getLastChatID()

                if (lastChatId) {
                  router.navigate({ to: `/chat/${lastChatId}`, replace: true })
                } else {
                  router.navigate({ to: "/", replace: true })
                }
              }
              setShowNavigationDialog(false)
            }
          }}
        >
          {icon}
          {label}
        </Button>
      )
    }
  )

  const themeConfig = (
    <div className="flex">
      <Tabs value={theme} onValueChange={setTheme as (t: string) => void}>
        <TabsList>
          <TabsTrigger value="light">
            <Sun />
          </TabsTrigger>
          <TabsTrigger value="dark">
            <Moon />
          </TabsTrigger>
          <TabsTrigger value="system">
            <Smartphone />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )

  const updateChecker = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm">{getCurrentVersion()}</span>
        {!isLatest ? (
          isLatest === undefined ? (
            <span className="text-xs text-muted-foreground">
              Checking Update...
            </span>
          ) : (
            <span className="inline-flex gap-2 text-sm">
              <span>{">"}</span>
              <span className="text-green-500">{latestTag}</span>
            </span>
          )
        ) : null}
      </div>
      {isLatest === false ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            openUrl(`${TAIGA_GITHUB_URL}/releases/tag/v${latestTag}`)
          }}
        >
          <Download />
        </Button>
      ) : null}
    </div>
  )

  return (
    <Dialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {matchedIcon}
          <span className="text-lg">{matchedLabel}</span>
          {
            <ChevronRight
              className={
                "in-data-[state=open]:rotate-90 transition-transform duration-300"
              }
            />
          }
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-2" showClose={false}>
        <DialogTitle className="sr-only">Navigation Dialog</DialogTitle>
        {menuItems}
        <DropdownMenuSeparator />
        <div className="w-full flex items-center gap-2 justify-between">
          <span className="inline-flex items-center gap-2">
            <img src="/310x310Logo.png" className="w-12 h-12 rounded-lg" />
            <span className="font-aeche">Taiga</span>
          </span>
          {themeConfig}
        </div>
        {updateChecker}
      </DialogContent>
    </Dialog>
  )
}

function HeaderRegister() {
  const registry = new Map([
    [["/", "/chat", "/translate"], <ModelSelector />],
    [["/settings"], <SettingsFeatureToggle />],
  ])

  const matchRoute = useMatchRoute()

  for (const [from, to] of registry) {
    if (from.some((p) => matchRoute({ to: p, fuzzy: true }))) {
      return to
    }
  }
}
