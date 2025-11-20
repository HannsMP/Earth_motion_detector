/** @typedef {'OE'|'NO'|'NE'|'ES'|'SE'|'SO'} DIRS  */

// --- Clase Nodo ---

class DetectorNodes {

  /** 
   * @type {EventListener<{
   *   'selected_node': [Node: DetectorNodes]
   *   'diselected_node': [Node: DetectorNodes]
   *   'collision_before': [Node: DetectorNodes]
   *   'collision_after': [Node: DetectorNodes]
   * }>} 
   */
  static EVENTS = new EventListener();

  /** @type {[DIRS, number, number][]} */
  static DIRS = [
    ['NO', 0, -1],
    ['NE', 1, -1],
    ['OE', -1, 0],
    ['ES', 1, 0],
    ['SO', -1, 1],
    ['SE', 0, 1]
  ];

  /** @type {Map<string, DetectorNodes>} */
  static COLLECTION = new Map;

  /** @type {DetectorNodes?} */
  static CURRECT_SELECT = null;

  static RADIUS = 5;

  static HITBOX_RADIUS = 10;

  static ROOT_THREE = Math.sqrt(3);





  /**
   * @param {DetectorNodes} node 
   */
  static SELECT_NODE(node) {
    DetectorNodes.EVENTS.emitAsync('selected_node', node);
    DetectorNodes.CURRECT_SELECT = node;
  }





  /**
   * @param {DetectorNodes} node 
   */
  static DISELECT_NODE() {
    if (DetectorNodes.CURRECT_SELECT)
      DetectorNodes.EVENTS.emitAsync('diselected_node', DetectorNodes.CURRECT_SELECT);
    DetectorNodes.CURRECT_SELECT = null;
  }





  /**
   * @param {number} x 
   * @param {number} y 
   */
  static FIND_NODE(x, y) {
    let foundNode = null;

    for (let [_, node] of DetectorNodes.COLLECTION) {
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
   * @param {Simulator} simulator 
   * @param {number} q 
   * @param {number} r 
   * @param {number} x 
   * @param {number} y 
   */
  constructor(simulator, q, r, x, y) {
    this.simulator = simulator;
    this.name = `${q},${r}`;
    this.q = q;
    this.r = r;
    this.x = x;
    this.y = y;

    /** @type {Map<string, DetectorNodes>} */
    this.neighbors = new Map;


    /**
     * @type {EventListener<{
     *   'update': []
     * }>}
     */
    this.events = new EventListener();
    this.reset();
  }





  reset() {
    /** @type {keyof NODE_STATES} */
    this.state = "sintiendo";

    /** @type {number} */
    this.duration = 0;
    /** @type {number} */
    this.order = 0;
    /** @type {number} */
    this.accelerationMax = 0;
    /** @type {number} */
    this.velocityMax = 0;
    /** @type {number} */
    this.elapsed = 0;

    /** @type {{ x: number, y: number }[]} */
    this.sampleAcceleration = [];
    /** @type {{ x: number, y: number }[]} */
    this.sampleVelocity = [];
  }





  linked_neighbors() {
    let { q, r, neighbors } = this;
    for (let [dir, dq, dr] of DetectorNodes.DIRS) {
      let name = `${q + dq},${r + dr}`;

      if (DetectorNodes.COLLECTION.has(name))
        neighbors.set(dir, DetectorNodes.COLLECTION.get(name));
    }
  }





  checkWaveCollision() {
    for (const wave of Wave.COLLECTION) {
      if (wave.collision(this))
        return wave;
    }

    return false;
  }





  update(dt) {
    let wave = this.checkWaveCollision();

    if (wave) {
      this.elapsed += dt;

      let { PGA, PGV } = wave;

      this.accelerationMax = Math.max(this.accelerationMax, PGA);
      this.velocityMax = Math.max(this.velocityMax, PGV);

      this.sampleAcceleration.push({ x: this.elapsed, y: PGA });
      this.sampleVelocity.push({ x: this.elapsed, y: PGV });

      let emitCollision = this.state != 'detectado';
      this.state = 'detectado';

      if (emitCollision) {
        wave.triangulation.addNode(this);
        DetectorNodes.EVENTS.emitAsync('collision_before', this);
      }

      if (emitCollision)
        DetectorNodes.EVENTS.emitAsync('collision_after', this);
    }

    this.events.emitAsync('update')
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