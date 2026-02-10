export type Vec3 = { x: number; y: number; z: number }

// description 내부의 usage, theory 등을 위한 타입 정의
export type ContentItem = {
  title: string
  content: string
  details?: string
}

export type ModelDescription = {
  title: string
  summary: string
  usage: ContentItem[]
  theory: ContentItem[]
}

export type PartDef = {
  id: string
  name: string
  // label?: string 
  material: string 
  desc: string 
  path: string 
  thumbnail: string
  partUuid?: string

  assembled: { x: number, y: number, z: number }
  exploded: { x: number, y: number, z: number }
  rotation?: { x: number, y: number, z: number }
}

export type ModelDef = {
  id?: string 
  name?: string
  description?: ModelDescription
  parts: PartDef[]
}