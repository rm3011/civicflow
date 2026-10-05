import { useState, type ReactNode } from 'react'
import { LanguageContext } from './LanguageContext'
import type { Language } from '../lib/constants'
import { t as translate, type TranslationKey } from '../lib/i18n'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t: (key: TranslationKey) => translate(lang, key),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}
