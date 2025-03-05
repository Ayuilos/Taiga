import { ReactNode, useLayoutEffect, useMemo, useRef } from "react"
import { SearchReturnSchema, TSearchReturnType } from "@/hooks/useChat"
import { openUrl } from "@tauri-apps/plugin-opener"
import { ChevronRight } from "lucide-react"

import { Button } from "./ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"

interface IToolCallDisplay {
  isCalling: boolean
  buttonContent: ReactNode
  toolCallResult: any
  title: ReactNode
  description: ReactNode
}

// [TODO] Support Exa Tool Calling Result Display
export default function ToolCallDisplay({
  isCalling,
  buttonContent,
  title,
  description,
  toolCallResult,
}: IToolCallDisplay) {
  const toolCallResultRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    if (toolCallResult && toolCallResultRef.current) {
      toolCallResultRef.current.scrollTop =
        toolCallResultRef.current.scrollHeight
    }
  }, [toolCallResult])

  const result = useMemo(() => {
    if (
      typeof toolCallResult === "string" ||
      typeof toolCallResult === "number"
    ) {
      return toolCallResult
    } else if (SearchReturnSchema.safeParse(toolCallResult).success) {
      return (toolCallResult as TSearchReturnType).data.map(
        ({ url, title, description, favicon, usage: { tokens } }, index) => {
          return (
            <div
              key={`${index}-${url}`}
              className="flex flex-col gap-1 p-2 border rounded-md"
              onClick={async () => {
                await openUrl(url)
              }}
            >
              <p className="flex items-center gap-1 w-full">
                {favicon ? <img src={favicon} width={16} height={16} /> : null}
                <span className="truncate">{title}</span>
              </p>
              <p className="text-sm w-full truncate">{description}</p>
              <p className="text-xs text-muted-foreground">
                Used token: {tokens.toString()}
              </p>
            </div>
          )
        }
      )
    }
  }, [toolCallResult])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className={`self-center ${isCalling ? "animate-pulse" : ""}`}
        >
          {buttonContent}
          <ChevronRight />
        </Button>
      </DialogTrigger>
      <DialogContent
        showClose={false}
        className="max-h-[62vh] flex flex-col overflow-hidden z-100"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div
          ref={toolCallResultRef}
          className="flex flex-col flex-auto overflow-y-auto gap-2"
        >
          {result}
        </div>
      </DialogContent>
    </Dialog>
  )
}
