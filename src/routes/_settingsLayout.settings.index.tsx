import ProviderManagement from "@/features/provider-management"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_settingsLayout/settings/")({
  component: ProviderManagement,
})
