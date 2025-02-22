import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog"
import { ChevronRight } from "lucide-react"
import { Button } from "./ui/button"
import { DialogHeader } from "./ui/dialog"
import { ReactNode, useLayoutEffect, useRef } from "react"

interface IReasoningDisplay {
  isReasoning: boolean
  buttonContent: ReactNode
  reasoningText: ReactNode
  title: ReactNode
  description: ReactNode
}
export default function ReasoningDisplay({
  isReasoning,
  buttonContent,
  title,
  description,
  reasoningText,
}: IReasoningDisplay) {
  const reasoningTextRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    if (reasoningText && reasoningTextRef.current) {
      reasoningTextRef.current.scrollTop = reasoningTextRef.current.scrollHeight
    }
  }, [reasoningText])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className={`self-center ${isReasoning ? "animate-pulse" : ""}`}
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
        <p ref={reasoningTextRef} className="flex-auto overflow-y-auto">
          {reasoningText}
        </p>
      </DialogContent>
    </Dialog>
  )
}
