export type Language = 'en' | 'ta' | 'hi'

export type LocalizedName = Record<Language, string>

export interface District {
  id: string
  name: LocalizedName
}

export interface Department {
  id: string
  name: LocalizedName
  icon?: string
  handlesComplaints: boolean
}

export interface AdministrativeArea {
  id: number
  name: LocalizedName
  region?: string
  areaType: 'zone' | 'revenue_division'
}
