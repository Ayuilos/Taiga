"use client"

// Refer to https://github.com/vercel/ai-chatbot/blob/27ff56625848f091b40c65506858c146f742a047/components/code-block.tsx
import { ComponentProps, useCallback } from "react"
import { useIsDark } from "@/hooks/useIsDark"
import { t } from "@lingui/core/macro"
import { debounce } from "lodash-es"
import { Copy } from "lucide-react"
import { ExtraProps } from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  atomDark as dark,
  oneLight as light,
} from "react-syntax-highlighter/dist/esm/styles/prism"
import { toast } from "sonner"

import { Button } from "./ui/button"

export function PreBlock({
  node,
  children,
}: ComponentProps<"pre"> & ExtraProps) {
  const copyCode = useCallback(
    debounce(() => {
      const codeNode = node?.children.find(
        (c) => c.type === "element" && c.tagName === "code"
      )
      const codeContent =
        codeNode?.type === "element"
          ? codeNode.children.find((c) => c.type === "text")?.value
          : undefined

      if (codeContent) {
        navigator.clipboard.writeText(codeContent)
        toast.success(t`Copied to clipboard`)
      }
    }, 500),
    [children]
  )

  return (
    <div className="relative">
      <Button
        className="absolute top-2 right-2 opacity-60"
        size="icon"
        variant="outline"
        onClick={copyCode}
      >
        <Copy />
      </Button>
      {children}
    </div>
  )
}

export function CodeBlock({
  node,
  className,
  children,
  ...props
}: ComponentProps<"code"> & ExtraProps) {
  const isDark = useIsDark()
  const inline = node?.position?.start.line === node?.position?.end.line

  const match = /language-(\w+)/.exec(className || "")

  return inline ? (
    <code
      className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 py-0.5 px-1 rounded-md`}
      {...props}
    >
      {children}
    </code>
  ) : (
    // @ts-ignore
    <SyntaxHighlighter
      {...props}
      PreTag="div"
      children={String(children).replace(/\n$/, "")}
      language={match ? match[1] : "text"}
      showLineNumbers
      wrapLines
      style={isDark ? dark : light}
    />
  )
}
