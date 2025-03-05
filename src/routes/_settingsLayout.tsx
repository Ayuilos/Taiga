import { SiGithub } from "@icons-pack/react-simple-icons"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { openUrl } from "@tauri-apps/plugin-opener"

import { TAIGA_GITHUB_URL, updaters } from "@/lib/updater"

export const Route = createFileRoute("/_settingsLayout")({
  component: SettingsLayout,
})

function SettingsLayout() {
  const currentVersion = updaters[updaters.length - 1][0]

  return (
    <div className="flex flex-col items-center flex-auto w-full pt-20">
      <div className="flex flex-col items-center flex-auto w-full">
        <Outlet />
      </div>
      <div className="flex flex-col p-3">
        <a
          className="text-sm flex items-center gap-1"
          onClick={() => {
            openUrl(TAIGA_GITHUB_URL)
          }}
        >
          <SiGithub />
          <span className="text-blue-500">Taiga v{currentVersion}</span>
        </a>
      </div>
    </div>
  )
}
