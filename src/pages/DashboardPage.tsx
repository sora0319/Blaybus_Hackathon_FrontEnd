'use client'

import React, { useEffect, useState } from 'react'
import { useNavigate } from "react-router-dom"
import { useAuth } from "../providers/AuthProvider"
import { getModelList } from "../api/model";
import type { ModelSummary } from "../api/types";


// 대시보드 페이지
export default function DashboardPage() {
  const auth = useAuth()
  console.log("DASHBOARD AUTH:", auth);
  const navigate = useNavigate()

  const [models, setModels] = useState<ModelSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.padding = '0'
  }, [])

  useEffect(() => {
    const fetchModels = async () => {
      
      try {
        const res = await getModelList()

        console.log("FULL RESPONSE:", res)
        console.log("MODEL DATA:", res.data)
        console.log("MODEL COUNT:", res.data.length)

        setModels(res.data)
      } catch {
        setError("모델 목록을 불러오지 못했습니다.")
      } finally {
        setLoading(false)
      }
    }

    fetchModels()
  }, [])

  if (auth.isAuthenticated === null) {
    return <div style={{ color: "white" }}>Auth Loading...</div>
  }
  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  return (
    <div style={containerStyle}>
      <main style={mainStyle}>
        <div style={titleSectionStyle}>
          <h1 style={mainTitleStyle}>PROJECT DASHBOARD</h1>
          <p style={subTitleStyle}>엔지니어링 프로젝트 관리 및 학습 대시보드</p>
        </div>

        <div style={gridStyle}>
          {models.map((model) => (
            <ProjectCard
              key={model.modelUuid}
              title={model.name}
              desc="모델 학습 및 구조 분석"
              imageSrc={model.imageUrl}
              onClick={() => navigate(`/study/${model.modelUuid}`)}
            />
          ))}
        </div>
      </main>
    </div>
  )
}

function ProjectCard({ title, desc, imageSrc, onClick }: any) {
  return (
    <div style={cardStyle}>
      {/* 상단 썸네일 영역 */}
      <div style={thumbnailContainerStyle}>
        {imageSrc ? (
          <img src={imageSrc} alt={title} style={thumbnailImageStyle} />
        ) : (
          <div style={placeholderStyle}>No Image</div>
        )}
      </div>
      
      {/* 하단 텍스트 영역 */}
      <div style={cardContentStyle}>
        <h3 style={cardTitleStyle}>{title}</h3>
        <p style={cardDescStyle}>{desc}</p>
        <button onClick={onClick} style={resumeBtnStyle}>Study</button>
      </div>
    </div>
  )
}


// STYLES (REFINED & READABLE)
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'radial-gradient(circle at center, #1e293b 0%, #080c14 100%)',
  color: 'white',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  paddingTop: '60px', // 헤더 높이만큼 여백 추가 
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  maxWidth: '1200px',
  width: '100%',
  margin: '0 auto',
  padding: '60px 20px',
  boxSizing: 'border-box',
};

const titleSectionStyle: React.CSSProperties = {
  marginBottom: '48px',
};

const mainTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: 800,
  letterSpacing: '-0.5px',
  margin: '0 0 8px 0',
};

const subTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#94a3b8',
  margin: 0,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '24px',
};

/* --- 카드 디자인 --- */
const cardStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden', // 이미지가 둥근 모서리에 맞게 잘리도록 설정
  backdropFilter: 'blur(10px)',
};

const thumbnailContainerStyle: React.CSSProperties = {
  width: '100%',
  height: '180px',
  background: '#0f172a',
  overflow: 'hidden',
};

const thumbnailImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover', // 컨테이너에 꽉 차게 조절
};

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#475569',
  fontSize: '14px',
};

const cardContentStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  margin: '0 0 12px 0',
};

const cardDescStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#64748b',
  lineHeight: '1.5',
  marginBottom: '24px',
  minHeight: '42px',
};

const resumeBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

/* --- 새 프로젝트 추가 카드 --- */
const addCardStyle: React.CSSProperties = {
  border: '1px dashed rgba(255, 255, 255, 0.15)',
  borderRadius: '16px',
  padding: '32px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  cursor: 'pointer',
  minHeight: '320px', // 일반 프로젝트 카드와 높이를 맞춤
};

const plusCircleStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  color: '#64748b',
  marginBottom: '16px',
};

const addTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  margin: '0 0 8px 0',
  color: '#cbd5e1',
};

const addDescStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  margin: 0,
};