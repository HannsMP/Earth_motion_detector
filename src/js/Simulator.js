// --- Clase Simulador ---

class Simulator {
  static speed = 0.7;
  static angleComplete = Math.PI * 2;

  /** 
   * @param {HTMLImageElement} element_img 
   * @param {HTMLCanvasElement} element_mapCanvas 
   * @param {HTMLInputElement} element_mapScale 
   * @param {HTMLInputElement} element_nodeSpacing 
   * @param {HTMLInputElement} element_magnitude 
   * @param {HTMLInputElement} element_duration 
   * @param {HTMLInputElement} element_chartWave 
   */
  constructor(element_img, element_mapCanvas, element_mapScale, element_nodeSpacing, element_magnitude, element_duration, element_chartWave) {
    this.element_img = element_img;
    this.element_mapCanvas = element_mapCanvas;
    this.element_mapScale = element_mapScale;
    this.element_nodeSpacing = element_nodeSpacing;
    this.element_magnitude = element_magnitude;
    this.element_duration = element_duration;
    this.element_chartWave = element_chartWave;

    this.ctx = element_mapCanvas.getContext("2d");

    this.chart_waves = new ChartLine(this, element_chartWave);

    /** @type {Map<string, NodeModule>} */
    this.nodes = new Map;
    /** @type {Set<Wave>} */
    this.waves = new Set();

    this.lastTime = null;
  }

  applySettings() {
    this.mapScale = parseFloat(this.element_mapScale.value); // km
    this.nodeSpacing = parseFloat(this.element_nodeSpacing.value); // km
    this.waves = new Set();

    const { width, height } = this.element_mapCanvas;
    this.width = width;
    this.height = height;
    this.kmToPx = this.width / this.mapScale;
    this.spacingPx = this.nodeSpacing * this.kmToPx;
    this.maxLength = Math.max(this.width, this.height);
    this.diagonal = ((this.width ** 2) + (this.height ** 2)) ** 0.5;
    this.radius = this.maxLength / this.spacingPx;


    this.element_mapCanvas.addEventListener("click", (e) => this.addWave(e));

    this.generateNodes();
    this.linkNeighbors();
  }

  generateNodes() {
    this.nodes = new Map;

    for (let q = -this.radius; q <= this.radius; q++) {
      for (let r = -this.radius; r <= this.radius; r++) {
        const node = new NodeModule(this, q, r);
        if (
          node.x >= 0 && node.x <= this.width &&
          node.y >= 0 && node.y <= this.height
        ) {
          this.nodes.set(`${node.q},${node.r}`, node);
        }
      }
    }
  }

  linkNeighbors() {
    const dirs = [
      ['OE', -1, 0],
      ['NO', 0, -1],
      ['NE', 1, -1],
      ['ES', 1, 0],
      ['SE', 0, 1],
      ['SO', -1, 1]
    ];

    this.nodes.forEach(node => {
      for (const [dir, dq, dr] of dirs) {
        const key = `${node.q + dq},${node.r + dr}`;
        if (this.nodes.has(key)) {
          node.neighbors.set(dir, this.nodes.get(key));
        }
      }
    });
  }

  addWave(e) {
    const rect = this.element_mapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = this.element_mapCanvas.width / rect.width;
    const scaleY = this.element_mapCanvas.height / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    this.waves.add(new Wave(this, canvasX, canvasY));
  }

  update(dt) {
    this.waves.forEach((wave) => {
      wave.update(dt);

      if (wave.outerRadius >= wave.lifeRadiusPx || wave.velocity <= 0 && wave.elapsed >= wave.travelDuration)
        this.waves.delete(wave);
    });

    if (this.waves.size)
      this.chart_waves.update();

    this.nodes.forEach(node => node.update());
  }

  draw() {
    this.ctx.drawImage(this.element_img, 0, 0, this.width, this.height);
    this.waves.forEach(wave => wave.draw());
    this.nodes.forEach(node => node.draw());
  }

  loop = (timestamp) => {
    if (!this.lastTime)
      this.lastTime = timestamp;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}