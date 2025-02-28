import { createFileRoute, Outlet } from "@tanstack/react-router"

export const Route = createFileRoute("/_settingsLayout")({
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <div className="flex flex-col items-center w-full pt-20">
      <Outlet />
    </div>
  )
}
