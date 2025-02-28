import { calculator } from "@agentic/calculator"
import { AIFunctionSet, createAIFunction } from "@agentic/core"
import { z } from "zod"

// TODO: ensure `expr` is sanitized to not run arbitrary code
export const CurrentTimeInputSchema = z.object({
  iso: z.boolean().optional(),
  utc: z.boolean().optional(),
})
export type CalculatorInput = z.infer<typeof CurrentTimeInputSchema>

const currentTime = createAIFunction(
  {
    name: "CurrentTime",
    description:
      "Get current time in ISO 8601 Extended Format(YYYY-MM-DDTHH:mm:ss.sssZ) or UTC string format. Will use ISO by default.",
    inputSchema: CurrentTimeInputSchema,
  },
  async ({ iso, utc }: CalculatorInput) => {
    return new Date()[
      iso ? "toISOString" : utc ? "toUTCString" : "toISOString"
    ]()
  }
)

export const commonAITools = new AIFunctionSet([calculator, currentTime])
