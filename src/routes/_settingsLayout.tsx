import { SiGithub } from "@icons-pack/react-simple-icons"
import { createFileRoute, Outlet } from "@tanstack/react-router"
import { openUrl } from "@tauri-apps/plugin-opener"

import { getCurrentVersion, TAIGA_GITHUB_URL } from "@/lib/updater"

export const Route = createFileRoute("/_settingsLayout")({
  component: SettingsLayout,
})

function SettingsLayout() {
  const currentVersion = getCurrentVersion()

  return (
    <div className="flex flex-col items-center flex-auto overflow-hidden w-full pt-20">
      <div className="flex flex-col items-center flex-auto w-full overflow-y-auto">
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
