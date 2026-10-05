import { createContext, type Dispatch, type SetStateAction } from 'react'
import type { Language } from '../lib/constants'
import type { TranslationKey } from '../lib/i18n'

export interface LanguageContextValue {
  lang: Language
  setLang: Dispatch<SetStateAction<Language>>
  t: (key: TranslationKey) => string
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
