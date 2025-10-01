// --- Clase Nodo ---

class NodeModule {
  static RADIUS = 3;
  static HITBOXRADIUS = 5;
  static COLLECTION = [];

  /**
   * @param {number} x 
   * @param {number} y 
   * @returns {NodeModule}
   */
  static FIND(x, y) {
    let foundNode = null;

    for (let node of NodeModule.COLLECTION) {
      const dist = distance(x, y, node.x, node.y);

      if (dist <= NodeModule.HITBOXRADIUS) {
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
   */
  constructor(simulator, q, r) {
    this.simulator = simulator;
    this.q = q;
    this.r = r;

    /** @type {Map<string, NodeModule>} */
    this.neighbors = new Map;

    this.reset();

    const centerX = this.simulator.width / 2;
    const centerY = this.simulator.height / 2;

    this.x = centerX + this.simulator.spacingPx * Math.sqrt(3) * (q + r / 2);
    this.y = centerY + this.simulator.spacingPx * (3 / 2) * r;

    NodeModule.COLLECTION.push(this);
  }

  reset() {
    /** @type {keyof NODE_STATES} */
    this.state = "sintiendo";

    /** @type {number} */
    this.acceleration = 0;
    /** @type {number} */
    this.acceleration = 0;
    this.order = 0;
    /** @type {NodeModule?} */
    this.firstNode = null;

    this.confirmation = [{ counter: 0, max: 6 }, { counter: 0, max: 12 }];
  }

  /** @param {Wave} wave  */
  checkWaveCollision(wave) {
    const dist = distance(this.x, this.y, wave.x, wave.y);
    const { radius, offset, pulseDuration: duration } = wave;

    // --- Fase sólida (disco) ---
    if (radius < duration) {
      if (dist <= radius) {
        return true;
      }
    }

    // --- Fase hueca (anillo) ---
    else if (radius - offset <= dist && dist <= radius + offset) {
      return true;
    }

    return false;
  }

  update() {
    // this.state = 'sintiendo';

    for (const wave of this.simulator.waves) {
      if (this.checkWaveCollision(wave)) {
        this.state = 'detectado';
        this.pga = wave.PGA;
        this.acceleration = Math.max(this.acceleration, this.pga);

        if (this.firstNode) {
          this.firstNode.confirm(this);
        } else {
          this.order = 1;
        }

        this.neighbors.forEach(node => node.listenWave(this));

        break; // se queda con el primer impacto detectado
      }
    }
  }

  /** @param {NodeModule} node  */
  listenWave(node) {
    if (this.order) return;

    this.state = 'escuchando';
    this.order = node.order + 1;

    if (1 < node.order)
      this.firstNode = node.firstNode;
    else
      this.firstNode = node;
  }

  /** @param {NodeModule} node  */
  confirm(node) {
    if (node.order < 2 || 3 < node.order) return

    let order = node.order - 2;
    let { counter, max } = this.confirmation[order];

  }

  draw() {
    let ctx = this.simulator.ctx;

    ctx.beginPath();
    ctx.arc(this.x, this.y, NodeModule.RADIUS, 0, Simulator.angleComplete);
    ctx.fillStyle = NODE_STATES[this.state][0];
    ctx.fill();
    ctx.strokeStyle = NODE_STATES[this.state][1];
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = "6px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${this.q}:${this.r}`, this.x, this.y + 12);

    // Magnitud encima
    if (this.acceleration !== null) {
      ctx.fillStyle = "black";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText((this.acceleration * 1000).toFixed(1), this.x, this.y - 12);
    }
  }
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
  return Math.sqrt((cx ** 2) + (cy ** 2));
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