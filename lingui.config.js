import { defineConfig } from "@lingui/cli"

export default defineConfig({
  sourceLocale: "en",
  locales: [
    "ar-AE",
    "bn-BD",
    "de-DE",
    "en",
    "en-US",
    "es-ES",
    "fr-FR",
    "hi-IN",
    "id-ID",
    "ja-JP",
    "ko-KR",
    "pt-BR",
    "ru-RU",
    "th-TH",
    "ur-PK",
    "vi-VN",
    "zh-CN",
    "zh-HK",
    "zh-TW",
  ],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
})
