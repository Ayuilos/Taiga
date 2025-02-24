import { DefaultModelManagement } from "@/features/default-model-management"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/model-management/manage-default-models")(
  {
    component: DefaultModelManagement,
  }
)
