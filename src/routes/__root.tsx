import {
  createRootRoute,
  Outlet,
  useMatchRoute,
  useRouter,
} from "@tanstack/react-router"
import { ChevronRight, CloudCog, Languages, MessageSquare } from "lucide-react"
import { t } from "@lingui/core/macro"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { dynamicActivate } from "@/lib/utils"
import ModelSelector from "@/components/ModelSelectorContext"
import { Toaster } from "@/components/ui/sonner"

import "../App.css"

dynamicActivate("en")

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="min-h-screen max-h-screen flex flex-col">
        <header className="fixed top-0 z-20 flex justify-between items-center p-4 border-b w-full bg-background/80 backdrop-blur-xs">
          <Navigation />
          <ModelSelectorRegister />
        </header>
        <main className="flex-auto container flex flex-col">
          <Outlet />
        </main>
      </div>
      <Toaster />
      {/* <TanStackRouterDevtools /> */}
    </>
  ),
})

function Navigation() {
  const registry: Record<string, [string, React.ReactNode]> = {
    "/": [t`Chat`, <MessageSquare />],
    "/translate": [t`Translate`, <Languages />],
    "/manage-providers": [t`Model Management`, <CloudCog />],
  }
  const router = useRouter()
  const matchRoute = useMatchRoute()

  let matchedLabel = ""
  let matchedIcon = null

  const menuItems = Object.entries(registry)
    .filter(([path, [label, icon]]) => {
      const matched = matchRoute({ to: path, fuzzy: true }) !== false

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
          key={path}
          onClick={() => router.navigate({ to: path, replace: true })}
        >
          {icon}
          {label}
        </DropdownMenuItem>
      )
    })

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
      <DropdownMenuContent align="start">{menuItems}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModelSelectorRegister() {
  const registry = ["/", "/translate"]

  const matchRoute = useMatchRoute()

  return registry.some(
    (path) => matchRoute({ to: path, fuzzy: true }) !== false
  ) ? (
    <ModelSelector />
  ) : null
}
