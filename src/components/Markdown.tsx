// Refer to https://github.com/vercel/ai-chatbot/blob/27ff56625848f091b40c65506858c146f742a047/components/markdown.tsx

import { memo } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import ReactMarkdown, { Options, type Components } from "react-markdown"
import rehypeKatex from "rehype-katex"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"

import { CodeBlock, PreBlock } from "./CodeBlock"

import "katex/dist/katex.min.css"

const components: Partial<Components> = {
  code: CodeBlock,
  pre: PreBlock,
  ol: ({ node, children, ...props }) => {
    return (
      <ol className="list-decimal ml-4" {...props}>
        {children}
      </ol>
    )
  },
  li: ({ node, children, ...props }) => {
    return (
      <li className="py-1" {...props}>
        {children}
      </li>
    )
  },
  ul: ({ node, children, ...props }) => {
    return (
      <ul className="list-disc ml-4" {...props}>
        {children}
      </ul>
    )
  },
  strong: ({ node, children, ...props }) => {
    return (
      <span className="font-semibold" {...props}>
        {children}
      </span>
    )
  },
  a: ({ node, children, href, ...props }) => {
    return (
      <a
        className="text-blue-500 hover:underline"
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          if (href) {
            openUrl(href)
          }
        }}
        {...props}
      >
        {children}
      </a>
    )
  },
  h1: ({ node, children, ...props }) => {
    return (
      <h1 className="text-3xl font-semibold my-1" {...props}>
        {children}
      </h1>
    )
  },
  h2: ({ node, children, ...props }) => {
    return (
      <h2 className="text-2xl font-semibold my-1" {...props}>
        {children}
      </h2>
    )
  },
  h3: ({ node, children, ...props }) => {
    return (
      <h3 className="text-xl font-semibold my-1" {...props}>
        {children}
      </h3>
    )
  },
  h4: ({ node, children, ...props }) => {
    return (
      <h4 className="text-lg font-semibold my-1" {...props}>
        {children}
      </h4>
    )
  },
  h5: ({ node, children, ...props }) => {
    return (
      <h5 className="text-base font-semibold my-1" {...props}>
        {children}
      </h5>
    )
  },
  h6: ({ node, children, ...props }) => {
    return (
      <h6 className="text-sm font-semibold my-1" {...props}>
        {children}
      </h6>
    )
  },
  hr: ({ node, children, ...props }) => {
    return <hr className="border-t border-gray-300" {...props} />
  },
}

const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex]

const NonMemoizedMarkdown = ({ children }: Pick<Options, "children">) => {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
      {children}
    </ReactMarkdown>
  )
}

export const Markdown = memo(
  NonMemoizedMarkdown,
  (prevProps, nextProps) => prevProps.children === nextProps.children
)
