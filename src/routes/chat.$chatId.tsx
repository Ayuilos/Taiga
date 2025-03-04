import Chat from '@/features/chat'
import { LastChatIDStore, TChatID } from '@/lib/chat-store'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/chat/$chatId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { chatId } = Route.useParams()

  useEffect(() => {
    LastChatIDStore.setLastChatID(chatId as TChatID)
  }, [chatId])

  return <Chat chatId={chatId as TChatID} />
}
