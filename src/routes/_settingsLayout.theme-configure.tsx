import { ThemeConfigure } from "@/features/theme-configure"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_settingsLayout/theme-configure")({
  component: ThemeConfigure,
})
