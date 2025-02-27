import { SearchAPIManagement } from "@/features/search-api-management"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/manage-search-apis")({
  component: SearchAPIManagement,
})
