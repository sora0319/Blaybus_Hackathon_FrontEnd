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

export type ViewerCanvasHandle = {
  zoomIn: () => void
  zoomOut: () => void
  resetCamera: () => void
  getCameraState: () => {
    position: [number, number, number]
    target: [number, number, number]
  } | undefined
  setCameraState: (state: {
    position: [number, number, number]
    target: [number, number, number]
  }) => void
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
    initialCameraState?: {
      position: [number, number, number]
      target: [number, number, number]
    }
  }
>(({ model, ghost, selectedPartId, onSelectPart, isExpanded, mode, initialCameraState }, ref) => {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const refs = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    transformControls: TransformControls
    rafId: number
  } | null>(null)

  // 고유 ID(p.id)를 키로 사용하여 중복 부품을 개별적으로 관리
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
      camera.position.set(1.0, 0.8, 1.2)
      controls.target.set(0, 0.4, 0)
      controls.update()
      transformControls.detach()
      onSelectPart(null)

      explodeRef.current = 0
      
      Object.entries(partsRef.current).forEach(([id, p]) => {
        const isAssembledMode = (mode === 'assembly' || mode === 'simulator')
        const resetPos = isAssembledMode ? p.assembled : p.exploded
        
        p.root.position.copy(resetPos) 
        p.isDone = isAssembledMode;
        
        if(simFromRef.current[id]) simFromRef.current[id].copy(resetPos)
        if(simToRef.current[id]) {
          simToRef.current[id].copy(isAssembledMode ? p.exploded : p.assembled)
        }
      })
    },
    getCameraState() {
      if (!refs.current) return undefined
      const { camera, controls } = refs.current
      return {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      }
    },
    setCameraState(state) {
      if (!refs.current) return
      const { camera, controls } = refs.current
      camera.position.set(...state.position)
      controls.target.set(...state.target)
      camera.updateProjectionMatrix()
      controls.update()
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

  useLayoutEffect(() => {
    if (!mountRef.current) return
    const width = mountRef.current.clientWidth
    const height = mountRef.current.clientHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f172a)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(...(initialCameraState?.position ?? [1, 0.8, 1.2]))

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(width, height)
    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(...(initialCameraState?.target ?? [0, 0.4, 0]))

    const transformControls = new TransformControls(camera, renderer.domElement)
    scene.add(transformControls)
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
        
        const isAssembledInit = (mode === 'assembly' || mode === 'simulator')
        const startPos = isAssembledInit ? p.assembled : p.exploded
        wrapper.position.set(startPos.x, startPos.y, startPos.z)

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

        const assembled = new THREE.Vector3(p.assembled.x, p.assembled.y, p.assembled.z)
        const exploded = new THREE.Vector3(p.exploded.x, p.exploded.y, p.exploded.z)

        partsRef.current[p.id] = { 
            root: wrapper, assembled, exploded, isAdded: false, 
            isDone: isAssembledInit 
        }
        
        simFromRef.current[p.id] = isAssembledInit ? assembled.clone() : exploded.clone()
        simToRef.current[p.id] = isAssembledInit ? exploded.clone() : assembled.clone()

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
  }, [model.id, mode])

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