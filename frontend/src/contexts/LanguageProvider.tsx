import { useState, type ReactNode } from 'react'
import { LanguageContext } from './LanguageContext'
import type { LanguageContextValue } from './LanguageContext'
import { t as translate } from '../lib/i18n'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageContextValue['lang']>('en')

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key) => translate(lang, key),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
