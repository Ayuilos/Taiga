import { dynamicActivate } from "./lib/utils"
import Translator from "./features/translator"

import "./App.css"

dynamicActivate("en")

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header>Taida</header>
      <main className="flex-auto container flex flex-col items-center justify-center gap-4">
        <Translator />
      </main>
    </div>
  )
}

export default App
