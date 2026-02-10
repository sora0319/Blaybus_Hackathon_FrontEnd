// src/api/model.ts
import api from "./axios";
import type { ModelListResponse } from "./types";

export const getModelList = async (): Promise<ModelListResponse> => {
  const res = await api.get("/api/3d/models");
  return res.data;
};
