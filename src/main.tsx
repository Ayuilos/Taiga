import React from "react"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import ReactDOM from "react-dom/client"

import AIProviderContextProvider from "./components/AIProvidersContext"
import { ModelSelectorContextProvider } from "./components/ModelSelectorContext"
import { SearchApisContextProvider } from "./components/SearchApisContext"
import { ThemeProvider } from "./components/ThemeProvider"
import { TooltipProvider } from "./components/ui/tooltip"
// Import the generated route tree
import { routeTree } from "./routeTree.gen"

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
            <SearchApisContextProvider>
              <TooltipProvider>
                <RouterProvider router={router} />
              </TooltipProvider>
            </SearchApisContextProvider>
          </ModelSelectorContextProvider>
        </AIProviderContextProvider>
      </ThemeProvider>
    </I18nProvider>
  </React.StrictMode>
)
