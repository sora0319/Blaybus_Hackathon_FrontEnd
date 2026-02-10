// src/api/types.ts
export interface ModelSummary {
  modelUuid: string
  name: string
  imageUrl: string
}

export interface ModelListResponse {
  success: boolean
  message: string
  data: ModelSummary[]
}
