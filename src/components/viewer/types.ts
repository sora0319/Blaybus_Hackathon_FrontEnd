export type Vec3 = { x: number; y: number; z: number }

export type PartDef = {
  id: string
  label: string
  path: string // public 경로: /models/...
  assembled: Vec3
  exploded: Vec3
}

export type ModelDef = {
  id: string
  name: string
  parts: PartDef[]
}

