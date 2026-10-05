import type { AdministrativeArea, Department, District } from './constants'

const API_BASE = '/api'

interface ApiName {
  id: string | number
  name: string
  name_ta: string
  name_hi: string
}

function localizeName(value: ApiName): { en: string; ta: string; hi: string } {
  return { en: value.name, ta: value.name_ta, hi: value.name_hi }
}

async function getJson<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${errorMessage} (${response.status})`)
  return response.json()
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  let detail: string | undefined
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const value = body.detail
      detail = typeof value === 'string' ? value : JSON.stringify(value)
    }
  } catch {
    // Use the HTTP status when the response has no JSON error body.
  }
  return new Error(
    detail ? `${fallback}: ${detail}` : `${fallback} (${response.status})`
  )
}

export async function listDistricts(): Promise<District[]> {
  const districts = await getJson<ApiName[]>(
    `${API_BASE}/constants/districts`,
    'Failed to fetch districts'
  )
  return districts.map((district) => ({
    id: String(district.id),
    name: localizeName(district),
  }))
}

export async function listDepartments(city: string): Promise<Department[]> {
  const query = new URLSearchParams({ city })
  const departments = await getJson<
    (ApiName & { icon?: string; handles_complaints: boolean })[]
  >(`${API_BASE}/constants/departments?${query}`, 'Failed to fetch departments')
  return departments.map((department) => ({
    id: String(department.id),
    name: localizeName(department),
    icon: department.icon,
    handlesComplaints: department.handles_complaints,
  }))
}

export async function listAdministrativeAreas(city: string): Promise<AdministrativeArea[]> {
  const query = new URLSearchParams({ city })
  const areas = await getJson<
    (ApiName & { region?: string; area_type: AdministrativeArea['areaType'] })[]
  >(
    `${API_BASE}/constants/areas?${query}`,
    'Failed to fetch administrative areas'
  )
  return areas.map((area) => ({
    id: Number(area.id),
    name: localizeName(area),
    region: area.region,
    areaType: area.area_type,
  }))
}

export interface Complaint {
  id: number
  description: string
  photo_url: string | null
  location: string
  problem_type: string
  department_id: string | null
  zone_id: number | null
  severity: string
  ai_confidence: number
  ai_reasoning: string
  status: string
  sanctioned_by: string | null
  completed?: boolean
  completed_at?: string | null
  completed_by?: string | null
  created_at: string
}

export interface Project {
  id: number
  name: string
  authority: string
  work_type: string
  location: string
  start_date: string
  end_date: string
  status: string
  created_at: string
}

export interface ComplaintConflict {
  complaint_a_id: number
  complaint_a_description: string
  complaint_a_problem_type: string
  complaint_a_status: string
  complaint_a_completed: boolean
  complaint_a_severity: string
  complaint_a_department_id: string | null
  complaint_a_created_at: string
  complaint_b_id: number
  complaint_b_description: string
  complaint_b_problem_type: string
  complaint_b_status: string
  complaint_b_completed: boolean
  complaint_b_severity: string
  complaint_b_department_id: string | null
  complaint_b_created_at: string
  distance_m: number
  coordination_type:
    | 'sequence'
    | 'coordinate'
    | 'related_reports'
    | 'manual_review'
    | 'completed_nearby'
  recommended_first_id: number | null
  recommended_second_id: number | null
  recommendation_reason: string
}

export interface NearbyProject {
  id: number
  name: string
  authority: string
  work_type: string
  distance_m: number
  start_date: string
  end_date: string
  status: string
}

export async function listComplaints(params?: {
  department?: string
  areaId?: number
  city?: string
}): Promise<Complaint[]> {
  const query = new URLSearchParams()
  if (params?.department) query.set('department', params.department)
  if (params?.areaId) query.set('zone', String(params.areaId))
  if (params?.city) query.set('city', params.city)
  const res = await fetch(`${API_BASE}/complaints?${query.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch complaints')
  return res.json()
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function listComplaintConflicts(
  city: string,
  zone: number
): Promise<{ count: number; conflicts: ComplaintConflict[] }> {
  const query = new URLSearchParams({ city, zone: String(zone) })
  const res = await fetch(`${API_BASE}/complaint-conflicts?${query}`)
  if (!res.ok) throw await responseError(res, 'Failed to analyze nearby complaints')
  return res.json()
}

export async function submitComplaint(data: {
  description: string
  latitude: number
  longitude: number
  city: string
  zone_id: number
  photo_url?: string
}): Promise<{ complaint: Complaint; nearby_projects: NearbyProject[]; coordination_needed: boolean }> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw await responseError(res, 'Failed to submit complaint')
  return res.json()
}

export async function sanctionComplaint(id: number, sanctioned: boolean): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/sanction`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sanctioned }),
  })
  if (!res.ok) throw await responseError(res, 'Failed to update sanction')
  return res.json()
}

export async function setComplaintCompleted(
  id: number,
  completed: boolean
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/completion`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  })
  if (!res.ok) throw await responseError(res, 'Failed to update completion')
  return res.json()
}

export async function uploadPhoto(file: File): Promise<{ photo_url: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) throw await responseError(res, 'Photo upload failed')
  return res.json()
}