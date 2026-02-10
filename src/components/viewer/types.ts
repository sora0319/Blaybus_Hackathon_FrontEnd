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
  // label은 데이터에 없으므로 선택적 속성(?)으로 바꾸거나 지워야 합니다.
  label?: string 
  material: string 
  desc: string 
  path: string 
  
  // ▼ 여기에 thumbnail을 추가해야 빨간 줄이 사라집니다.
  thumbnail: string

  assembled: { x: number, y: number, z: number }
  exploded: { x: number, y: number, z: number }
  rotation?: { x: number, y: number, z: number }
}

export type ModelDef = {
  // SuspensionModel 데이터에 id, name이 없다면 여기도 ?를 붙이거나 데이터에 추가해야 합니다.
  id?: string 
  name?: string
  
  // ▼ 데이터에 있는 description 객체를 받기 위해 추가
  description?: ModelDescription
  
  parts: PartDef[]
}