const API_BASE = '/api'

export interface Complaint {
  id: number
  description: string
  photo_url: string | null
  location: string
  problem_type: string
  severity: string
  ai_confidence: number
  ai_reasoning: string
  status: string
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

export interface Conflict {
  project_a_id: number
  project_a_name: string
  project_b_id: number
  project_b_name: string
  distance_m: number
  authority_a: string
  authority_b: string
  start_date: string
  end_date: string
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

export async function listComplaints(): Promise<Complaint[]> {
  const res = await fetch(`${API_BASE}/complaints`)
  if (!res.ok) throw new Error('Failed to fetch complaints')
  return res.json()
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  return res.json()
}

export async function listConflicts(): Promise<{ count: number; conflicts: Conflict[] }> {
  const res = await fetch(`${API_BASE}/conflicts`)
  if (!res.ok) throw new Error('Failed to fetch conflicts')
  return res.json()
}

export async function submitComplaint(data: {
  description: string
  latitude: number
  longitude: number
  photo_url?: string
}): Promise<{ complaint: Complaint; nearby_projects: NearbyProject[]; coordination_needed: boolean }> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to submit complaint')
  return res.json()
}