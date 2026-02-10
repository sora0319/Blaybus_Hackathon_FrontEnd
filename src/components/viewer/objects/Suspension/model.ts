import type { ModelDef } from '../../types'

export const SuspensionModel: ModelDef = {

  description: {
    title: "Suspension",
    summary: "노면에서 발생하는 충격과 진동을 흡수하고, 차량(또는 기계)의안정성·조종성·내구성을 유지하는 기계 시스템",
    usage: [
      { title: "충격 흡수 (Ride Comfort)", content: "- 노면 요철에서 발생하는 충격 완화\n- 차체 및 탑승자에게 전달되는 진동 감소" },
      { title: "접지력 유지 (Road Holding)", content: "- 타이어가 노면에서 떨어지지 않도록 유지\n- 제동·가속·코너링 성능 향상" },
      { title: "차체 자세 안정 (Stability)", content: "- 급제동 시 노즈 다이브 억제\n- 가속 시 차체 들림 억제" },
      { title: "구조 보호", content: "- 프레임 및 부품에 전달되는 하중 감소\n- 피로 파손 및 내구성 저하 방지" }
    ],
    theory: [
      { title: "훅의 법칙 (Hooke's Law)", content: "스프링이 얼마나 단단한지를 나타내는 기본 법칙", details: "F = kx (F: 스프링 힘, k: 스프링 강성, x: 변위)" },
      { title: "감쇠 이론 (Damping)", content: "빠르게 움직일수록 더 큰 감쇠력 발생", details: "Fd = c · v (c: 감쇠 계수, v: 속도)" },
      { title: "질량-스프링-댐퍼 모델", content: "서스펜션을 표현하는 대표적인 2차 시스템으로, 승차감·진동 응답·안정성 분석에 사용", details: "mẍ + cẋ + kx = F(t)" }
    ]
  },

  parts: [
    {
      id: 'Base',
      name: 'Base',
      material: '알루미늄 합금, 탄소강 또는 합금강',
      desc: '- 서스펜션 전체를 차량 프레임 또는 하부 구조에 고정하는 기준 부품\n\n- 서스펜션의 하단(또는 상단)에 위치하며, 다른 부품들이 안정적으로 결합될 수 있도록 지지\n\n- 외부 충격이 발생해도 구조가 흔들리지 않도록 전체 하중을 분산시키는 역할',
      path: '/models/Suspension/BASE.glb',
      thumbnail: '/models/Suspension/thumbnails/BASE.png',
      assembled: { x: 0, y: 0, z: 0 },
      exploded: { x: 0, y: 0, z: 0 }, 
    },
    {
      id: 'ROD',
      name: 'ROD',
      material: '고탄소강 또는 합금강, 표면 경화 처리(크롬 도금, 니켈 도금',
      desc: '- 서스펜션이 압축·이완될 때 직선 운동을 전달하는 중심 축\n\n- 내부에서 왕복 운동을 하며, 차량에서 전달되는 충격을 NIT 및 SPRING 쪽으로 전달\n\n- 구조적으로 매우 강성이 요구되는 부품',
      path: '/models/Suspension/ROD.glb',
      thumbnail: '/models/Suspension/thumbnails/ROD.png',
      assembled: { x: 0, y: 0.1, z: 0 },
      exploded: { x: 0, y: 0.4, z: 0 }, 
    },
    {
      id: 'SPRING',
      name: 'SPRING',
      material: '스프링강',
      desc: '- 외부 충격을 탄성으로 흡수하는 핵심 부품\n\n- 노면 충격을 압축하며 에너지를 저장했다가 다시 복원\n\n- 차량 하중을 지탱하고 승차감을 결정하는 가장 직관적인 요소',
      path: '/models/Suspension/SPRING.glb',
      thumbnail: '/models/Suspension/thumbnails/SPRING.png',
      assembled: { x: 0, y: 0.02, z: 0 },
      exploded: { x: 0, y: 0.8, z: 0 }, 
    },
    {
      id: 'NUT',
      name: 'NUT',
      material: '탄소강, 합금강, 스테인리스강',
      desc: '- 부품 간 결합을 단단히 고정하는 체결 부품\n\n- 나사산 구조를 통해 ROD 또는 외부 하우징과 결합되며, 스프링의 장력 조절이나 전체 구조 고정을 담당',
      path: '/models/Suspension/NUT.glb',
      thumbnail: '/models/Suspension/thumbnails/NUT.png',
      assembled: { x: 0, y: 0.12, z: 0 },
      exploded: { x: 0, y: 1.2, z: 0 }, 
    },
  ],
}