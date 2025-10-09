// --- Clase Nodo ---

class DetectorNodes {
  static CURRECT_SELECT = null;
  static RADIUS = 5;
  static HITBOX_RADIUS = 10;
  static COLLECTION = [];
  static ROOT_THREE = Math.sqrt(3);

  /**
   * @param {number} x 
   * @param {number} y 
   * @returns {DetectorNodes}
   */
  static FIND(x, y) {
    let foundNode = null;

    for (let node of DetectorNodes.COLLECTION) {
      const dist = distance(x, y, node.x, node.y);

      if (dist <= DetectorNodes.HITBOX_RADIUS) {
        foundNode = node;
        break;
      }
    }

    return foundNode;
  }

  /**
   * @param {Simulator} simulator 
   * @param {number} q 
   * @param {number} r 
   * @returns 
   */
  static axis({ spacingPx, centerX, centerY }, q, r) {
    let x = centerX + (spacingPx * ((q + r / 2)));
    let y = centerY + (spacingPx * ((DetectorNodes.ROOT_THREE * r) / 2));
    return [x, y];
  }

  /** 
   * @type {EventListener<{
   *   'collision_before': [Node: DetectorNodes]
   *   'collision_after': [Node: DetectorNodes]
   * }>} 
   */
  static EVENTS = new EventListener();

  /** 
   * @param {Simulator} simulator 
   * @param {number} q 
   * @param {number} r 
   * @param {number} x 
   * @param {number} y 
   */
  constructor(simulator, q, r, x, y) {
    this.simulator = simulator;
    this.q = q;
    this.r = r;
    this.x = x;
    this.y = y;

    /** @type {Map<string, DetectorNodes>} */
    this.neighbors = new Map;

    this.reset();

    DetectorNodes.COLLECTION.push(this);
  }

  setInfo() {
    if (this.info?.span)
      this.info.span.textContent
        = `(${this.state.slice(0, 3)}) PGA: ${this.pga.toFixed(1)}, SEG: ${this.duration.toFixed(1)}, (${this.q}, ${this.r})`;
  }

  reset() {
    /** @type {{span: HTMLSpanElement}} */
    this.info = {};
    /** @type {keyof NODE_STATES} */
    this.state = "sintiendo";

    /** @type {number} */
    this.stampTime = null;
    /** @type {number} */
    this.duration = 0;
    /** @type {number} */
    this.acceleration = 0;
    /** @type {number} */
    this.acceleration = 0;
    this.order = 0;
    /** @type {DetectorNodes?} */
    this.firstNode = null;

    this.confirmation = [{ counter: 0, max: 6 }, { counter: 0, max: 12 }];
  }

  checkWaveCollision() {
    for (const wave of this.simulator.waves) {
      if (wave.collision(this))
        return wave;
    }

    return false;
  }

  update() {
    let wave = this.checkWaveCollision();

    if (wave) {
      let emitCollision = this.state != 'detectado';
      this.state = 'detectado';

      if (emitCollision) {
        DetectorNodes.EVENTS.emit('collision_before', this);
        this.stampTime = Date.now();
      }

      this.duration = (Date.now() - this.stampTime) / 1000;

      this.pga = wave.PGA;
      this.acceleration = Math.max(this.acceleration, this.pga);

      if (this.firstNode) {
        this.firstNode.confirm(this);
      } else {
        this.order = 1;
      }

      this.neighbors.forEach(node => node.listenWave(this));

      if (emitCollision)
        DetectorNodes.EVENTS.emit('collision_after', this);
    }
    else
      this.state = 'sintiendo';

    this.setInfo();
  }

  /** @param {DetectorNodes} node  */
  listenWave(node) {
    if (this.order) return;

    this.state = 'escuchando';
    this.order = node.order + 1;

    if (1 < node.order)
      this.firstNode = node.firstNode;
    else
      this.firstNode = node;
  }

  /** @param {DetectorNodes} node  */
  confirm(node) {
    if (node.order < 2 || 3 < node.order) return

    let order = node.order - 2;
    let { counter, max } = this.confirmation[order];

  }

  draw() {
    let ctx = this.simulator.ctx;

    /* Cuerpo */
    ctx.beginPath();
    ctx.arc(this.x, this.y, DetectorNodes.RADIUS, 0, Simulator.ANGLE_COMPLETE);
    ctx.fillStyle = NODE_STATES[this.state][0];
    ctx.fill();
    ctx.strokeStyle = NODE_STATES[this.state][1];
    ctx.lineWidth = 2;
    ctx.stroke();

    /* Borde */
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "black";
    let text = `(${this.q}: ${this.r})`;
    let posX = this.x;
    let posY = this.y - 14;
    ctx.strokeText(text, posX, posY); // dibuja el borde
    ctx.fillText(text, posX, posY);   // dibuja el relleno

    /* Seleccion */
    if (DetectorNodes.CURRECT_SELECT == this) {
      ctx.beginPath();
      ctx.setLineDash([3, 2]);
      ctx.arc(this.x, this.y, DetectorNodes.HITBOX_RADIUS, 0, Simulator.ANGLE_COMPLETE);
      ctx.strokeStyle = `rgba(138, 0, 0, 1)`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}










/**
 * @param {number} w 
 * @param {number} h 
 */
function hypotenuse(w, h) {
  return Math.sqrt((w ** 2) + (h ** 2));
}










/**
 * @param {number} ax 
 * @param {number} ay 
 * @param {number} bx 
 * @param {number} by 
 */
function distance(ax, ay, bx, by) {
  let cx = bx - ax;
  let cy = by - ay;
  return hypotenuse(cx, cy);
}










/**
 * @param {number[]} sensorTimes 
 */
function estimateOrigin(sensorTimes) {
  const minTime = Math.min(...sensorTimes);
  const relativeTimes = sensorTimes.map(t => t - minTime);

  // Rank sensors by detection time
  const ranked = relativeTimes
    .map((t, i) => ({ sensor: i, time: t }))
    .sort((a, b) => a.time - b.time);

  return {
    likelyOriginNear: ranked[0].sensor,
    symmetryBetween: relativeTimes.filter(t => t === 0).map((_, i) => i),
    timeDifferences: relativeTimes
  };
}










// --- Colores por estado [interior, borde] ---
const NODE_STATES = {
  'sintiendo': ["rgba(0, 0, 0, 0.7)", "rgba(0, 0, 0, 0.7)"],
  'escuchando': ["rgba(54, 54, 54, 0.7)", "rgba(255, 200, 0, 0.8)"],
  'alerta': ["rgba(255, 0, 0, 0.7)", "rgba(255, 80, 0, 0.8)"],
  'detectado': ["rgba(255, 0, 0, 0.7)", "rgba(255, 0, 0, 0.86)"]
};

// --- Colores para flechas ---
const NODE_ARROW = {
  'preguntando': "cyan",
  'respondiendo': "green",
  'ordenar': "blue"
};