// --- Clase Simulador ---

class Simulator {
  static ANGLE_COMPLETE = Math.PI * 2;
  static NODE_SPACING = 100;
  static MAP_SCALE = 300;
  static OFF_SET = 10;

  static WIDTH = 700;
  static HEIGHT = 700;

  /** 
   * @param {HTMLImageElement} element_img 
   * @param {HTMLCanvasElement} element_mapCanvas 
   * @param {HTMLInputElement} element_chartWave 
   */
  constructor(element_img, element_mapCanvas, element_chartWave) {
    this.element_img = element_img;
    this.element_mapCanvas = element_mapCanvas;
    this.element_chartWave = element_chartWave;

    /** @type {CanvasRenderingContext2D } */
    this.ctx = element_mapCanvas.getContext("2d");

    this.chart_waves = new ChartLine(this, element_chartWave);
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
    Wave.COLLECTION = new Set();

    Simulator.WIDTH = this.element_mapCanvas.width;
    Simulator.HEIGHT = this.element_mapCanvas.height;
    this.maxLength = Math.max(Simulator.WIDTH, Simulator.HEIGHT);
    this.diagonal = hypotenuse(Simulator.WIDTH, Simulator.HEIGHT);
    this.centerX = Simulator.WIDTH / 2;
    this.centerY = Simulator.HEIGHT / 2;

    this.generatePopulations();
    this.generateNodes();
  }

  generateNodes() {
    DetectorNodes.COLLECTION = new Map;

    this.kmToPx = Simulator.WIDTH / Simulator.MAP_SCALE;
    this.spacingPx = Simulator.NODE_SPACING * this.kmToPx;
    this.radius = Math.ceil(this.maxLength / this.spacingPx);

    const { radius, width, height } = this;

    for (let q = -radius; q <= radius; q++) {
      for (let r = -radius; r <= radius; r++) {

        let [x, y] = DetectorNodes.axis(this, q, r);
        if (Simulator.OFF_SET <= x && x <= Simulator.WIDTH - Simulator.OFF_SET
          && Simulator.OFF_SET <= y && y <= Simulator.HEIGHT) {

          let node = new DetectorNodes(this, q, r, x, y);
          DetectorNodes.COLLECTION.set(node.name, node);
        }
      }
    }

    DetectorNodes.COLLECTION.forEach(node => node.linked_neighbors());
  }

  generatePopulations() {
    Population.COLLECTION = new Map;

    for (let [name, x, y, size] of point_population[Simulator.MAP_SCALE])
      new Population(this, name, x, y, size);

  }

  addWave(e) {
    const rect = this.element_mapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = Simulator.WIDTH / rect.width;
    const scaleY = Simulator.HEIGHT / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    let wave = new Wave(this, canvasX, canvasY);
    Wave.COLLECTION.add(wave);
  }

  showNode(e) {
    const rect = this.element_mapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = Simulator.WIDTH / rect.width;
    const scaleY = Simulator.HEIGHT / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    // Buscar nodo dentro del radio
    let foundNode = DetectorNodes.FIND_NODE(canvasX, canvasY);

    if (!foundNode) return;

    if (DetectorNodes.CURRECT_SELECT && DetectorNodes.CURRECT_SELECT == foundNode)
      return DetectorNodes.DISELECT_NODE();

    DetectorNodes.SELECT_NODE(foundNode);
  }

  update(dt) {
    Wave.COLLECTION.forEach(wave => {
      wave.update(dt);

      if (wave.is_off_the_map)
        Wave.COLLECTION.delete(wave);
    });

    if (Wave.COLLECTION.size)
      this.chart_waves.update();

    DetectorNodes.COLLECTION.forEach(node => node.update(dt));
  }

  draw() {
    this.ctx.drawImage(this.element_img, 0, 0, Simulator.WIDTH, Simulator.HEIGHT);
    Wave.COLLECTION.forEach(wave => wave.draw());

    // Dibujar poblaciones (si existen)
    if (typeof Population !== 'undefined' && Population.COLLECTION) {
      Population.COLLECTION.forEach(p => p.draw());
    }

    DetectorNodes.COLLECTION.forEach(node => node.draw());
  }

  run() {

    /** @param {number} timestamp */
    let loop = (timestamp) => {
      const dt = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;

      this.update(dt);
      this.draw();

      requestAnimationFrame(loop);
    }

    requestAnimationFrame((timestamp) => {
      this.timestamp = timestamp;
      loop(timestamp);
    });
  }
}










function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
};
function generadorPoint(name = '-', size = 10) {
  const W = 700, H = 700;
  const MARGIN = 8;
  return [name, rnd(MARGIN, W - MARGIN), rnd(MARGIN, H - MARGIN), size];
}

/** @type {{[key_map]: [nombre: string, x: number, y: number][]}} */
const point_population = {
  // Las coordenadas son fracciones relativas al canvas: [nombre, fracX, fracY, tamañoPx?]
  300: [
    ["A", 0, 155, 20],
    ["B", 85, 255, 20],
    ["C", 115, 315, 20],
    ["D", 135, 395, 30],
    ["E", 215, 515, 20],
    ["F", 285, 615, 20],
    ["G", 355, 685, 20],
    ['H', 576, 167, 10],
    ['I', 506, 260, 10],
    ['J', 318, 458, 10],
    ['K', 645, 219, 10],
    ['L', 349, 531, 10],
    ['M', 166, 272, 10],
    ['N', 280, 187, 10],
    ['Ñ', 300, 528, 10],
    ['O', 31, 118, 10],
    ['P', 354, 82, 10],
    ['Q', 651, 436, 10],
    ['R', 314, 135, 10],
    ['S', 584, 345, 10],
    ['T', 642, 380, 10],
    ['V', 638, 577, 10],
    ['X', 517, 501, 10],
    ['Y', 401, 345, 10],
    ['Z', 412, 462, 10],
  ],
  500: [
    ["A", 0, 155, 20],
    ["B", 85, 255, 20],
    ["C", 115, 315, 20],
    ["D", 75, 395, 30],
    ["E", 215, 515, 20],
    ["F", 285, 615, 20],
    ["G", 215, 685, 20],
    ['H', 576, 167, 10],
    ['I', 506, 260, 10],
    ['J', 318, 458, 10],
    ['K', 645, 219, 10],
    ['L', 349, 531, 10],
    ['M', 166, 272, 10],
    ['N', 280, 187, 10],
    ['Ñ', 300, 528, 10],
    ['O', 31, 118, 10],
    ['P', 354, 82, 10],
    ['Q', 651, 436, 10],
    ['R', 314, 135, 10],
    ['S', 584, 345, 10],
    ['T', 642, 380, 10],
    ['V', 638, 577, 10],
    ['X', 517, 501, 10],
    ['Y', 401, 345, 10],
    ['Z', 412, 462, 10],
  ],
  1000: [
    ["A", 0, 155, 20],
    ["B", 85, 255, 20],
    ["C", 115, 315, 20],
    ["D", 50, 515, 30],
    ["E", 215, 515, 20],
    ["F", 285, 615, 20],
    ["G", 355, 685, 20],
    ['H', 576, 167, 10],
    ['I', 506, 260, 10],
    ['J', 318, 458, 10],
    ['K', 645, 219, 10],
    ['L', 349, 531, 10],
    ['M', 166, 272, 10],
    ['N', 280, 187, 10],
    ['Ñ', 300, 528, 10],
    ['O', 31, 118, 10],
    ['P', 354, 82, 10],
    ['Q', 651, 436, 10],
    ['R', 314, 135, 10],
    ['S', 584, 345, 10],
    ['T', 642, 380, 10],
    ['V', 638, 577, 10],
    ['X', 517, 501, 10],
    ['Y', 401, 345, 10],
    ['Z', 412, 462, 10],
  ],
  3000: [
    ["A", 0, 155, 20],
    ["B", 85, 255, 20],
    ["C", 115, 315, 20],
    ["D", 25, 395, 30],
    ["E", 215, 515, 20],
    ["F", 285, 615, 20],
    ["G", 355, 685, 20],
    ['H', 576, 167, 10],
    ['I', 506, 260, 10],
    ['J', 318, 458, 10],
    ['K', 645, 219, 10],
    ['L', 349, 531, 10],
    ['M', 166, 272, 10],
    ['N', 280, 187, 10],
    ['Ñ', 300, 528, 10],
    ['O', 31, 118, 10],
    ['P', 354, 82, 10],
    ['Q', 651, 436, 10],
    ['R', 314, 135, 10],
    ['S', 584, 345, 10],
    ['T', 642, 380, 10],
    ['V', 638, 577, 10],
    ['X', 517, 501, 10],
    ['Y', 401, 345, 10],
    ['Z', 412, 462, 10],
  ],
}