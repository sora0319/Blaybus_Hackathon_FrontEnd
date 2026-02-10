'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ViewerCanvas from '../components/viewer/ViewerCanvas'
import type { ViewerCanvasHandle } from '../components/viewer/ViewerCanvas'
import { RobotArmModel } from '../components/viewer/objects/RobotArm/model'
import { SuspensionModel } from '../components/viewer/objects/Suspension/model'
import { V4EngineModel } from '../components/viewer/objects/V4Engine/model'
import { RobotGripperModel } from '../components/viewer/objects/RobotGripper/model'
import Header from '../components/Header'
import type { ModelDef } from '../components/viewer/types'
import api from '../api/axios'

// ----------------------------------------------------------------------
// Constants & Types
// ----------------------------------------------------------------------
const LOCAL_MODEL_DATA: Record<string, ModelDef> = {
  robotarm: RobotArmModel,
  suspension: SuspensionModel,
  v4engine: V4EngineModel,
  robotgripper: RobotGripperModel,
};

type StudyViewMode = 'single' | 'assembly' | 'edit' | 'simulator'

interface ApiUsage { title: string; content: string; }
interface ApiTheory { title: string; content: string; details: string; }
interface ApiPart { partUuid: string; partUrl: string; }

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    modelUuid: string;
    title: string;
    summary: string;
    usage: ApiUsage[];
    theory: ApiTheory[];
    parts: ApiPart[];
  };
}

interface PartDetailData {
  partUuid: string;
  name: string;
  material: string;
  description: string;
  partModelUrl: string;
  thumbnailUrl: string;
}

interface PartDetailResponse {
  success: boolean;
  message: string;
  data: PartDetailData;
}

// ----------------------------------------------------------------------
// Helper: 파일명 추출 및 정규화 함수 (매칭 정확도 향상용)
// ----------------------------------------------------------------------
const getPureFileName = (pathOrUrl: string | undefined) => {
    if (!pathOrUrl) return "";
    const filename = pathOrUrl.split('/').pop()?.split('?')[0] || "";
    return decodeURIComponent(filename).toLowerCase().replace('.glb', '');
};

// 이름 정규화 (보조 수단)
const normalizeName = (name: string | undefined) => {
    if (!name) return "";
    return decodeURIComponent(name)
      .toUpperCase()
      .replace(/\s/g, '') // 공백 제거
      .replace(/[\-_]/g, ''); // 특수문자 제거
};

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------
// UI에서 사용할 메시지 타입
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// API 응답 데이터 타입 (History)
interface ApiHistoryItem {
  id: number;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

interface ApiHistoryResponse {
  success: boolean;
  message: string;
  data: ApiHistoryItem[];
}

// ----------------------------------------------------------------------
// AI Assistant Component (Chat Interface with History)
// ----------------------------------------------------------------------
const AIAssistantPanel = ({ 
  modelUuid, 
  targetPart, 
  active 
}: { 
  modelUuid: string | undefined, 
  targetPart: string | null, 
  active: boolean 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // 히스토리 로딩 여부 체크
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 헬퍼 함수: 메시지 내용 정제 (따옴표 제거 등)
  const cleanContent = (text: string) => {
    if (!text) return "";
    // 예: "\"안녕\"" -> "안녕" (양끝의 따옴표가 있다면 제거)
    if (text.startsWith('"') && text.endsWith('"') && text.length > 1) {
      return text.slice(1, -1).replace(/\\"/g, '"'); // 이스케이프 된 따옴표 복구
    }
    return text;
  };

  // 초기 데이터(History) 불러오기
  useEffect(() => {
    const fetchHistory = async () => {
      if (!modelUuid) return;

      try {
        const res = await api.get<ApiHistoryResponse>(`/api/chat/${modelUuid}/history`);
        
        if (res.data.success && Array.isArray(res.data.data)) {
          const historyData = res.data.data;

          if (historyData.length > 0) {
            // 히스토리가 있으면 매핑해서 상태 업데이트
            const mappedMessages: ChatMessage[] = historyData.map((item) => ({
              id: item.id.toString(),
              role: item.role === 'USER' ? 'user' : 'assistant',
              text: cleanContent(item.content),
              timestamp: new Date(item.createdAt).getTime()
            }));
            setMessages(mappedMessages);
          } else {
            // 히스토리가 비어있으면 환영 메시지 추가
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              text: "안녕하세요! 이 모델에 대해 궁금한 점이 있으신가요? 부품을 선택하거나 자유롭게 질문해 주세요.",
              timestamp: Date.now()
            }]);
          }
        }
      } catch (err) {
        console.error("채팅 기록 불러오기 실패:", err);
        // 에러 발생 시에도 최소한 환영 메시지는 띄움
        setMessages([{
          id: 'welcome-error',
          role: 'assistant',
          text: "이전 대화 내용을 불러오는 데 실패했습니다. 새 대화를 시작할 수 있습니다.",
          timestamp: Date.now()
        }]);
      } finally {
        setIsHistoryLoaded(true);
      }
    };

    fetchHistory();
  }, [modelUuid]);

  // 스크롤 자동 이동 (메시지 변경 시)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isHistoryLoaded) {
      scrollToBottom();
    }
  }, [messages, isLoading, isHistoryLoaded]);

  // 메시지 전송 핸들러
  const handleSendMessage = async () => {
    if (!input.trim() || !modelUuid) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post(`/api/chat/${modelUuid}/message`, {
        message: userMsg.text
      });

      if (res.data.success) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: res.data.message,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(res.data.message || "응답 실패");
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: "죄송합니다. 오류가 발생하여 답변을 가져올 수 없습니다.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section style={{ ...panelCardStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
        <h3 style={{ ...panelTitleStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🤖</span> AI Assistant
        </h3>
        <div style={statusDotStyle(active)} />
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {!isHistoryLoaded && (
           <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
             대화 내용을 불러오는 중...
           </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            <div style={{ 
              marginBottom: '4px', 
              fontSize: '11px', 
              color: '#64748b', 
              textAlign: msg.role === 'user' ? 'right' : 'left',
              paddingLeft: '4px', paddingRight: '4px'
            }}>
              {msg.role === 'user' ? 'Me' : 'AI'}
            </div>
            <div style={{
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              background: msg.role === 'user' ? '#2563eb' : '#1e293b',
              color: '#f1f5f9',
              fontSize: '13.5px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: msg.role === 'assistant' ? '1px solid #334155' : 'none'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
            <div style={{ marginBottom: '4px', fontSize: '11px', color: '#64748b', paddingLeft: '4px' }}>AI</div>
            <div style={{
              padding: '12px 16px',
              borderRadius: '4px 16px 16px 16px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span className="loading-dots">답변 생성 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '16px', borderTop: '1px solid #1e293b', background: 'rgba(15, 23, 42, 0.8)' }}>
        {targetPart && (
           <div style={{ marginBottom: '8px', fontSize: '11px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
             <span>🎯 선택됨: </span>
             <span style={{ fontWeight: 700 }}>{targetPart}</span>
           </div>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={targetPart ? `${targetPart}에 대해 물어보세요...` : "궁금한 내용을 입력하세요..."}
            style={{
              flex: 1,
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '12px',
              padding: '12px',
              color: '#fff',
              fontSize: '13px',
              resize: 'none',
              outline: 'none',
              height: '46px',
              lineHeight: '1.5',
              fontFamily: 'inherit'
            }}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: input.trim() ? '#3b82f6' : '#1e293b',
              border: input.trim() ? 'none' : '1px solid #334155',
              color: input.trim() ? '#fff' : '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </section>
  );
};

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
export default function StudyPage() {
  const { modelId } = useParams<{ modelId: string }>() // UUID
  const viewerRef = useRef<ViewerCanvasHandle>(null)
  
  const [currentModel, setCurrentModel] = useState<ModelDef | null>(null); 
  const [isLoadingModel, setIsLoadingModel] = useState(true); 
  const [apiPartDetails, setApiPartDetails] = useState<PartDetailData | null>(null);

  // Model Data Fetching & Smart Matching
  useEffect(() => {
    if (!modelId) return;

    const fetchModelData = async () => {
      setIsLoadingModel(true);

      try {
        const res = await api.get<ApiResponse>(`/api/models/${modelId}`);
        const json = res.data;

        if (json.success) {
          const apiData = json.data;
          
          const normalizedTitle = apiData.title.toLowerCase().replace(/[\s-_]/g, '');
          const baseLocalModel = LOCAL_MODEL_DATA[normalizedTitle] || RobotArmModel;

          // 파일명(GLB) 기반 스마트 부품 매칭
          const mergedParts = baseLocalModel.parts.map((localPart, index) => {
            const localFileName = getPureFileName(localPart.path); // path에서 파일명 추출 (예: piston)
            const localNameNorm = normalizeName(localPart.name || localPart.id);

            // API 파트 리스트 중에서 가장 적절한 매칭 찾기
            let matchedApiPart = apiData.parts.find((apiPart) => {
                const apiFileName = getPureFileName(apiPart.partUrl);
                const apiPartUuid = apiPart.partUuid;

                // 파일명 완전 일치 (GLB 파일명이 같으면 같은 부품으로 간주)
                // 로컬 "Piston 2" (path: Piston.glb) == API (url: .../Piston.glb) -> 매칭 성공
                if (localFileName === apiFileName) return true;

                // 이름 포함 관계 (파일명이 다를 경우 대비)
                const apiNameNorm = normalizeName(apiFileName); // 보통 파일명에 이름이 포함됨
                if (apiNameNorm.length > 2) {
                    if (localNameNorm.includes(apiNameNorm)) return true;
                }

                return false;
            });

            // 매칭 실패 시, 인덱스로 대체 (최후의 수단)
            if (!matchedApiPart && apiData.parts[index]) {
                matchedApiPart = apiData.parts[index];
            }

            return {
              ...localPart,
              partUuid: matchedApiPart?.partUuid, 
              desc: "" 
            };
          });

          // 모델 전체 정보 업데이트
          setCurrentModel({
            ...baseLocalModel,
            description: { 
              title: apiData.title,
              summary: apiData.summary,
              usage: apiData.usage?.length > 0 ? apiData.usage : [],
              theory: apiData.theory?.length > 0 ? apiData.theory : [],
            },
            parts: mergedParts
          });
        }
      } catch (error) {
        console.error("Model fetch error:", error);
      } finally {
        setIsLoadingModel(false);
      }
    };

    fetchModelData();
  }, [modelId]);

  // View Mode & Selection Logic
  const [viewMode, setViewMode] = useState<StudyViewMode>('simulator');

  useEffect(() => {
    if (!modelId) return;
    setViewMode('simulator');
    setSelectedPartId(null);
    setActiveSinglePartId(null);
    setApiPartDetails(null);
  }, [modelId]);

  const saveSimulation = async () => {
    if (!modelId || !viewerRef.current) return

    const payload: any = {
      assembly: {},
      edit: {},
      simulator: {},
    }

    const cameraState = viewerRef.current.getFullCameraState()
    const partsState = viewerRef.current.getPartsState()

    if (viewMode === 'assembly') {
      payload.assembly = { cameraState }
    }

    if (viewMode === 'edit') {
      payload.edit = {
        cameraState,
        partsState,
      }
    }

    if (viewMode === 'simulator') {
      payload.simulator = {
        cameraState,
        partsState,
      }
    }

    await api.post(
      `/api/models/${modelId}/simulations`,
      payload
    )
  }

  useEffect(() => {
    saveSimulation()
  }, [viewMode])

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [activeSinglePartId, setActiveSinglePartId] = useState<string | null>(null)
  const currentTargetPart = viewMode === 'single' ? activeSinglePartId : selectedPartId;
  const [ghost, setGhost] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)
  
  // 가이드 관련 state
  const [showGuide, setShowGuide] = useState(true) 
  const [showAssemblyGuide, setShowAssemblyGuide] = useState(true)
  const [showEditGuide, setShowEditGuide] = useState(true)
  
  // 메모 관련 state
  const [memoText, setMemoText] = useState('')
  const [isEditing, setIsEditing] = useState(true)
  const [isMemoOpen, setIsMemoOpen] = useState(true)
  const [memoUuid, setMemoUuid] = useState<string | null>(null)
  const [memoLoading, setMemoLoading] = useState(false)

  // Memo Fetching & Save 
  useEffect(() => {
    if (!modelId) return;
    const fetchMemo = async () => {
      setMemoLoading(true);
      try {
        const res = await api.get(`/api/models/${modelId}/memo`);
        const json = res.data;
        if (json.success && json.data) {
          setMemoUuid(json.data.memoUuid);
          setMemoText(json.data.memoContent.body);
        } else {
          setMemoUuid(null);
          setMemoText('');
        }
      } catch (err) {
        console.error('메모 조회 실패', err);
      } finally {
        setMemoLoading(false);
      }
    };
    fetchMemo();
  }, [modelId]);

  const handleSaveMemo = async () => {
    if (!modelId) return;
    try {
      const res = await api.put(`/api/models/${modelId}/memo`, {
        content: { title: `Memo`, body: memoText },
      });
      const json = res.data;
      if (json.success) {
        setMemoUuid(json.data.memoUuid);
        setIsEditing(false);
      }
    } catch (err) {
      console.error('메모 저장 실패', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    if (!currentTargetPart) {
        setApiPartDetails(null);
        return;
    }

    if (!currentModel) return;

    // 현재 선택된 파트의 ID(예: 'Piston 2')로 로컬 파트 찾기
    const part = currentModel.parts.find((p: any) => p.id === currentTargetPart);
    
    // 매칭 과정에서 주입된 partUuid 가져오기
    const partUuid = (part as any)?.partUuid;

    if (!partUuid) {
        console.warn(`⚠️ Part UUID not found for ID: ${currentTargetPart}. API 매칭 실패 가능성 있음.`);
        setApiPartDetails(null);
        return;
    }

    setApiPartDetails(null); // 로딩 시작 UI 표시를 위해 초기화
    
    // UUID로 상세 정보 조회. Piston, Piston 2 모두 동일한 UUID를 가지므로 같은 정보를 불러옴.
    api.get<PartDetailResponse>(`/api/parts/${partUuid}`)
        .then(res => {
            if (isMounted && res.data.success) {
                setApiPartDetails(res.data.data);
            }
        })
        .catch(err => {
            console.error("Part detail fetch failed:", err);
            if (isMounted) setApiPartDetails(null);
        });

    return () => { isMounted = false; };
  }, [currentTargetPart, currentModel]); // currentModel이 업데이트되면 다시 실행

  // useMemo hooks 
  const selectedPart = useMemo(() => {
    if (!currentModel) return null;
    const id = viewMode === 'single' ? activeSinglePartId : selectedPartId;
    return currentModel.parts.find((p: any) => p.id === id);
  }, [viewMode, activeSinglePartId, selectedPartId, currentModel]);

  const uniqueParts = useMemo(() => {
    if (!currentModel) return [];
    const seen = new Set();
    return currentModel.parts.filter((p: any) => {
        if (!p.thumbnail || p.thumbnail.trim() === "") return false;
        return true;
    });
  }, [currentModel]);

  useEffect(() => {
    if (viewMode === 'single' || viewMode === 'edit') setGhost(false);
    else setGhost(true);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === 'edit') return; 
    setSelectedPartId(null);
    setActiveSinglePartId(null);
  }, [viewMode, modelId]);

  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.backgroundColor = '#080c14' 
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof Element && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
      if (e.key.toLowerCase() === 'f' && !e.repeat) setIsExpanded(prev => !prev);
      if (e.key === 'Escape') setIsExpanded(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback((id: string | null) => {
    if (viewMode === 'single') setActiveSinglePartId(id);
    else setSelectedPartId(id);
  }, [viewMode]);

  if (isLoadingModel || !currentModel) {
    return (
      <div style={containerStyle}>
         <Header />
         <main style={{ ...mainLayoutStyle(false), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#fff', fontSize: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <span>⏳</span>
              <span>모델 데이터를 불러오는 중입니다...</span>
            </div>
         </main>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <style>{`
        #part-list-sidebar::-webkit-scrollbar { width: 6px; }
        #part-list-sidebar::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.1); border-radius: 10px; }
        #part-list-sidebar::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 10px; }
        #part-list-sidebar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.6); }

        #info-panel-content::-webkit-scrollbar { width: 4px; }
        #info-panel-content::-webkit-scrollbar-track { background: transparent; }
        #info-panel-content::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.2); border-radius: 10px; }
        #info-panel-content::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.4); }

        #memo-textarea::-webkit-scrollbar { width: 6px; }
        #memo-textarea::-webkit-scrollbar-track { background: transparent; }
        #memo-textarea::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.25); border-radius: 10px; }
        #memo-textarea::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.5); }
      `}</style>

      <Header />
      
      <main style={mainLayoutStyle(isExpanded)}>
        <section style={viewerPanelStyle}>
          <div style={subHeaderStyle}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Tab label="단일 부품" active={viewMode === 'single'} onClick={() => setViewMode('single')} />
              <Tab label="조립도" active={viewMode === 'assembly'} onClick={() => setViewMode('assembly')} />
              <Tab label="조립 가이드" active={viewMode === 'edit'} onClick={() => setViewMode('edit')} />
              <Tab label="시뮬레이터" active={viewMode === 'simulator'} onClick={() => setViewMode('simulator')} />
            </div>
            <button onClick={() => setIsExpanded(!isExpanded)} style={expandBtnStyle}>
              {isExpanded ? '⧉ 작게 보기' : '⛶ 크게 보기'}
            </button>
          </div>

          <div style={canvasContainerStyle}>
            
            {viewMode !== 'single' && (
              <div style={zoomControlsStyle}>
                <button style={zoomBtnStyle} onClick={() => viewerRef.current?.zoomIn()}>＋</button>
                <button style={zoomBtnStyle} onClick={() => viewerRef.current?.zoomOut()}>－</button>
                <button style={zoomResetBtnStyle} onClick={() => viewerRef.current?.resetCamera()}>⟲</button>
              </div>
            )}
            
            {viewMode === 'assembly' && (
               <div style={guideWrapperStyle}>
                 <button onClick={() => setShowAssemblyGuide(!showAssemblyGuide)} style={guideToggleBtnStyle}>
                   {showAssemblyGuide ? '▽ 조립도 가이드 닫기' : '△ 조립도 가이드 열기'}
                 </button>
                 {showAssemblyGuide && (
                   <div style={assemblyNoticeStyle}>
                     <span style={{ color: '#38bdf8', fontWeight: 700, marginRight: '8px' }}>ⓘ INFO</span>
                     조립도 모드에서는 모델의 전체 구조를 열람만 할 수 있습니다. <br/>
                     분해 및 조립 시뮬레이션은 <span style={{ color: '#38bdf8' }}>'시뮬레이터'</span> 탭을 이용해 주세요.
                   </div>
                 )}
               </div>
            )}

            {viewMode === 'simulator' && (
              <div style={guideWrapperStyle}>
                <button onClick={() => setShowGuide(!showGuide)} style={guideToggleBtnStyle}>
                   {showGuide ? '▽ 시뮬레이터 가이드 닫기' : '△ 시뮬레이터 가이드 열기'}
                </button>
                {showGuide && (
                  <div style={guideContentStyle}>
                    <div style={guideSectionTitleStyle}><span style={{ marginRight: '6px' }}>🖱️</span> 마우스 조작</div>
                    <div style={guideItemStyle}>
                      <div style={guideRowStyle}><span style={guideIconStyle}>🖱️</span><span>좌클릭 &nbsp; : &nbsp; <span style={highlightTextStyle}>모델 회전</span></span></div>
                      <div style={guideRowStyle}><span style={guideIconStyle}>🖐️</span><span>우클릭 &nbsp; : &nbsp; <span style={highlightTextStyle}>시점 이동</span></span></div>
                      <div style={guideRowStyle}><span style={guideIconStyle}>🔄</span><span>휠 &nbsp; : &nbsp; <span style={highlightTextStyle}>확대/축소</span></span></div>
                    </div>
                    <div style={dividerStyle} />
                    <div style={guideSectionTitleStyle}><span style={{ marginRight: '6px' }}>⌨️</span> 단축키</div>
                    <div style={guideItemStyle}>
                      <div style={guideRowStyle}><kbd style={kbdStyle}>Shift</kbd><span> + 드래그 &nbsp; : &nbsp; <span style={highlightTextStyle}>분해 / 조립</span></span></div>
                      <div style={guideRowStyle}><kbd style={kbdStyle}>F</kbd><span>: &nbsp; 전체화면</span></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'edit' && (
              <div style={guideWrapperStyle}>
                <button onClick={() => setShowEditGuide(!showEditGuide)} style={guideToggleBtnStyle}>
                   {showEditGuide ? '▽ 조립 가이드 닫기' : '△ 조립 가이드 열기'}
                </button>
                {showEditGuide && (
                  <div style={guideContentStyle}>
                    <div style={guideSectionTitleStyle}>🧩 단계별 조립 모드</div>
                    <div style={guideItemStyle}>
                      <div style={guideRowStyle}><span>🖱️ 부품 클릭 &nbsp; : &nbsp; <span style={highlightTextStyle}>제자리로 조립</span></span></div>
                      <div style={guideRowStyle}><span>🔄 초기화 버튼 &nbsp; : &nbsp; <span style={highlightTextStyle}>전체 분해</span></span></div>
                    </div>
                    <div style={dividerStyle} />
                    <div style={guideSectionTitleStyle}><span style={{ marginRight: '6px' }}>⌨️</span> 단축키</div>
                    <div style={guideItemStyle}>
                      <div style={guideRowStyle}><kbd style={kbdStyle}>F</kbd><span>&nbsp; : &nbsp; 전체화면</span></div>
                    </div>
                    <div style={dividerStyle} />
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>부품을 클릭하여 조립도를 완성해 보세요.</div>
                  </div>
                )}
              </div>
            )}


            {(viewMode === 'single' || viewMode === 'assembly') ? (
              <div style={singleModeContainerStyle}>
                {viewMode === 'single' && (
                  <div id="part-list-sidebar" style={singleSidebarStyle}>
                    {uniqueParts.map((p: any) => (
                      <div 
                        key={p.id} 
                        style={singleSidebarItemStyle(activeSinglePartId === p.id)} 
                        onClick={() => setActiveSinglePartId(p.id)}
                      >
                        <img src={p.thumbnail} style={sidebarThumbStyle} alt={p.name} />
                      </div>
                    ))}
                  </div>
                )}

                <div style={singleViewerAreaStyle}>
                    <ViewerCanvas 
                      key={`viewer-${viewMode}-${modelId}`}
                      ref={viewerRef} 
                      model={currentModel} 
                      ghost={ghost} 
                      selectedPartId={currentTargetPart} 
                      onSelectPart={handleSelect} 
                      isExpanded={isExpanded} 
                      mode={viewMode} 
                    />
                    {viewMode === 'single' && (
                      <div style={centerPartLabelStyle}>
                        {activeSinglePartId ? (apiPartDetails?.name || selectedPart?.name) : "Select a Part"}
                      </div>
                    )}
                </div>

                <div style={singleInfoPanelStyle}>
                  <div style={{ ...infoBoxStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={partNameTitleStyle}>
                      {viewMode === 'assembly' && !selectedPartId 
                        ? (currentModel.description?.title || currentModel.name || "모델 정보 없음")
                        : (apiPartDetails?.name || selectedPart?.name || "부품을 선택하세요")
                      }
                    </h3>
                    <div style={{ height: '1px', background: 'rgba(56, 189, 248, 0.2)', margin: '12px 0', flexShrink: 0 }} />

                    <div id="info-panel-content" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                      {(viewMode === 'assembly' && !selectedPartId) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          
                          <section>
                            <h4 style={infoTitleStyle}>📝 학습 개요</h4>
                            <p style={{ ...infoContentStyle, color: '#e2e8f0', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                               {currentModel.description?.summary || "요약 설명이 없습니다."}
                            </p>
                          </section>

                          {currentModel.description?.theory && currentModel.description.theory.length > 0 && (
                            <section>
                              <h4 style={infoTitleStyle}>📚 핵심 이론</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {currentModel.description.theory.map((item: any, idx: number) => (
                                  <div key={idx} style={theoryCardStyle}>
                                    <div style={theoryTitleStyle}>
                                      <span style={{ color: '#38bdf8', marginRight: '6px' }}>•</span> 
                                      {item.title}
                                    </div>
                                    <div style={theoryContentStyle}>
                                      {item.content}
                                    </div>
                                    {item.details && (
                                      <div style={theoryDetailStyle}>
                                        💡 {item.details}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                          {currentModel.description?.usage && currentModel.description.usage.length > 0 && (
                            <section>
                              <h4 style={infoTitleStyle}>⚙️ 사용법 및 특징</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {currentModel.description.usage.map((item: any, idx: number) => (
                                  <div key={idx} style={usageBoxStyle}>
                                    <span style={{ fontWeight: 600, color: '#cbd5e1', marginBottom: '4px', display:'block' }}>{item.title}</span>
                                    <span style={{ color: '#94a3b8' }}>{item.content}</span>
                                  </div>
                                ))}
                              </div>
                            </section>
                          )}

                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {selectedPart ? (
                            <>
                              {apiPartDetails ? (
                                <>
                                  <section>
                                    <h4 style={infoTitleStyle}>재질</h4>
                                    <div style={materialBoxStyle}>
                                      {apiPartDetails.material || "재질 정보 없음"}
                                    </div>
                                  </section>
                                  <section>
                                    <h4 style={infoTitleStyle}>상세 설명</h4>
                                    <p style={{ ...infoContentStyle, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                                        {apiPartDetails.description || "상세 설명이 등록되지 않았습니다."}
                                    </p>
                                  </section>
                                </>
                              ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                  <span style={{ display: 'block', fontSize: '20px', marginBottom: '8px' }}>⏳</span>
                                  <p style={{ fontSize: '12px' }}>정보를 불러오는 중...</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <p style={{ ...infoContentStyle, color: '#e2e8f0' }}>분석할 부품을 목록에서 선택하세요.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ViewerCanvas 
                key={`viewer-${viewMode}-${modelId}`}
                ref={viewerRef} 
                model={currentModel} 
                ghost={ghost} 
                selectedPartId={currentTargetPart} 
                onSelectPart={handleSelect} 
                isExpanded={isExpanded} 
                mode={viewMode} 
              />
            )}
          </div>
        </section>

        {!isExpanded && (
          <aside style={rightPanelStyle}>
            <AIAssistantPanel 
              modelUuid={modelId} // URL 파라미터에서 가져온 UUID
              targetPart={currentTargetPart} 
              active={!!currentTargetPart}
            />

            {viewMode !== 'single' && (
                <section style={{ ...panelCardStyle, marginBottom: 0, padding: '12px' }}>
                    <label style={checkboxLabelStyle}>
                        <input
                        type="checkbox"
                        checked={ghost}
                        onChange={(e) => setGhost(e.target.checked)}
                        style={{ accentColor: '#38bdf8' }}
                        />
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        Ghost Mode 활성화
                        </span>
                    </label>
                </section>
            )}

            <section style={{ 
              ...memoSectionStyle, 
              flex: isMemoOpen ? 1 : '0 0 auto', 
              maxHeight: isMemoOpen ? 'none' : '60px',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMemoOpen ? '16px' : 0 }}>
                <h3 style={{ ...panelTitleStyle, marginBottom: 0 }}>Memo</h3>
                <button onClick={() => setIsMemoOpen(!isMemoOpen)} style={memoToggleBtnStyle}>
                  {isMemoOpen ? '−' : '＋'}
                </button>
              </div>
              {isMemoOpen && (
                <div style={memoInnerWrapperStyle}>
                  <textarea 
                    id="memo-textarea"
                    style={memoBoxStyle(isEditing)} 
                    placeholder="학습 내용을 기록하세요." 
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    readOnly={!isEditing}
                  />
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      onClick={() => {
                        if (isEditing) handleSaveMemo();
                        else setIsEditing(true);
                      }}
                      style={memoSaveBtnStyle(isEditing)}
                    >
                      {isEditing ? '저장하기' : '수정하기'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </aside>
        )}
      </main>
    </div>
  )
}

// ----------------------------------------------------------------------
// Styles 
// ----------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'radial-gradient(circle at center, #1e293b 0%, #080c14 100%)',
  paddingTop: '60px',
  boxSizing: 'border-box',
};

const mainLayoutStyle = (isExpanded: boolean): React.CSSProperties => ({
  flex: 1,
  display: 'grid',
  gridTemplateColumns: isExpanded ? '1fr' : '1fr 340px',
  padding: '20px',
  gap: '20px',
  overflow: 'hidden',
});

const viewerPanelStyle: React.CSSProperties = {
  position: 'relative',
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '24px',
  border: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backdropFilter: 'blur(10px)',
  minWidth: 0,
};

const subHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid #1e293b',
  background: 'rgba(30, 41, 59, 0.3)',
};

const canvasContainerStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  overflow: 'hidden',
  background: '#0f172a', 
};

const singleModeContainerStyle: React.CSSProperties = {
  display: 'flex',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
};

const singleSidebarStyle: React.CSSProperties = {
  width: '100px',
  background: 'rgba(2, 6, 23, 0.5)',
  borderRight: '1px solid #1e293b',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '12px',
  overflowY: 'auto',
  overflowX: 'hidden',
  flexShrink: 0,
};

const singleSidebarItemStyle = (isActive: boolean): React.CSSProperties => ({
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: '12px',
  overflow: 'hidden',
  border: isActive ? '2px solid #3b82f6' : '1px solid #334155',
  cursor: 'pointer',
  opacity: isActive ? 1 : 0.85,
  background: 'linear-gradient(145deg, #020617, #0f172a)',
  flexShrink: 0,
  boxSizing: 'border-box',
  transition: 'all 0.2s ease',
});

const sidebarThumbStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const singleViewerAreaStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  minWidth: 0,
  overflow: 'hidden',
};

const centerPartLabelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(15, 23, 42, 0.8)',
  padding: '8px 20px',
  borderRadius: '20px',
  color: '#fff',
  fontWeight: 600,
  border: '1px solid #334155',
};

const singleInfoPanelStyle: React.CSSProperties = {
  width: '240px',
  borderLeft: '1px solid #1e293b',
  background: 'rgba(15, 23, 42, 0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '16px',
  flexShrink: 0,
};

const infoBoxStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '12px',
  padding: '16px',
  flex: 1,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  display: 'flex',
  flexDirection: 'column',
};

const partNameTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 700,
  color: '#38bdf8',
};

const infoTitleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '13px',
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
};

const infoContentStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap'
};

const rightPanelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  height: '100%',
  minWidth: '340px',
  overflow: 'hidden',
};

const panelCardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '24px',
  padding: '20px',
  border: '1px solid #1e293b',
  backdropFilter: 'blur(10px)',
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#38bdf8',
  letterSpacing: '0.5px',
};

const aiStatusStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '16px',
  background: 'rgba(2, 6, 23, 0.6)',
  borderRadius: '16px',
  border: '1px solid rgba(56, 189, 248, 0.2)',
};

const aiButtonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  border: 'none',
  padding: '10px 16px',
  borderRadius: '8px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '13px',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  transition: 'transform 0.1s',
};

const statusDotStyle = (active: boolean): React.CSSProperties => ({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: active ? '#10b981' : '#334155',
  boxShadow: active ? '0 0 10px #10b981' : 'none',
});

const memoSectionStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.4)',
  borderRadius: '24px',
  padding: '20px',
  border: '1px solid #1e293b',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};

const memoInnerWrapperStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  minHeight: 0,
};

const memoBoxStyle = (isEditing: boolean): React.CSSProperties => ({
  flex: 1,
  width: '100%',
  boxSizing: 'border-box',
  background: isEditing ? '#0b1120' : 'rgba(15, 23, 42, 0.2)',
  border: isEditing ? '1px solid #3b82f6' : '1px solid #1e293b',
  borderRadius: '16px',
  padding: '16px',
  color: isEditing ? '#e2e8f0' : '#94a3b8',
  fontSize: '14px',
  resize: 'none',
  outline: 'none',
  transition: 'all 0.3s ease',
});

const memoSaveBtnStyle = (isEditing: boolean): React.CSSProperties => ({
  borderRadius: '10px',
  fontWeight: 600,
  cursor: 'pointer',
  background: isEditing ? '#3b82f6' : 'rgba(30, 41, 59, 0.5)',
  border: isEditing ? 'none' : '1px solid #334155',
  color: '#fff',
  transition: 'all 0.2s',
  width: '120px',
  padding: '10px 0',
  fontSize: '13px'
});

const memoToggleBtnStyle: React.CSSProperties = {
  background: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.2)',
  color: '#38bdf8',
  borderRadius: '6px',
  width: '28px',
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '18px',
  padding: 0,
  transition: 'all 0.2s'
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: '14px',
  color: '#94a3b8',
  cursor: 'pointer',
};

const zoomControlsStyle: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  left: '20px',
  zIndex: 50,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const zoomBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#fff',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const zoomResetBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '8px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#38bdf8',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const expandBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  background: '#1e293b',
  border: '1px solid #334155',
  color: '#94a3b8',
  borderRadius: '8px',
  fontSize: '12px',
  cursor: 'pointer',
};

const guideWrapperStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '20px',
  left: '20px',
  zIndex: 60,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const guideToggleBtnStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.8)',
  backdropFilter: 'blur(8px)',
  border: '1px solid #334155',
  color: '#38bdf8',
  padding: '8px 14px',
  borderRadius: '10px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const guideContentStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  width: '240px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
};

const guideSectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
};

const guideItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const guideRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '12px',
  color: '#cbd5e1',
};

const guideIconStyle: React.CSSProperties = {
  fontSize: '14px',
  width: '20px',
  textAlign: 'center',
};

const highlightTextStyle: React.CSSProperties = {
  color: '#38bdf8',
  fontWeight: 600,
};

const kbdStyle: React.CSSProperties = {
  background: '#334155',
  border: '1px solid #475569',
  borderRadius: '4px',
  padding: '2px 6px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#fff',
  boxShadow: '0 2px 0 #1e293b',
  minWidth: '24px',
  textAlign: 'center',
  display: 'inline-block',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  background: '#334155',
  margin: '12px 0',
};

const assemblyNoticeStyle: React.CSSProperties = {
  width: '390px',
  padding: '12px 16px',
  background: 'rgba(15, 23, 42, 0.85)',
  backdropFilter: 'blur(12px)',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  fontSize: '12px',
  lineHeight: '1.6',
  color: '#cbd5e1',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
};

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px', borderRadius: '10px', border: 'none', background: active ? '#3b82f6' : 'rgba(15, 23, 42, 0.5)', color: active ? '#fff' : '#64748b', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
  )
};

const materialBoxStyle: React.CSSProperties = {
  padding: '10px',
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1) 0%, rgba(56, 189, 248, 0.05) 100%)',
  borderLeft: '3px solid #38bdf8',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#cbd5e1',
  fontWeight: 500,
};

const theoryCardStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.5)',
  border: '1px solid #334155',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const theoryTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: '4px',
};

const theoryContentStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#cbd5e1',
  lineHeight: 1.5,
};

const theoryDetailStyle: React.CSSProperties = {
  marginTop: '8px',
  padding: '8px',
  background: 'rgba(56, 189, 248, 0.1)',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#7dd3fc',
  lineHeight: 1.4,
};

const usageBoxStyle: React.CSSProperties = {
  padding: '10px',
  background: 'rgba(15, 23, 42, 0.6)',
  borderLeft: '2px solid #10b981', 
  borderRadius: '4px',
  fontSize: '12px',
  lineHeight: 1.5,
};