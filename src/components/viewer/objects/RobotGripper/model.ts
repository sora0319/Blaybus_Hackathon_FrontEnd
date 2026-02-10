export const RobotGripperModel = {
  scale: 2.5,

  description: {
      title: "Robot Gripper",
      summary: "로봇 팔의 끝단에 장착되어 물체를 집고, 고정하고, 놓는 역할을 수행하는 장치, 로봇이 실제로 외부 세계와 접촉하는 인터페이스 역할",
      usage: [
        { title: "조립 및 분해 작업", content: "부품 정렬, 삽입, 체결 보조" },
        { title: "반복 작업", content: "높은 반복 정밀도 요구 공정" },
      ],
      theory: [
        { title: "파지 이론 (Grasping Theory)", content: "- 그리퍼는 물체를 미끄러지지 않게 고정\n- 마찰이 작을수록 더 큰 파지력 필요", details: "F_{grip} \ge \frac{W}{\mu}" },
        { title: "힘 전달 메커니즘", content: "기어의 회전 운동을 링크 메커니즘을 통해 집게의 개폐 운동으로 변환해 파지력을 생성하는 구조" },
        { title: "평행 그리퍼 원리", content: "좌우 집게가 동시에 평행 이동, 물체 중심이 변하지 않아 안정적 파지 가능" }
      ]
    },

  parts: [
    {
      id: 'Base Plate',
      name: 'Base Plate',
      material: '알루미늄 합금, 강판',
      desc: '- 내부 메커니즘 지지 구조\n\n- 기어, 링크, 핀 등이 장착되는 평판형 프레임으로, 구조 강성과 정밀 정렬을 담당',
      path: '/models/RobotGripper/BasePlate.glb',
      thumbnail: '/models/RobotGripper/thumbnails/BasePlate.png',
      assembled: { x: 0, y: 0, z: 0 },
      rotation: { x: -Math.PI / 2, y: 0, z: Math.PI / 1 },
      // 가장 아래쪽에 배치
      exploded: { x: 0, y: -0.3, z: 0 },
    },
    {
      id: 'Base Mounting Bracket',
      name: 'Base Mounting Bracket',
      material: '알루미늄 합금, 탄소강',
      desc: '- 그리퍼를 로봇 팔에 고정\n\n- 로봇 팔과 그리퍼 본체를 연결하는 브래킷으로, 하중을 분산하고 정렬 기준을 제공',
      path: '/models/RobotGripper/BaseMountingBracket.glb',
      thumbnail: '/models/RobotGripper/thumbnails/BaseMountingBracket.png',
      assembled: { x: -0.01, y: 0.005, z: -0.005 },
      rotation: { x: 0, y: -Math.PI / 2, z: 0 },
      // BasePlate 바로 위
      exploded: { x: 0, y: -0.15, z: 0 },
    },
    {
      id: 'Base Gear',
      name: 'Base Gear',
      material: '합금강, 열처리 알루미늄 합금',
      desc: '- 구동력 전달의 시작점\n\n- 모터(또는 입력축)에서 전달된 회전을 받아 다른 기어·링크로 힘을 전달\n\n- 그리퍼 개폐의 기준 회전을 만듦',
      path: '/models/RobotGripper/BaseGear.glb',
      thumbnail: '/models/RobotGripper/thumbnails/BaseGear.png',
      assembled: { x: -0.0075, y: -0.003, z: 0.017 },
      rotation: { x: Math.PI, y: -Math.PI, z: -Math.PI / 2 },
      // 중앙 중심부
      exploded: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'Gear Link 1',
      name: 'Gear Link 1',
      material: '알루미늄 합금, 합금강',
      desc: '기어의 회전 운동을 링크 메커니즘으로 전달해 그리퍼의 개폐 동작을 만드는 연결 링크 부품',
      path: '/models/RobotGripper/GearLink_1.glb',
      thumbnail: '/models/RobotGripper/thumbnails/GearLink1.png',
      assembled: { x: -0.012, y: 0.003, z: 0.038 },
      rotation: { x: 0, y: Math.PI + 0.05, z: Math.PI / 2 },
      // 왼쪽으로 1단계 분해
      exploded: { x: -0.1, y: 0.1, z: 0 },
    },
    {
      id: 'Gear Link 2',
      name: 'Gear Link 2',
      material: '합금강, 알루미늄 합금+ 표면 처리',
      desc: '회전 입력을 받아 링크를 구동하고 그리퍼 개폐 동작을 생성하는 기어 일체형 링크 부품',
      path: '/models/RobotGripper/GearLink_2.glb',
      thumbnail: '/models/RobotGripper/thumbnails/GearLink2.png',
      assembled: { x: 0.013, y: 0.004, z: 0.038 },
      rotation: { x: -Math.PI / 2, y: Math.PI, z: -1.6 },
      // 오른쪽으로 1단계 분해
      exploded: { x: 0.1, y: 0.1, z: 0 },
    },
    {
      id: 'Link L',
      name: 'Link (L)',
      material: '알루미늄 합금, 탄소강',
      desc: '- 회전 → 직선/대칭 운동 변환\n\n- 기어의 회전을 집게의 개폐 운동으로 바꾸는 연결 부품\n\n- 좌우 대칭 움직임을 만들어 파지 중심을 유지',
      path: '/models/RobotGripper/Link.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Link.png',
      assembled: { x: -0.0055, y: 0.0055, z: 0.0735 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      // 왼쪽으로 2단계 분해 (GearLink보다 위/바깥)
      exploded: { x: -0.15, y: 0.25, z: 0 },
    },
    {
      id: 'Link R',
      name: 'Link (R)',
      material: '알루미늄 합금, 탄소강',
      desc: '- 회전 → 직선/대칭 운동 변환\n\n- 기어의 회전을 집게의 개폐 운동으로 바꾸는 연결 부품\n\n- 좌우 대칭 움직임을 만들어 파지 중심을 유지',
      path: '/models/RobotGripper/Link.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Link.png',
      assembled: { x: 0.005, y: 0.0055, z: 0.0735 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      // 오른쪽으로 2단계 분해
      exploded: { x: 0.15, y: 0.25, z: 0 },
    },
    {
      id: 'Gripper L',
      name: 'Gripper (L)',
      material: '알루미늄 합금, 스테인리스강',
      desc: '- 물체 파지(집기)\n\n- 좌우로 움직이는 집게로 구성되며, 링크·기어의 동작을 받아 물체를 안정적으로 잡고 놓는 역할 수행',
      path: '/models/RobotGripper/Gripper.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Gripper.png',
      assembled: { x: 0, y: 0, z: 0.0885 },
      rotation: { x: Math.PI / 2, y: 0, z: 1.3 },
      // 왼쪽 최상단
      exploded: { x: -0.2, y: 0.4, z: 0 },
    },
    {
      id: 'Gripper R',
      name: 'Gripper (R)',
      material: '알루미늄 합금, 스테인리스강',
      desc: '- 물체 파지(집기)\n\n- 좌우로 움직이는 집게로 구성되며, 링크·기어의 동작을 받아 물체를 안정적으로 잡고 놓는 역할 수행',
      path: '/models/RobotGripper/Gripper.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Gripper.png',
      assembled: { x: 0, y: 0, z: 0.0885 },
      rotation: { x: -Math.PI / 2, y: 0, z: -1.8 },
      // 오른쪽 최상단
      exploded: { x: 0.2, y: 0.4, z: 0 },
    },
    // --- Pins (위치에 따라 그룹핑하여 배치) ---
    {
      id: 'Pin 1', // Base/Mount 근처 핀 (Left)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: -0.0055, y: 0.002, z: 0.004 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: -0.08, y: -0.15, z: 0.05 },
    },
    {
      id: 'Pin 2', // Base/Mount 근처 핀 (Right)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: 0.0055, y: 0.002, z: 0.004 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: 0.08, y: -0.15, z: 0.05 },
    },
    {
      id: 'Pin 3', // GearLink_1 연결 핀 (Left)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: -0.0115, y: 0.001, z: 0.039 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: -0.15, y: 0.1, z: 0.05 },
    },
    {
      id: 'Pin 4', // GearLink_2 연결 핀 (Right)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: 0.0134, y: 0.001, z: 0.039 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: 0.15, y: 0.1, z: 0.05 },
    },
    {
      id: 'Pin 5', // 중간 관절 핀 (Right)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: 0.005, y: 0.002, z: 0.058 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: 0.18, y: 0.25, z: 0.05 },
    },
    {
      id: 'Pin 6', // 중간 관절 핀 (Left)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: -0.0053, y: 0.002, z: 0.058 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: -0.18, y: 0.25, z: 0.05 },
    },
    {
      id: 'Pin 7', // 상단 링크 핀 (Left - Link와 Gripper 사이)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: -0.01, y: 0.001, z: 0.07 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: -0.22, y: 0.35, z: 0.05 },
    },
    {
      id: 'Pin 8', // 상단 링크 핀 (Right - Link와 Gripper 사이)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: 0.01, y: 0.001, z: 0.07 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: 0.22, y: 0.35, z: 0.05 },
    },
    {
      id: 'Pin 9', // 그리퍼 끝단 핀 (Right)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: 0.005, y: 0.002, z: 0.089 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: 0.25, y: 0.4, z: 0.05 },
    },
    {
      id: 'Pin 10', // 그리퍼 끝단 핀 (Left)
      name: 'Pin',
      material: '경화강, 합금강 + 표면 경화',
      desc: '- 회전 힌지(축)\n\n- 링크와 집게, 기어를 연결하는 회전축으로, 마찰을 최소화하며 반복 동작의 내구성을 확보',
      path: '/models/RobotGripper/Pin.glb',
      thumbnail: '/models/RobotGripper/thumbnails/Pin.png',
      assembled: { x: -0.0053, y: 0.002, z: 0.089 },
      rotation: { x: 0, y: 0, z: Math.PI / 2 },
      exploded: { x: -0.25, y: 0.4, z: 0.05 },
    },
  ],
}