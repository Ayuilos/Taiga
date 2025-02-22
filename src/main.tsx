import React from "react"
import ReactDOM from "react-dom/client"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { ThemeProvider } from "./components/ThemeProvider"
import { ModelSelectorContextProvider } from "./components/ModelSelectorContext"
import AIProviderContextProvider from "./components/AIProvidersContext"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"
import { TooltipProvider } from "./components/ui/tooltip"

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider i18n={i18n}>
      <ThemeProvider>
        <AIProviderContextProvider>
          <ModelSelectorContextProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </ModelSelectorContextProvider>
        </AIProviderContextProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>
)
