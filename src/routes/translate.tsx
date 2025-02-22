import Translator from "@/features/translator"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/translate")({
  component: Translator,
})
