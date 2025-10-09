// --- Clase Simulador ---

class Simulator {
  static ANGLE_COMPLETE = Math.PI * 2;
  static NODE_SPACING = 100;
  static MAP_SCALE = 300;
  static OFF_SET = 10;
  static DIRS = [
    ['OE', -1, 0],
    ['NO', 0, -1],
    ['NE', 1, -1],
    ['ES', 1, 0],
    ['SE', 0, 1],
    ['SO', -1, 1]
  ];

  /**
   * @type {EventListener<{
   *   'find_module': [DetectorNodes]
   * }>}
   */
  events = new EventListener();
  /** 
   * @param {HTMLImageElement} element_img 
   * @param {HTMLCanvasElement} element_mapCanvas 
   * @param {HTMLInputElement} element_chartWave 
   */
  constructor(element_img, element_mapCanvas, element_chartWave) {
    this.element_img = element_img;
    this.element_mapCanvas = element_mapCanvas;
    this.element_chartWave = element_chartWave;

    this.ctx = element_mapCanvas.getContext("2d");

    this.chart_waves = new ChartLine(this, element_chartWave);

    /** @type {Map<string, DetectorNodes>} */
    this.nodes = new Map;
    /** @type {Set<Wave>} */
    this.waves = new Set();

    this.lastTime = null;

    this.element_mapCanvas.addEventListener("mousedown", e => {
      e.preventDefault();
      if (e.button == 0)
        return this.addWave(e);
      if (e.button == 1) {
        return this.showNode(e);
      }
    });


    this.element_mapCanvas.addEventListener('wheel', e => {
      e.preventDefault();
    }, { passive: false });

  }

  applySettings() {
    this.waves = new Set();

    this.width = this.element_mapCanvas.width;
    this.height = this.element_mapCanvas.height;
    this.maxLength = Math.max(this.width, this.height);
    this.diagonal = hypotenuse(this.width, this.height);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    this.generateNodes();
  }

  generateNodes() {
    DetectorNodes.COLLECTION = [];
    this.nodes = new Map;

    this.kmToPx = this.width / Simulator.MAP_SCALE;
    this.spacingPx = Simulator.NODE_SPACING * this.kmToPx;
    this.radius = Math.ceil(this.maxLength / this.spacingPx);

    const { radius, width, height } = this;

    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {

        let [x, y] = DetectorNodes.axis(this, q, r);
        if (Simulator.OFF_SET <= x && x <= width - Simulator.OFF_SET
          && Simulator.OFF_SET <= y && y <= height) {

          let name = `${q},${r}`
          let node = new DetectorNodes(this, q, r, x, y);
          this.nodes.set(name, node);
        }
      }
    }

    this.nodes.forEach(node => {
      for (const [dir, dq, dr] of Simulator.DIRS) {
        let name = `${node.q + dq},${node.r + dr}`;

        if (this.nodes.has(name))
          node.neighbors.set(dir, this.nodes.get(name));
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

    let wave = new Wave(this, canvasX, canvasY);
    this.waves.add(wave);
  }

  showNode(e) {
    const rect = this.element_mapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = this.element_mapCanvas.width / rect.width;
    const scaleY = this.element_mapCanvas.height / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    // Buscar nodo dentro del radio
    let foundNode = DetectorNodes.FIND(canvasX, canvasY);

    if (!foundNode) return;

    if (!DetectorNodes.CURRECT_SELECT)
      return DetectorNodes.CURRECT_SELECT = foundNode;

    if (DetectorNodes.CURRECT_SELECT == foundNode)
      return DetectorNodes.CURRECT_SELECT = null

    return DetectorNodes.CURRECT_SELECT = foundNode;
  }

  update(dt) {
    this.waves.forEach((wave) => {
      wave.update(dt);

      if (wave.is_off_the_map)
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

  run() {
    let loop = (timestamp) => {
      if (!this.lastTime)
        this.lastTime = timestamp;

      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    }

    loop();
  }
}