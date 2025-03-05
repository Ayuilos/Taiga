import { useEffect } from "react"
import { t } from "@lingui/core/macro"
import {
  createRootRoute,
  Outlet,
  useMatchRoute,
  useRouter,
} from "@tanstack/react-router"
import {
  ChevronRight,
  CloudCog,
  Languages,
  MessageSquare,
  Moon,
  Smartphone,
  Sun,
} from "lucide-react"

import { LastChatIDStore } from "@/lib/chat-store"
import { update } from "@/lib/updater"
import { dynamicActivate } from "@/lib/utils"
import ModelSelector from "@/components/ModelSelectorContext"
import { SettingsFeatureToggle } from "@/components/SettingsFeatureToggle"
import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
        <div className="min-h-screen max-h-screen flex flex-col">
          <header className="fixed top-0 z-20 flex justify-between items-center p-4 border-b w-full bg-background/90 backdrop-blur-xs">
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

  let matchedLabel = ""
  let matchedIcon = null

  const menuItems = Array.from(registry.entries())
    .filter(([paths, [label, icon]]) => {
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

      // only render unmatched
      return !matched
    })
    .map(([path, [label, icon]]) => {
      return (
        <DropdownMenuItem
          key={path.toString()}
          onClick={async () => {
            if (typeof path === "string" && path !== "/") {
              router.navigate({ to: path, replace: true })
            } else if (Array.isArray(path) && path.includes("/chat")) {
              const lastChatId = await LastChatIDStore.getLastChatID()

              if (lastChatId) {
                router.navigate({ to: `/chat/${lastChatId}`, replace: true })
              } else {
                router.navigate({ to: "/", replace: true })
              }
            }
          }}
        >
          {icon}
          {label}
        </DropdownMenuItem>
      )
    })

  const themeConfig = (
    <div className="w-full flex justify-center">
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {menuItems}
        <DropdownMenuSeparator />
        {themeConfig}
      </DropdownMenuContent>
    </DropdownMenu>
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
