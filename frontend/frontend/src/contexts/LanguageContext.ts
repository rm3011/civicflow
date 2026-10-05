import { createContext } from 'react'
import type { Language } from '../lib/constants'
import type { TranslationKey } from '../lib/i18n'

export interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey) => string
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
