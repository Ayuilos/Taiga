import { DefaultModelManagement } from "@/features/default-model-management"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_settingsLayout/settings/manage-default-models")(
  {
    component: DefaultModelManagement,
  }
)
