const ARENA = {
  x: 20,
  y: 20,
  width: 440,
  height: 760
};

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  create() {
    // 1. 물리 월드 경계 설정 (아레나 내부)
    this.physics.world.setBounds(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    // 2. 동양풍 무협 도장 마룻바닥 배경
    const floor = this.add.graphics();
    floor.fillStyle(0x1c1510, 1);
    floor.fillRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);

    // 3. 목재 마루 널빤지 패턴
    const plankGraphics = this.add.graphics();
    const plankHeight = 38;
    for (let y = ARENA.y; y < ARENA.y + ARENA.height; y += plankHeight) {
      plankGraphics.lineStyle(2, 0x120c08, 0.85);
      plankGraphics.lineBetween(ARENA.x, y, ARENA.x + ARENA.width, y);
      plankGraphics.lineStyle(1, 0x2b2019, 0.4);
      plankGraphics.lineBetween(ARENA.x, y + 2, ARENA.x + ARENA.width, y + 2);
    }

    // 4. 연무장 중앙 결투 원형 문양
    const centerDeco = this.add.graphics();
    const centerX = ARENA.x + ARENA.width / 2;
    const centerY = ARENA.y + ARENA.height / 2;
    centerDeco.lineStyle(3, 0x38281d, 0.7);
    centerDeco.strokeCircle(centerX, centerY, 90);
    centerDeco.lineStyle(1, 0x4a3527, 0.5);
    centerDeco.strokeCircle(centerX, centerY, 105);
    centerDeco.strokeCircle(centerX, centerY, 20);

    // 5. 도장 외곽 벽 (옻칠 목재 벽 + 단청 주홍 테두리)
    const wallBorder = this.add.graphics();
    wallBorder.lineStyle(10, 0x2e1a12, 1);
    wallBorder.strokeRect(ARENA.x, ARENA.y, ARENA.width, ARENA.height);
    wallBorder.lineStyle(2, 0x8f2d24, 0.9);
    wallBorder.strokeRect(ARENA.x + 5, ARENA.y + 5, ARENA.width - 10, ARENA.height - 10);

    // 6. 네 모서리 황동 금구 장식
    const cornerSize = 18;
    const corners = [
      [ARENA.x, ARENA.y],
      [ARENA.x + ARENA.width, ARENA.y],
      [ARENA.x, ARENA.y + ARENA.height],
      [ARENA.x + ARENA.width, ARENA.y + ARENA.height]
    ];
    const cornerGraphics = this.add.graphics();
    cornerGraphics.fillStyle(0x9a7b3c, 1);
    corners.forEach(([cx, cy]) => {
      cornerGraphics.fillRect(cx - cornerSize / 2, cy - cornerSize / 2, cornerSize, cornerSize);
    });
    cornerGraphics.fillStyle(0x2e1a12, 1);
    corners.forEach(([cx, cy]) => {
      cornerGraphics.fillCircle(cx, cy, 3);
    });

    // 7. 탑뷰 동양풍 검사(삿갓과 등에 찬 보검) 텍스처 동적 생성
    this.createPlayerTexture();

    // 8. 플레이어 생성 및 물리 설정 (아레나 하단 중앙)
    const playerStartX = ARENA.x + ARENA.width / 2;
    const playerStartY = ARENA.y + ARENA.height * 0.8;
    this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player');
    this.player.setCircle(20, 6, 6); // 52x52 텍스처 중앙 기준 20 반경 히트박스
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.6); // 벽 충돌 시 반사 탄성 (자연스러운 충격 흡수)
    this.player.body.useDamping = true;
    this.player.body.setDrag(0.88); // 마찰 감속 강화 (적절한 거리 후 정지)

    // 슬링샷 조작 상태 변수
    this.isDragging = false;
    this.isMoving = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.maxDragDistance = 120;
    this.maxSpeed = 850;

    // 조준선(궤적) 그래픽스
    this.aimGraphics = this.add.graphics();

    // 9. 슬링샷 입력 이벤트 등록
    this.setupInput();
  }

  createPlayerTexture() {
    const size = 52;
    const cx = size / 2;
    const cy = size / 2;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 1. 바닥 먹빛 그림자
    g.fillStyle(0x0c0a08, 0.55);
    g.fillCircle(cx, cy + 2, 22);

    // 2. 등에 대각선으로 찬 보검 (검집 + 황동 코등이 + 붉은 술 칼자루)
    // 검집 (후방 좌측으로 뻗어나온 검집)
    g.lineStyle(4, 0x1f1f1f, 1); // 흑단목 칼집
    g.lineBetween(cx - 10, cy + 10, cx - 21, cy + 21);
    g.fillStyle(0xd4af37, 1); // 칼집 끝 황동 장식
    g.fillCircle(cx - 21, cy + 21, 2.5);

    // 칼자루 (전방 우측으로 돌출된 자루와 코등이)
    g.lineStyle(4, 0x111111, 1); // 검은 칼자루
    g.lineBetween(cx + 8, cy - 8, cx + 18, cy - 18);
    // 황동 코등이 (방패막이)
    g.fillStyle(0xd4af37, 1);
    g.fillCircle(cx + 8, cy - 8, 4);
    // 붉은 칼자루 술 (비단 매듭)
    g.lineStyle(2, 0xb83b2e, 0.95);
    g.lineBetween(cx + 18, cy - 18, cx + 23, cy - 23);

    // 3. 삿갓 아래 어깨 도포 실루엣 (짙은 남청빛 도포)
    g.fillStyle(0x1a3c48, 1);
    g.fillCircle(cx, cy, 21);

    // 4. 대나무 삿갓 (밀짚/대나무 원형 갓)
    const hatRadius = 18;
    g.fillStyle(0xc89d58, 1); // 대나무 삿갓 색
    g.fillCircle(cx, cy, hatRadius);

    // 삿갓 테두리 (흑갈색 옻칠 림)
    g.lineStyle(2, 0x4a3212, 1);
    g.strokeCircle(cx, cy, hatRadius);

    // 삿갓 방사형 대나무 살 (8방향 살대)
    g.lineStyle(1, 0x8c6630, 0.7);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      g.lineBetween(cx, cy, cx + Math.cos(angle) * hatRadius, cy + Math.sin(angle) * hatRadius);
    }

    // 삿갓 정수리 원뿔 꼭지
    g.fillStyle(0x5a3e18, 1);
    g.fillCircle(cx, cy, 4.5);
    g.fillStyle(0x2d1b08, 1);
    g.fillCircle(cx, cy, 2);

    // 5. 붉은 갓끈 매듭 장식 포인트
    g.fillStyle(0xb83b2e, 1);
    g.fillCircle(cx, cy + 9, 2.5);

    g.generateTexture('player', size, size);
    g.destroy();
  }

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      if (this.isMoving) return;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
      if (dist <= 48) {
        this.isDragging = true;
        this.dragStartPos = { x: this.player.x, y: this.player.y };
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.isDragging) return;

      this.aimGraphics.clear();

      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      const pullDist = Math.min(Math.hypot(dx, dy), this.maxDragDistance);
      const pullAngle = Math.atan2(dy, dx);

      // 발사 방향은 당긴 반대 방향
      const launchAngle = pullAngle + Math.PI;

      // 조준 방향으로 검사 캐릭터가 시선을 돌림
      this.player.setRotation(launchAngle + Math.PI / 4);

      // 조준선(궤적 예측선) 그리기
      const lineLen = pullDist * 1.5;
      const endX = this.player.x + Math.cos(launchAngle) * lineLen;
      const endY = this.player.y + Math.sin(launchAngle) * lineLen;

      // 1) 당기는 고무줄
      this.aimGraphics.lineStyle(2, 0xd4af37, 0.6);
      this.aimGraphics.lineBetween(this.player.x, this.player.y, pointer.x, pointer.y);

      // 2) 발사 방향 궤적 화살표 점선
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const px = this.player.x + Math.cos(launchAngle) * (lineLen * t);
        const py = this.player.y + Math.sin(launchAngle) * (lineLen * t);
        const dotAlpha = 1 - t * 0.4;
        const dotRadius = 3.5 * (1 - t * 0.3);

        this.aimGraphics.fillStyle(0x8f2d24, dotAlpha);
        this.aimGraphics.fillCircle(px, py, dotRadius);
      }

      // 조준 끝점 화살촉
      this.aimGraphics.fillStyle(0xd4af37, 1);
      this.aimGraphics.fillCircle(endX, endY, 5);
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.aimGraphics.clear();

      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      const pullDist = Math.min(Math.hypot(dx, dy), this.maxDragDistance);

      if (pullDist > 15) {
        const pullAngle = Math.atan2(dy, dx);
        const launchAngle = pullAngle + Math.PI;
        const speed = (pullDist / this.maxDragDistance) * this.maxSpeed;

        this.player.setRotation(launchAngle + Math.PI / 4);
        this.player.setVelocity(
          Math.cos(launchAngle) * speed,
          Math.sin(launchAngle) * speed
        );
        this.isMoving = true;
      }
    });
  }

  update() {
    if (this.isMoving) {
      const speed = this.player.body.velocity.length();
      if (speed > 50) {
        // 이동 중인 방향으로 캐릭터 회전 유지
        const moveAngle = Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x);
        this.player.setRotation(moveAngle + Math.PI / 4);
      } else {
        this.player.setVelocity(0, 0);
        this.isMoving = false;
      }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 800,
  backgroundColor: '#0c0a08',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MainScene]
};

const game = new Phaser.Game(config);
