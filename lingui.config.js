import { defineConfig } from "@lingui/cli"

export default defineConfig({
  sourceLocale: "en",
  locales: [
    "zh-CN",
    "en",
    "zh-TW",
    "hi",
    "es",
    "ar",
    "fr",
    "bn",
    "pt",
    "ru",
    "ur",
    "id",
    "de",
    "ja",
    "vi",
    "th",
    "ko",
  ],
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
})
