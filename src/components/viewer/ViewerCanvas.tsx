'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js'
import type { ModelDef } from '../viewer/types'

// 부품 상태 타입 정의
export interface PartStateDef {
  partUuid: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  isExploded: boolean;
}

export type ViewerCanvasHandle = {
  getFullCameraState: () => any
  getPartsState: () => PartStateDef[]
  zoomIn: () => void
  zoomOut: () => void
  resetCamera: () => void
}

const ViewerCanvas = forwardRef<
  ViewerCanvasHandle,
  {
    model: ModelDef
    ghost: boolean
    selectedPartId: string | null
    onSelectPart: (id: string | null) => void
    isExpanded: boolean
    mode: string
    // 초기 상태 주입용 Props
    initialCameraState?: any
    initialPartsState?: PartStateDef[]
  }
>(({ model, ghost, selectedPartId, onSelectPart, isExpanded, mode, initialCameraState, initialPartsState }, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const refs = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    transformControls: TransformControls
    rafId: number
  } | null>(null)

  const partsRef = useRef<Record<string, {
    root: THREE.Group
    assembled: THREE.Vector3
    exploded: THREE.Vector3
    isAdded: boolean
    isDone?: boolean
  }>>({})

  const pickablesRef = useRef<THREE.Object3D[]>([])
  const materialSnapshot = useMemo(() => new WeakMap<THREE.Material, any>(), [])
  const simFromRef = useRef<Record<string, THREE.Vector3>>({})
  const simToRef = useRef<Record<string, THREE.Vector3>>({})
  const explodeRef = useRef(0)
  const draggingRef = useRef(false)
  const lastYRef = useRef(0)

  // 부품 이동 애니메이션
  const animatePartToPosition = (id: string, obj: THREE.Object3D, targetPos: THREE.Vector3) => {
    let startTime: number | null = null;
    const startPos = obj.position.clone();
    const duration = 600;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(2, -10 * progress);
      obj.position.lerpVectors(startPos, targetPos, ease);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        if (partsRef.current[id]) partsRef.current[id].isDone = true;
      }
    };
    requestAnimationFrame(step);
  };

  useImperativeHandle(ref, () => ({
    getFullCameraState() {
      if (!refs.current) return null
      const { camera, controls } = refs.current
      return {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
        zoom: camera.zoom,
      }
    },
    getPartsState() {
      return Object.entries(partsRef.current)
        .map(([id, p]) => {
          const partUuid = model.parts.find(pt => pt.id === id)?.partUuid
          if (!partUuid) return null
          return {
            partUuid,
            position: { x: p.root.position.x, y: p.root.position.y, z: p.root.position.z },
            rotation: { x: p.root.rotation.x, y: p.root.rotation.y, z: p.root.rotation.z },
            isExploded: !p.isDone,
          }
        })
        .filter((item): item is PartStateDef => Boolean(item))
    },
    zoomIn() {
      if (!refs.current) return
      const dir = new THREE.Vector3()
      refs.current.camera.getWorldDirection(dir)
      refs.current.camera.position.addScaledVector(dir, 0.25)
      refs.current.controls.update()
    },
    zoomOut() {
      if (!refs.current) return
      const dir = new THREE.Vector3()
      refs.current.camera.getWorldDirection(dir)
      refs.current.camera.position.addScaledVector(dir, -0.25)
      refs.current.controls.update()
    },
    resetCamera() {
      if (!refs.current) return
      const { camera, controls, transformControls } = refs.current
      
      // 카메라 기본 위치로 리셋
      camera.position.set(1.0, 0.8, 1.2)
      controls.target.set(0, 0.4, 0)
      controls.update()
      transformControls.detach()
      onSelectPart(null)
      explodeRef.current = 0
      
      // 부품 위치 리셋 (저장된 상태 무시하고 초기 상태로)
      Object.entries(partsRef.current).forEach(([id, p]) => {
        const isAssembledMode = (mode === 'assembly' || mode === 'simulator')
        p.root.position.copy(isAssembledMode ? p.assembled : p.exploded)
        p.root.rotation.set(0,0,0)
        p.isDone = isAssembledMode;
        
        if(simFromRef.current[id]) simFromRef.current[id].copy(p.root.position)
        if(simToRef.current[id]) simToRef.current[id].copy(isAssembledMode ? p.exploded : p.assembled)
      })
    }
  }))

  const framePart = (root: THREE.Object3D) => {
    if (!refs.current) return
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = refs.current.camera.fov * (Math.PI / 180)
    const distance = (maxDim / (2 * Math.tan(fov / 2))) * 5

    refs.current.camera.position.set(center.x + distance, center.y + distance, center.z + distance)
    refs.current.controls.target.copy(center)
    refs.current.controls.update()
  }

  const animateAppear = (root: THREE.Object3D) => {
    root.scale.setScalar(0.85)
    root.traverse((obj: any) => {
      if (!obj.isMesh) return
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m: any) => {
        m.transparent = true
        m.opacity = 0
      })
    })

    let t = 0
    const animate = () => {
      t += 0.05
      const eased = THREE.MathUtils.smoothstep(t, 0, 1)
      root.scale.setScalar(0.85 + eased * 0.15)
      root.traverse((obj: any) => {
        if (!obj.isMesh) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m: any) => {
          const snap = materialSnapshot.get(m)
          if (snap) m.opacity = eased * snap.opacity
        })
      })
      if (t < 1) requestAnimationFrame(animate)
    }
    animate()
  }

  useEffect(() => {
    if (!mountRef.current || !refs.current) return
    const handleResize = () => {
      if (!mountRef.current || !refs.current) return
      const { camera, renderer } = refs.current
      const width = mountRef.current.clientWidth
      const height = mountRef.current.clientHeight
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(() => requestAnimationFrame(handleResize))
    ro.observe(mountRef.current)
    handleResize()
    return () => ro.disconnect()
  }, [isExpanded])

  // Main Scene Setup
  useLayoutEffect(() => {
    if (!mountRef.current) return
    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)

    // 초기 카메라 위치 적용
    if (initialCameraState && initialCameraState.position) {
        camera.position.set(initialCameraState.position.x, initialCameraState.position.y, initialCameraState.position.z);
        if (initialCameraState.zoom) camera.zoom = initialCameraState.zoom;
    } else {
        camera.position.set(1, 0.8, 1.2);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    
    // 초기 타겟 적용
    if (initialCameraState && initialCameraState.target) {
        controls.target.set(initialCameraState.target.x, initialCameraState.target.y, initialCameraState.target.z);
    } else {
        controls.target.set(0, 0.4, 0);
    }

    const transformControls = new TransformControls(camera, renderer.domElement)
    scene.add(transformControls.getHelper());
    transformControls.addEventListener('dragging-changed', (e) => {
      controls.enabled = !e.value
    })

    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const dir = new THREE.DirectionalLight(0xffffff, 1)
    dir.position.set(5, 10, 7.5)
    scene.add(dir)
    scene.add(new THREE.GridHelper(10, 10, 0x334155, 0x1e293b))

    refs.current = { scene, camera, renderer, controls, transformControls, rafId: 0 }

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const loader = new GLTFLoader()
    model.parts.forEach((p) => {
      loader.load(p.path, (gltf: GLTF) => {
        const root = gltf.scene
        const wrapper = new THREE.Group()
        
        if (p.rotation) root.rotation.set(p.rotation.x, p.rotation.y, p.rotation.z)
        wrapper.add(root)
        
        // 데이터 초기화 및 오류 방지 로직
        const isAssembledInit = (mode === 'assembly' || mode === 'simulator')
        
        // JSON 객체({x,y,z})를 가져와서 THREE.Vector3로 변환
        const defaultPosData = isAssembledInit ? p.assembled : p.exploded
        
        // 변환된 Vector3 생성 
        let finalPos = new THREE.Vector3(defaultPosData.x, defaultPosData.y, defaultPosData.z)
        let finalRot = new THREE.Euler(0, 0, 0)
        let isDoneState = isAssembledInit

        // 로컬 스토리지에 저장된 값이 있으면 덮어쓰기
        if (initialPartsState && p.partUuid) {
             const saved = initialPartsState.find(s => s.partUuid === p.partUuid)
             if (saved) {
                 finalPos = new THREE.Vector3(saved.position.x, saved.position.y, saved.position.z)
                 finalRot = new THREE.Euler(saved.rotation.x, saved.rotation.y, saved.rotation.z)
                 isDoneState = !saved.isExploded
             }
        }

        wrapper.position.copy(finalPos)
        wrapper.rotation.copy(finalRot)

        root.traverse((obj: any) => {
          if (!obj.isMesh) return
          obj.userData.partId = p.id 
          pickablesRef.current.push(obj)
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m: any) => {
            if (!materialSnapshot.has(m)) {
              materialSnapshot.set(m, {
                transparent: m.transparent,
                opacity: m.opacity,
                emissive: m.emissive?.clone() || new THREE.Color(0, 0, 0),
              })
            }
          })
        })

        // 조립/분해 상태도 Vector3로 확실하게 변환
        const assembled = new THREE.Vector3(p.assembled.x, p.assembled.y, p.assembled.z)
        const exploded = new THREE.Vector3(p.exploded.x, p.exploded.y, p.exploded.z)

        partsRef.current[p.id] = { 
            root: wrapper, 
            assembled, 
            exploded, 
            isAdded: false, 
            isDone: isDoneState 
        }
        
        // 시뮬레이션용 데이터 초기화 
        simFromRef.current[p.id] = finalPos.clone()
        simToRef.current[p.id] = isDoneState ? exploded.clone() : assembled.clone()

        if (mode !== 'single') {
          scene.add(wrapper)
          partsRef.current[p.id].isAdded = true
        }
      })
    })

    const onClick = (e: MouseEvent) => {
      if (draggingRef.current || !refs.current || mode === 'single') return 
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObjects(pickablesRef.current)
      if (intersects.length > 0) {
        onSelectPart(intersects[0].object.userData.partId)
      } else {
        onSelectPart(null)
        transformControls.detach()
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!refs.current || mode === 'single') return; 
      if (mode === 'edit') {
        const rect = renderer.domElement.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(pickablesRef.current)
        if (intersects.length > 0) {
          const partId = intersects[0].object.userData.partId
          const part = partsRef.current[partId]
          if (part && !part.isDone) {
            onSelectPart(partId)
            animatePartToPosition(partId, part.root, part.assembled)
          }
        } else {
          onSelectPart(null)
        }
        return
      }
      if (mode === 'simulator' && e.shiftKey) {
        draggingRef.current = true
        lastYRef.current = e.clientY
        controls.enabled = false
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || mode === 'single') return 
      const dy = lastYRef.current - e.clientY
      lastYRef.current = e.clientY
      explodeRef.current = THREE.MathUtils.clamp(explodeRef.current + dy * 0.005, 0, 1)
      Object.entries(partsRef.current).forEach(([id, p]) => {
        p.root.position.lerpVectors(simFromRef.current[id], simToRef.current[id], explodeRef.current)
      })
    }

    const onPointerUp = () => {
      if (!draggingRef.current || mode === 'single') return 
      draggingRef.current = false
      controls.enabled = true
      const shouldExplode = explodeRef.current > 0.5
      explodeRef.current = shouldExplode ? 1 : 0
      Object.entries(partsRef.current).forEach(([id, p]) => {
        const finalPos = shouldExplode ? simToRef.current[id] : simFromRef.current[id]
        p.root.position.copy(finalPos)
        simFromRef.current[id].copy(finalPos)
        simToRef.current[id].copy(shouldExplode ? p.assembled : p.exploded)
      })
    }

    renderer.domElement.addEventListener('click', onClick)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    const tick = () => {
      if (!refs.current) return
      refs.current.rafId = requestAnimationFrame(tick)
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(refs.current?.rafId || 0)
      renderer.domElement?.removeEventListener('click', onClick)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      renderer.dispose()
      scene.clear()
      mountRef.current?.removeChild(renderer.domElement)
      refs.current = null
    }
  }, [model.id, mode, initialCameraState, initialPartsState]) 

  // Material & Selection Effects
  useEffect(() => {
    if (!refs.current) return
    const { scene, transformControls } = refs.current

    Object.entries(partsRef.current).forEach(([id, p]) => {
      const isTarget = selectedPartId === id

      if (mode === 'single') {
        if (isTarget) {
          if (!p.isAdded) {
            scene.add(p.root)
            p.isAdded = true
          }
          p.root.position.set(0, 0, 0)
          animateAppear(p.root)
          framePart(p.root)
          transformControls.detach()
        } else {
          if (p.isAdded) {
            scene.remove(p.root)
            p.isAdded = false
          }
        }
      } else {
        if (!p.isAdded) {
          scene.add(p.root)
          p.isAdded = true
        }
      }
      
      p.root.traverse((obj: any) => {
        if (!obj.isMesh) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m: any) => {
          const snap = materialSnapshot.get(m)
          if (!snap) return

          if (mode === 'single') {
            m.emissive.copy(snap.emissive)
            m.emissiveIntensity = 1.0
            m.transparent = snap.transparent
            m.opacity = snap.opacity
          } else {
            if (isTarget) {
              m.emissive.setHex(0x38bdf8)
              m.emissiveIntensity = 0.5
            } else {
              m.emissive.copy(snap.emissive)
              m.emissiveIntensity = 1.0
            }

            if (ghost && selectedPartId && !isTarget) {
              m.transparent = true
              m.opacity = 0.2
            } else {
              m.transparent = snap.transparent
              m.opacity = snap.opacity
            }
          }
        })
      })
    })
  }, [selectedPartId, mode, ghost])

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
})

ViewerCanvas.displayName = 'ViewerCanvas'
export default ViewerCanvas