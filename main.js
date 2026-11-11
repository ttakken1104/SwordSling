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

    // 7. 텍스처 생성
    this.createPlayerTexture();
    this.createHwandoTextures();
    this.createEnemyTexture();
    this.createEnemyHwandoTextures();

    // 8. 플레이어 생성 및 물리 설정 (맵 정중앙 배치)
    const playerStartX = ARENA.x + ARENA.width / 2;
    const playerStartY = ARENA.y + ARENA.height / 2;
    this.player = this.physics.add.sprite(playerStartX, playerStartY, 'player');
    this.player.setCircle(20, 6, 6);
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.7); // 탄성 보강: 충돌 후 경쾌한 반사
    this.player.body.useDamping = true;
    this.player.body.setDrag(0.85); // 기본 마찰력

    // 9. 플레이어 환도 컨테이너 (우측 허리춤 패용)
    this.swordContainer = this.add.container(playerStartX, playerStartY);
    this.scabbard = this.add.sprite(0, 16, 'hwando_scabbard');
    this.scabbard.setOrigin(0.5, 0.5);

    this.blade = this.add.sprite(15, 16, 'hwando_blade');
    this.blade.setOrigin(0.205, 0.5);
    this.blade.setVisible(false);

    this.swordContainer.add([this.scabbard, this.blade]);
    this.swordContainer.setDepth(10);
    this.player.setDepth(9);

    // 10. 적 관리 그룹 생성
    this.enemies = this.physics.add.group();

    // 시작 시 맵 4분면 중앙에 고정 4마리 스폰
    this.spawnInitialEnemies();

    // 11. 충돌 처리 등록 (충돌 시 즉시 처치 & 핀볼 연속 타격)
    this.physics.add.collider(this.player, this.enemies, this.handleCombatCollision, null, this);

    // 검기 이펙트 레이어
    this.slashGraphics = this.add.graphics();
    this.slashGraphics.setDepth(15);

    // 콤보 및 턴 상태 변수
    this.turnState = 'PLAYER_INPUT'; // 'PLAYER_INPUT' | 'PLAYER_MOVING' | 'ENEMY_TURN' | 'RESPAWN'
    this.turnComboCount = 0; // 한 턴 내 연속 처치 콤보 카운트
    this.isDragging = false;
    this.isSlashing = false;
    this.maxDragDistance = 120;
    this.maxSpeed = 880;

    // 조준선 그래픽스
    this.aimGraphics = this.add.graphics();

    // 12. 슬링샷 입력 이벤트 등록
    this.setupInput();
  }

  // 시작 시 4군데(4분면 사각형 중앙)에 고정 스폰
  spawnInitialEnemies() {
    const qPositions = [
      { x: ARENA.x + ARENA.width * 0.25, y: ARENA.y + ARENA.height * 0.25 }, // 좌상
      { x: ARENA.x + ARENA.width * 0.75, y: ARENA.y + ARENA.height * 0.25 }, // 우상
      { x: ARENA.x + ARENA.width * 0.25, y: ARENA.y + ARENA.height * 0.75 }, // 좌하
      { x: ARENA.x + ARENA.width * 0.75, y: ARENA.y + ARENA.height * 0.75 }  // 우하
    ];

    qPositions.forEach(pos => {
      this.createEnemy(pos.x, pos.y);
    });
  }

  // 개별 적 생성 헬퍼
  createEnemy(x, y) {
    const enemy = this.enemies.create(x, y, 'enemy');
    enemy.setCircle(20, 6, 6);
    enemy.setCollideWorldBounds(true);
    enemy.setBounce(0.65);
    enemy.body.useDamping = true;
    enemy.body.setDrag(0.82);
    enemy.isAlive = true;

    // 적 환도 컨테이너 (우측 허리춤 패용)
    const swordContainer = this.add.container(x, y);
    const scabbard = this.add.sprite(0, 16, 'enemy_hwando_scabbard');
    scabbard.setOrigin(0.5, 0.5);
    swordContainer.add(scabbard);
    swordContainer.setDepth(8);
    enemy.setDepth(7);

    // 플레이어를 바라보는 시선으로 초기화
    const toPlayer = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
    enemy.setRotation(toPlayer);
    swordContainer.setRotation(toPlayer);

    enemy.swordContainer = swordContainer;

    // 등장 스케일 애니메이션
    enemy.setScale(0);
    swordContainer.setScale(0);
    this.tweens.add({
      targets: [enemy, swordContainer],
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });

    return enemy;
  }

  // 플레이어 캐릭터 본체 (삿갓 + 비취/청록 도포)
  createPlayerTexture() {
    const size = 52;
    const cx = size / 2;
    const cy = size / 2;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x0c0a08, 0.55);
    g.fillCircle(cx, cy + 2, 22);

    g.fillStyle(0x1a3c48, 1);
    g.fillCircle(cx, cy, 21);
    g.lineStyle(1.5, 0x112832, 0.8);
    g.strokeCircle(cx, cy, 21);

    const hatRadius = 18;
    g.fillStyle(0xc89d58, 1);
    g.fillCircle(cx, cy, hatRadius);
    g.lineStyle(2, 0x4a3212, 1);
    g.strokeCircle(cx, cy, hatRadius);

    g.lineStyle(1, 0x8c6630, 0.7);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      g.lineBetween(cx, cy, cx + Math.cos(angle) * hatRadius, cy + Math.sin(angle) * hatRadius);
    }

    g.fillStyle(0x5a3e18, 1);
    g.fillCircle(cx, cy, 4.5);
    g.fillStyle(0x2d1b08, 1);
    g.fillCircle(cx, cy, 2);

    g.fillStyle(0xb83b2e, 1);
    g.fillCircle(cx + 8, cy, 2.5);

    g.generateTexture('player', size, size);
    g.destroy();
  }

  // 플레이어 비취 환도 텍스처
  createHwandoTextures() {
    const getCurveY = (x, totalLen, baseY, maxSag) => {
      const t = x / totalLen;
      return baseY + maxSag * Math.sin(Math.PI * t);
    };

    const scabbardW = 68;
    const scabbardH = 26;
    const baseY = 8;
    const sag = 5.5;
    const sg = this.make.graphics({ x: 0, y: 0, add: false });

    sg.lineStyle(5, 0x0c0a08, 0.35);
    sg.beginPath();
    for (let x = 3; x <= 64; x += 3) {
      const cy = getCurveY(x, scabbardW, baseY + 3, sag);
      if (x === 3) sg.moveTo(x, cy);
      else sg.lineTo(x, cy);
    }
    sg.strokePath();

    const topPoints = [];
    const bottomPoints = [];
    for (let x = 3; x <= 48; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      topPoints.push({ x, y: cy - 2.5 });
      bottomPoints.push({ x, y: cy + 2.5 });
    }

    sg.fillStyle(0x327a69, 1);
    sg.beginPath();
    sg.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) sg.lineTo(topPoints[i].x, topPoints[i].y);
    for (let i = bottomPoints.length - 1; i >= 0; i--) sg.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    sg.closePath();
    sg.fillPath();

    sg.lineStyle(1, 0x1d4d41, 0.85);
    sg.strokePath();

    sg.fillStyle(0x59b5a0, 0.9);
    for (let x = 10; x <= 42; x += 5) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillCircle(x, cy - 0.7, 0.9);
      sg.fillCircle(x + 2.5, cy + 1.2, 0.9);
    }

    sg.fillStyle(0xd4af37, 1);
    for (let x = 3; x <= 9; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillRect(x, cy - 2.5, 2, 5);
    }
    sg.lineStyle(1, 0x8a6f20, 1);
    const endY = getCurveY(3, scabbardW, baseY, sag);
    sg.strokeRect(3, endY - 2.5, 6, 5);

    sg.fillStyle(0xd4af37, 1);
    const lipY = getCurveY(47, scabbardW, baseY, sag);
    sg.fillRect(46, lipY - 3.5, 3, 7);

    const ringY = getCurveY(25, scabbardW, baseY, sag);
    sg.fillStyle(0xd4af37, 1);
    sg.fillRect(24, ringY - 3.5, 4, 7);
    sg.fillStyle(0x8a6f20, 1);
    sg.fillCircle(26, ringY + 3.5, 1.8);

    sg.lineStyle(1.5, 0xb83b2e, 1);
    sg.lineBetween(25, ringY + 4, 23, ringY + 12);
    sg.lineBetween(27, ringY + 4, 29, ringY + 13);
    sg.fillStyle(0xb83b2e, 1);
    sg.fillCircle(23, ringY + 12, 1.8);
    sg.fillCircle(29, ringY + 13, 1.8);

    const guardY = getCurveY(49, scabbardW, baseY, sag);
    sg.fillStyle(0xd4af37, 1);
    sg.fillCircle(49, guardY, 4.5);
    sg.lineStyle(1, 0x8a6f20, 1);
    sg.strokeCircle(49, guardY, 4.5);

    for (let x = 50; x <= 61; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillStyle(0x276153, 1);
      sg.fillRect(x, cy - 2, 2, 4);
    }

    const hiltY = getCurveY(62, scabbardW, baseY, sag);
    sg.fillStyle(0xd4af37, 1);
    sg.fillRect(62, hiltY - 2.5, 3, 5);

    sg.generateTexture('hwando_scabbard', scabbardW, scabbardH);
    sg.destroy();

    // 2) 칼날 (78 x 26)
    const bladeW = 78;
    const bladeH = 26;
    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    const bladeBaseY = 12;
    const bladeSag = 5.5;

    const hiltEndY = getCurveY(0, bladeW, bladeBaseY, bladeSag);
    bg.fillStyle(0xd4af37, 1);
    bg.fillRect(0, hiltEndY - 2.5, 3, 5);

    for (let x = 3; x <= 15; x += 2) {
      const cy = getCurveY(x, bladeW, bladeBaseY, bladeSag);
      bg.fillStyle(0x276153, 1);
      bg.fillRect(x, cy - 2, 2, 4);
    }

    const bGuardY = getCurveY(16, bladeW, bladeBaseY, bladeSag);
    bg.fillStyle(0xd4af37, 1);
    bg.fillCircle(16, bGuardY, 4.5);
    bg.lineStyle(1, 0x8a6f20, 1);
    bg.strokeCircle(16, bGuardY, 4.5);

    const bTopPoints = [];
    const bBottomPoints = [];
    for (let x = 16; x <= 75; x += 2) {
      const cy = getCurveY(x, bladeW, bladeBaseY, bladeSag);
      const halfThick = x > 65 ? 1.8 * (1 - (x - 65) / 10) + 0.3 : 1.8;
      bTopPoints.push({ x, y: cy - halfThick });
      bBottomPoints.push({ x, y: cy + halfThick });
    }

    bg.fillStyle(0xf0f5fa, 1);
    bg.beginPath();
    bg.moveTo(bTopPoints[0].x, bTopPoints[0].y);
    for (let i = 1; i < bTopPoints.length; i++) bg.lineTo(bTopPoints[i].x, bTopPoints[i].y);
    for (let i = bBottomPoints.length - 1; i >= 0; i--) bg.lineTo(bBottomPoints[i].x, bBottomPoints[i].y);
    bg.closePath();
    bg.fillPath();

    bg.lineStyle(1, 0xffffff, 1);
    bg.beginPath();
    for (let i = 0; i < bTopPoints.length; i++) {
      if (i === 0) bg.moveTo(bTopPoints[i].x, bTopPoints[i].y);
      else bg.lineTo(bTopPoints[i].x, bTopPoints[i].y);
    }
    bg.strokePath();

    bg.lineStyle(1, 0x8898a8, 0.85);
    bg.beginPath();
    for (let x = 18; x <= 62; x += 3) {
      const cy = getCurveY(x, bladeW, bladeBaseY, bladeSag);
      if (x === 18) bg.moveTo(x, cy);
      else bg.lineTo(x, cy);
    }
    bg.strokePath();

    bg.generateTexture('hwando_blade', bladeW, bladeH);
    bg.destroy();
  }

  // 기본 적(근접 칼잡이) 텍스처 (검은색과 파란색 메인 테마)
  createEnemyTexture() {
    const size = 52;
    const cx = size / 2;
    const cy = size / 2;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x0c0a08, 0.6);
    g.fillCircle(cx, cy + 2, 22);

    g.fillStyle(0x13171d, 1);
    g.fillCircle(cx, cy, 21);
    g.lineStyle(1.5, 0x1f2937, 0.9);
    g.strokeCircle(cx, cy, 21);

    const hatRadius = 18;
    g.fillStyle(0x1a202c, 1);
    g.fillCircle(cx, cy, hatRadius);
    g.lineStyle(2, 0x0f131a, 1);
    g.strokeCircle(cx, cy, hatRadius);

    g.lineStyle(1, 0x3182ce, 0.85);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      g.lineBetween(cx, cy, cx + Math.cos(angle) * hatRadius, cy + Math.sin(angle) * hatRadius);
    }

    g.fillStyle(0x10141a, 1);
    g.fillCircle(cx, cy, 4.5);
    g.fillStyle(0x2b6cb0, 1);
    g.fillCircle(cx, cy, 2);

    g.fillStyle(0x4299e1, 1);
    g.fillCircle(cx + 8, cy, 2.8);

    g.generateTexture('enemy', size, size);
    g.destroy();
  }

  // 적의 흑청 환도 칼집 텍스처
  createEnemyHwandoTextures() {
    const getCurveY = (x, totalLen, baseY, maxSag) => {
      const t = x / totalLen;
      return baseY + maxSag * Math.sin(Math.PI * t);
    };

    const scabbardW = 68;
    const scabbardH = 26;
    const baseY = 8;
    const sag = 5.5;
    const sg = this.make.graphics({ x: 0, y: 0, add: false });

    sg.lineStyle(5, 0x0c0a08, 0.35);
    sg.beginPath();
    for (let x = 3; x <= 64; x += 3) {
      const cy = getCurveY(x, scabbardW, baseY + 3, sag);
      if (x === 3) sg.moveTo(x, cy);
      else sg.lineTo(x, cy);
    }
    sg.strokePath();

    const topPoints = [];
    const bottomPoints = [];
    for (let x = 3; x <= 48; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      topPoints.push({ x, y: cy - 2.5 });
      bottomPoints.push({ x, y: cy + 2.5 });
    }

    sg.fillStyle(0x151b24, 1);
    sg.beginPath();
    sg.moveTo(topPoints[0].x, topPoints[0].y);
    for (let i = 1; i < topPoints.length; i++) sg.lineTo(topPoints[i].x, topPoints[i].y);
    for (let i = bottomPoints.length - 1; i >= 0; i--) sg.lineTo(bottomPoints[i].x, bottomPoints[i].y);
    sg.closePath();
    sg.fillPath();

    sg.lineStyle(1, 0x2b6cb0, 0.8);
    sg.strokePath();

    sg.fillStyle(0x4299e1, 0.95);
    for (let x = 10; x <= 42; x += 5) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillCircle(x, cy - 0.7, 0.9);
      sg.fillCircle(x + 2.5, cy + 1.2, 0.9);
    }

    sg.fillStyle(0x718096, 1);
    for (let x = 3; x <= 9; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillRect(x, cy - 2.5, 2, 5);
    }
    sg.lineStyle(1, 0x4a5568, 1);
    const endY = getCurveY(3, scabbardW, baseY, sag);
    sg.strokeRect(3, endY - 2.5, 6, 5);

    sg.fillStyle(0x718096, 1);
    const lipY = getCurveY(47, scabbardW, baseY, sag);
    sg.fillRect(46, lipY - 3.5, 3, 7);

    const ringY = getCurveY(25, scabbardW, baseY, sag);
    sg.fillStyle(0x718096, 1);
    sg.fillRect(24, ringY - 3.5, 4, 7);
    sg.fillStyle(0x4a5568, 1);
    sg.fillCircle(26, ringY + 3.5, 1.8);

    sg.lineStyle(1.5, 0x3182ce, 1);
    sg.lineBetween(25, ringY + 4, 23, ringY + 12);
    sg.lineBetween(27, ringY + 4, 29, ringY + 13);
    sg.fillStyle(0x3182ce, 1);
    sg.fillCircle(23, ringY + 12, 1.8);
    sg.fillCircle(29, ringY + 13, 1.8);

    const guardY = getCurveY(49, scabbardW, baseY, sag);
    sg.fillStyle(0x718096, 1);
    sg.fillCircle(49, guardY, 4.5);
    sg.lineStyle(1, 0x4a5568, 1);
    sg.strokeCircle(49, guardY, 4.5);

    for (let x = 50; x <= 61; x += 2) {
      const cy = getCurveY(x, scabbardW, baseY, sag);
      sg.fillStyle(0x1a202c, 1);
      sg.fillRect(x, cy - 2, 2, 4);
    }

    const hiltY = getCurveY(62, scabbardW, baseY, sag);
    sg.fillStyle(0x718096, 1);
    sg.fillRect(62, hiltY - 2.5, 3, 5);

    sg.generateTexture('enemy_hwando_scabbard', scabbardW, scabbardH);
    sg.destroy();
  }

  setupInput() {
    this.input.on('pointerdown', (pointer) => {
      if (this.turnState !== 'PLAYER_INPUT') return;

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.player.x, this.player.y);
      if (dist <= 48) {
        this.isDragging = true;
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.isDragging || this.turnState !== 'PLAYER_INPUT') return;

      this.aimGraphics.clear();

      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      const pullDist = Math.min(Math.hypot(dx, dy), this.maxDragDistance);
      const pullAngle = Math.atan2(dy, dx);
      const launchAngle = pullAngle + Math.PI;

      this.player.setRotation(launchAngle);

      const lineLen = pullDist * 1.5;
      const endX = this.player.x + Math.cos(launchAngle) * lineLen;
      const endY = this.player.y + Math.sin(launchAngle) * lineLen;

      this.aimGraphics.lineStyle(2, 0xd4af37, 0.6);
      this.aimGraphics.lineBetween(this.player.x, this.player.y, pointer.x, pointer.y);

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

      this.aimGraphics.fillStyle(0xd4af37, 1);
      this.aimGraphics.fillCircle(endX, endY, 5);
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.isDragging || this.turnState !== 'PLAYER_INPUT') return;
      this.isDragging = false;
      this.aimGraphics.clear();

      const dx = pointer.x - this.player.x;
      const dy = pointer.y - this.player.y;
      const pullDist = Math.min(Math.hypot(dx, dy), this.maxDragDistance);

      if (pullDist > 15) {
        const pullAngle = Math.atan2(dy, dx);
        const launchAngle = pullAngle + Math.PI;
        const speed = (pullDist / this.maxDragDistance) * this.maxSpeed;

        // 발사 시 콤보 카운트 리셋 및 정상 마찰력 설정
        this.turnComboCount = 0;
        this.player.body.setDrag(0.85);

        this.player.setRotation(launchAngle);
        this.player.setVelocity(
          Math.cos(launchAngle) * speed,
          Math.sin(launchAngle) * speed
        );
        this.turnState = 'PLAYER_MOVING';
      }
    });
  }

  // 플레이어와 적 충돌: 감속 최소화 & 다중 처치 콤보 가속 & 전멸 시 급제동
  handleCombatCollision(player, enemy) {
    if (this.turnState !== 'PLAYER_MOVING' || !enemy.isAlive) return;

    enemy.isAlive = false;

    // 1. 충돌 전 플레이어 속도 측정
    const currentSpeed = player.body.velocity.length();

    // 2. 턴 내 콤보 카운트 증가
    this.turnComboCount++;

    // 3. 충돌 감속 폭 최소화 및 연속 공격 콤보 가속 적용!
    // 기본 감속: 95% 보존 (단 5%만 소모하여 시원하게 뚫고 나감)
    // 2마리 이상 연속 타격 시 콤보 부스트 가속 (2콤보: 1.12배, 3콤보: 1.25배 ...)
    let speedMult = 0.95;
    if (this.turnComboCount >= 2) {
      speedMult = 1.0 + (this.turnComboCount - 1) * 0.13;
    }
    const boostedSpeed = Math.min(Math.max(currentSpeed, 420) * speedMult, 1100);

    // 충돌 반사 방향으로 속도 보존 및 즉시 재부여
    const bounceAngle = Math.atan2(player.body.velocity.y, player.body.velocity.x);
    player.setVelocity(Math.cos(bounceAngle) * boostedSpeed, Math.sin(bounceAngle) * boostedSpeed);

    // 4. 타격 각도 계산 및 발도 베기 발동
    const hitAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    this.triggerSlash(hitAngle);

    // 5. 화려한 수묵/참격 파열 이펙트 및 적 처치 연출
    this.triggerEnemyDeathEffects(enemy, hitAngle);

    // 6. 콤보 팝업 텍스트 표시 (2콤보 이상)
    if (this.turnComboCount >= 2) {
      this.showComboNotice(enemy.x, enemy.y, this.turnComboCount);
    }

    // 7. 적 전멸 여부 검사: 모든 적 처치 시 이번 턴 동안 마찰력을 확 올려 빠르게 정지!
    const livingEnemies = this.enemies.getChildren().filter(e => e.isAlive);
    if (livingEnemies.length === 0) {
      this.player.body.setDrag(0.50); // 급제동 브레이크: 0.3초 내 깔끔 정지
      this.showAllClearNotice();
    }
  }

  // 콤보 팝업 UI 표시
  showComboNotice(x, y, comboCount) {
    const comboText = this.add.text(x, y - 20, `${comboCount} 콤보!`, {
      fontSize: '20px',
      fontStyle: 'bold',
      fontFamily: 'sans-serif',
      fill: comboCount >= 3 ? '#ffdd55' : '#63b3ed',
      stroke: '#0c0a08',
      strokeThickness: 4
    });
    comboText.setOrigin(0.5, 0.5);
    comboText.setDepth(20);
    comboText.setScale(0.5);

    this.tweens.add({
      targets: comboText,
      y: y - 55,
      scaleX: 1.25,
      scaleY: 1.25,
      alpha: 0,
      duration: 550,
      ease: 'Back.easeOut',
      onComplete: () => comboText.destroy()
    });
  }

  // 전멸(全滅) 알림 UI 표시
  showAllClearNotice() {
    const clearText = this.add.text(ARENA.x + ARENA.width / 2, ARENA.y + ARENA.height * 0.38, '全滅 (전멸)', {
      fontSize: '28px',
      fontStyle: 'bold',
      fontFamily: 'sans-serif',
      fill: '#d4af37',
      stroke: '#0c0a08',
      strokeThickness: 5
    });
    clearText.setOrigin(0.5, 0.5);
    clearText.setDepth(20);
    clearText.setScale(0.7);

    this.tweens.add({
      targets: clearText,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => clearText.destroy()
    });
  }

  // 화려한 적 처치 연출: 일도양단 분리, 수묵 파열 잉크 방울, 교차 참격 섬광
  triggerEnemyDeathEffects(enemy, hitAngle) {
    const ex = enemy.x;
    const ey = enemy.y;

    enemy.setVisible(false);
    if (enemy.swordContainer) enemy.swordContainer.setVisible(false);

    // 1) 일도양단 절단 조각 분리 연출
    const cutNormal = hitAngle + Math.PI / 2;
    const splitDist = 28;

    for (let dir of [-1, 1]) {
      const slicePiece = this.add.graphics();
      slicePiece.setPosition(ex, ey);
      slicePiece.setDepth(14);

      slicePiece.fillStyle(0x13171d, 1);
      slicePiece.slice(0, 0, 20, cutNormal + (dir === 1 ? 0 : Math.PI), cutNormal + (dir === 1 ? Math.PI : Math.PI * 2), false);
      slicePiece.fillPath();

      slicePiece.lineStyle(2, 0x63b3ed, 1);
      slicePiece.lineBetween(
        Math.cos(cutNormal) * -18, Math.sin(cutNormal) * -18,
        Math.cos(cutNormal) * 18, Math.sin(cutNormal) * 18
      );

      const targetX = ex + Math.cos(cutNormal) * dir * splitDist;
      const targetY = ey + Math.sin(cutNormal) * dir * splitDist;

      this.tweens.add({
        targets: slicePiece,
        x: targetX,
        y: targetY,
        rotation: dir * 0.8,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 220,
        ease: 'Cubic.easeOut',
        onComplete: () => slicePiece.destroy()
      });
    }

    // 2) 수묵 파열 잉크 방울 & 청염 불꽃 파티클 (12개)
    const particleG = this.add.graphics();
    particleG.setDepth(16);

    const particles = [];
    for (let i = 0; i < 12; i++) {
      const pAngle = (i * Math.PI) / 6 + Phaser.Math.FloatBetween(-0.25, 0.25);
      const pSpeed = Phaser.Math.Between(70, 160);
      const isInk = i % 2 === 0;
      particles.push({
        x: ex,
        y: ey,
        vx: Math.cos(pAngle) * pSpeed,
        vy: Math.sin(pAngle) * pSpeed,
        color: isInk ? 0x0c0a08 : Phaser.Math.RND.pick([0x3182ce, 0x63b3ed, 0xffffff]),
        radius: isInk ? Phaser.Math.FloatBetween(2.5, 4.5) : Phaser.Math.FloatBetween(1.5, 3.0),
        alpha: 1
      });
    }

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 280,
      onUpdate: (tween) => {
        const t = tween.getValue();
        particleG.clear();
        particles.forEach(p => {
          const curX = p.x + p.vx * t * 0.8;
          const curY = p.y + p.vy * t * 0.8;
          particleG.fillStyle(p.color, (1 - t) * p.alpha);
          particleG.fillCircle(curX, curY, p.radius * (1 - t * 0.4));
        });
      },
      onComplete: () => particleG.destroy()
    });

    // 3) 교차 십자 참격 섬광
    const crossSlash = this.add.graphics();
    crossSlash.setPosition(ex, ey);
    crossSlash.setDepth(17);

    crossSlash.lineStyle(3, 0xffffff, 1);
    crossSlash.lineBetween(-35, 0, 35, 0);
    crossSlash.lineStyle(1.5, 0x63b3ed, 0.9);
    crossSlash.lineBetween(0, -25, 0, 25);
    crossSlash.setRotation(hitAngle);

    this.tweens.add({
      targets: crossSlash,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 180,
      ease: 'Power2',
      onComplete: () => crossSlash.destroy()
    });

    this.cameras.main.shake(90, 0.007);

    this.time.delayedCall(240, () => {
      if (enemy.swordContainer) enemy.swordContainer.destroy();
      enemy.destroy();
    });
  }

  // 적 턴 시작 (직격 돌진 / 우회 교란 / 벽 도탄 저격 중 랜덤 선택)
  startEnemyTurn() {
    const livingEnemies = this.enemies.getChildren().filter(e => e.isAlive);

    if (livingEnemies.length === 0) {
      this.time.delayedCall(300, () => {
        this.startPlayerTurnWithRespawn();
      });
      return;
    }

    this.time.delayedCall(250, () => {
      livingEnemies.forEach(e => {
        if (!e.active || !e.body) return;

        const pattern = Phaser.Math.Between(1, 3);
        let launchAngle = 0;
        let launchSpeed = 370;

        const directAngle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);

        if (pattern === 1) {
          launchAngle = directAngle;
          launchSpeed = Phaser.Math.Between(360, 420);
        } else if (pattern === 2) {
          const offsetSign = Phaser.Math.RND.pick([1, -1]);
          const angleOffset = Phaser.Math.FloatBetween(1.2, 2.1);
          launchAngle = directAngle + offsetSign * angleOffset;
          launchSpeed = Phaser.Math.Between(320, 380);
        } else {
          launchAngle = this.calculateRicochetAngle(e.x, e.y);
          launchSpeed = Phaser.Math.Between(460, 530);
        }

        e.setRotation(launchAngle);
        if (e.swordContainer) e.swordContainer.setRotation(launchAngle);
        e.setVelocity(Math.cos(launchAngle) * launchSpeed, Math.sin(launchAngle) * launchSpeed);
      });

      this.time.delayedCall(750, () => {
        this.startPlayerTurnWithRespawn();
      });
    });
  }

  // 벽으로 튕겨서 플레이어에게 도탄되는 반사 각도 계산
  calculateRicochetAngle(ex, ey) {
    const px = this.player.x;
    const py = this.player.y;

    const mirrorTargets = [
      { x: 2 * ARENA.x - px, y: py },
      { x: 2 * (ARENA.x + ARENA.width) - px, y: py },
      { x: px, y: 2 * ARENA.y - py },
      { x: px, y: 2 * (ARENA.y + ARENA.height) - py }
    ];

    const validTargets = [];
    if (ex > ARENA.x + 40) validTargets.push(mirrorTargets[0]);
    if (ex < ARENA.x + ARENA.width - 40) validTargets.push(mirrorTargets[1]);
    if (ey > ARENA.y + 40) validTargets.push(mirrorTargets[2]);
    if (ey < ARENA.y + ARENA.height - 40) validTargets.push(mirrorTargets[3]);

    const selectedTarget = Phaser.Math.RND.pick(validTargets.length > 0 ? validTargets : mirrorTargets);
    return Phaser.Math.Angle.Between(ex, ey, selectedTarget.x, selectedTarget.y);
  }

  // 플레이어 턴 복귀 및 적 리스폰 (랜덤 위치, 3~5마리)
  startPlayerTurnWithRespawn() {
    this.turnState = 'RESPAWN';
    this.turnComboCount = 0;
    this.player.body.setDrag(0.85); // 정상 마찰력 복원

    const currentLiving = this.enemies.getChildren().filter(e => e.isAlive);
    const targetCount = Phaser.Math.Between(3, 5);
    const needSpawnCount = Math.max(0, targetCount - currentLiving.length);

    for (let i = 0; i < needSpawnCount; i++) {
      const pos = this.getRandomSpawnPosition();
      this.createEnemy(pos.x, pos.y);
    }

    this.time.delayedCall(280, () => {
      this.turnState = 'PLAYER_INPUT';
    });
  }

  // 플레이어와 안전 거리가 확보된 랜덤 좌표 탐색
  getRandomSpawnPosition() {
    const padding = 55;
    const minPlayerDist = 120;
    let x = 0;
    let y = 0;
    let attempts = 0;

    do {
      x = Phaser.Math.Between(ARENA.x + padding, ARENA.x + ARENA.width - padding);
      y = Phaser.Math.Between(ARENA.y + padding, ARENA.y + ARENA.height - padding);
      attempts++;
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < minPlayerDist && attempts < 25);

    return { x, y };
  }

  // 발도 부채꼴 베기 공격 모션
  triggerSlash(targetAngle) {
    if (this.isSlashing) return;
    this.isSlashing = true;

    this.scabbard.setAlpha(0.35);
    this.blade.setVisible(true);
    this.blade.setFlipY(true);
    this.blade.setPosition(15, 16);
    this.blade.setRotation(0);

    this.drawSlashArc(targetAngle);

    this.tweens.add({
      targets: this.blade,
      x: 28,
      y: 4,
      rotation: -Math.PI * 0.6,
      duration: 120,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.blade,
          x: 15,
          y: 16,
          rotation: 0,
          duration: 110,
          ease: 'Power1',
          onComplete: () => {
            this.blade.setVisible(false);
            this.blade.setFlipY(false);
            this.scabbard.setAlpha(1);
            this.isSlashing = false;
          }
        });
      }
    });

    this.cameras.main.shake(70, 0.005);
  }

  // 적 방향으로 펼쳐지는 호쾌한 부채꼴 검기 파동
  drawSlashArc(centerAngle) {
    const arcRadius = 75;
    const arcAngle = Math.PI * 0.75;
    const startA = centerAngle - arcAngle / 2;
    const endA = centerAngle + arcAngle / 2;

    const slash = this.add.graphics();
    slash.setDepth(16);
    slash.setPosition(this.player.x, this.player.y);

    slash.fillStyle(0x389a85, 0.32);
    slash.beginPath();
    slash.moveTo(0, 0);
    slash.arc(0, 0, arcRadius, startA, endA, false);
    slash.closePath();
    slash.fillPath();

    slash.lineStyle(3.5, 0xffffff, 0.95);
    slash.beginPath();
    slash.arc(0, 0, arcRadius, startA, endA, false);
    slash.strokePath();

    slash.lineStyle(1.5, 0xd4af37, 0.85);
    slash.beginPath();
    slash.arc(0, 0, arcRadius - 10, startA + 0.1, endA - 0.1, false);
    slash.strokePath();

    this.tweens.add({
      targets: slash,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 170,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        slash.destroy();
      }
    });
  }

  update() {
    this.swordContainer.setPosition(this.player.x, this.player.y);

    if (this.turnState === 'PLAYER_MOVING') {
      const speed = this.player.body.velocity.length();
      if (speed > 35) {
        const moveAngle = Math.atan2(this.player.body.velocity.y, this.player.body.velocity.x);
        this.player.setRotation(moveAngle);
        if (!this.isSlashing) {
          this.swordContainer.setRotation(moveAngle);
        }
      } else {
        this.player.setVelocity(0, 0);
        this.turnState = 'ENEMY_TURN';
        this.startEnemyTurn();
      }
    } else {
      if (!this.isSlashing) {
        this.swordContainer.setRotation(this.player.rotation);
      }
    }

    // 살아있는 적 환도 위치 및 회전 동기화
    this.enemies.getChildren().forEach(enemy => {
      if (!enemy.active || !enemy.swordContainer) return;
      enemy.swordContainer.setPosition(enemy.x, enemy.y);

      const enemySpeed = enemy.body ? enemy.body.velocity.length() : 0;
      if (enemySpeed > 35) {
        const angle = Math.atan2(enemy.body.velocity.y, enemy.body.velocity.x);
        enemy.setRotation(angle);
        enemy.swordContainer.setRotation(angle);
      } else {
        const toPlayer = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        enemy.setRotation(toPlayer);
        enemy.swordContainer.setRotation(toPlayer);
      }
    });
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
