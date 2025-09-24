/**
 * @param {number} ax 
 * @param {number} ay 
 * @param {number} bx 
 * @param {number} by 
 * @returns 
 */
function distance(ax, ay, bx, by) {
  let cx = bx - ax
  let cy = by - ay
  return Math.sqrt((cx ** 2) + (cy ** 2));
}

/**
 * @param {number} ax 
 * @param {number} ay 
 * @param {number} bx 
 * @param {number} by 
 * @returns 
 */
function maxRadio(ax, ay, bx, by, offset = 0) {
  return Math.max(
    distance(ax, ay, -offset, -offset),
    distance(ax, ay, -offset, by + offset),
    distance(ax, ay, bx + offset, -offset),
    distance(ax, ay, bx + offset, by + offset)
  )
}

/**
 * @param {HTMLInputElement} element 
 * @param {string} name 
 */
function saveLocalStorage(element, name) {
  localStorage.setItem(name, element.value);
}

/**
 * @param {HTMLInputElement} element 
 * @param {string} name 
 */
function restoreLocalStorage(element, name) {
  element.value = localStorage.getItem(name) || element.value;
}

// --- Clase ChartLine ---
class ChartLine {
  static colors = [
    'orange', 'purple', 'red', 'blue', 'green',
    'brown', 'teal', 'pink', 'gray', 'cyan'
  ];

  /** Devuelve un color distinto por índice */
  static randomColor(i) {
    return ChartLine.colors[i % ChartLine.colors.length];
  }

  /**
   * @param {Simulator} simulator 
   * @param {HTMLCanvasElement} element 
   */
  constructor(simulator, element) {
    this.simulator = simulator;

    /** @type {import('chart.js').Chart} */
    this.chart = new Chart(element, {
      type: 'line',
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Tiempo (s)' }
          },
          y: {
            title: { display: true, text: 'Amplitud' }
          }
        },
        plugins: {
          legend: { position: 'bottom' }
        },
        elements: {
          line: { borderWidth: 1 },
          point: { radius: 1 }
        }
      },
      data: {
        labels: [],
        datasets: []
      }
    });
  }

  update() {
    // Crear o actualizar un dataset por cada onda activa
    [...this.simulator.waves].forEach((wave, idx) => {
      // Si aún no existe el dataset, lo agregamos
      if (!this.chart.data.datasets[idx]) {
        this.chart.data.datasets[idx] = {
          label: `Wave ${idx + 1}`,
          data: [],
          borderColor: ChartLine.randomColor(idx),
          borderWidth: 1,
          fill: false
        };
      }

      // Actualizar con los datos reales del ruido
      this.chart.data.datasets[idx].data = wave.signal.map(s => ({
        x: s.t,
        y: s.amp
      }));
    });

    // Si hay más datasets que ondas (ondas ya terminadas), los quitamos
    this.chart.data.datasets = this.chart.data.datasets
      .slice(0, this.simulator.waves.length);

    this.chart.update();
  }

  clear() {
    this.chart.data.datasets = [];
    this.chart.update();
  }
}

// --- Colores por estado [interior, borde] ---
const NODE_STATES = {
  'sintiendo': ["rgba(54, 54, 54, 0.6)", "rgba(54, 54, 54, 0.8)"],
  'escuchando': ["rgba(54, 54, 54, 0.6)", "rgba(255, 200, 0, 0.8)"],
  'alerta': ["rgba(255, 0, 0, 0.6)", "rgba(255, 80, 0, 0.8)"],
  'detectado': ["rgba(255, 0, 0, 0.6)", "rgba(255, 0, 0, 0.86)"]
};

// --- Colores para flechas ---
const NODE_ARROW = {
  'preguntando': "cyan",
  'respondiendo': "green",
  'ordenar': "blue"
};

// --- Clase Nodo ---
class NodeModule {
  /** 
   * @param {Simulator} simulator 
   * @param {number} q 
   * @param {number} r 
   */
  constructor(simulator, q, r) {
    this.simulator = simulator;
    this.radius = 5;
    this.q = q;
    this.r = r;

    /** @type {Map<string, NodeModule>} */
    this.neighbors = new Map;

    this.reset();

    const centerX = this.simulator.width / 2;
    const centerY = this.simulator.height / 2;

    this.x = centerX + this.simulator.spacingPx * Math.sqrt(3) * (q + r / 2);
    this.y = centerY + this.simulator.spacingPx * (3 / 2) * r;
  }

  reset() {
    /** @type {keyof NODE_STATES} */
    this.state = "sintiendo";

    this.acceleration = null;
    this.order = 0;
    this.firstNode = null;
    this.confirmation = [{ counter: 0, max: 6 }, { counter: 0, max: 12 }];
  }

  /** @param {Wave} wave  */
  checkWaveCollision(wave) {
    const dist = distance(this.x, this.y, wave.x, wave.y);
    const { radius, offset, duration } = wave;

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
        this.acceleration = wave.acceleration;

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

    let order = node.order - 2; // indice (0, 1)
    let { counter, max } = this.confirmation[order];

  }

  draw() {
    let ctx = this.simulator.ctx;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Simulator.angleComplete);
    ctx.fillStyle = NODE_STATES[this.state][0];
    ctx.fill();
    ctx.strokeStyle = NODE_STATES[this.state][1];
    ctx.lineWidth = 2;
    ctx.stroke();

    // Magnitud encima
    if (this.acceleration !== null) {
      ctx.fillStyle = "black";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText((this.acceleration * 1000).toFixed(1), this.x, this.y - 12);
    }
  }
}

// --- Clase Onda ---
class Wave {
  static maxRichter = 10;

  /**
   * @param {Simulator} simulator 
   * @param {number} x 
   * @param {number} y 
   */
  constructor(simulator, x, y) {
    this.simulator = simulator;
    this.x = x;
    this.y = y;

    this.magnitude = parseFloat(simulator.element_magnitude.value);
    saveLocalStorage(simulator.element_magnitude, 'element_magnitude');
    this.duration = parseFloat(simulator.element_duration.value);
    saveLocalStorage(simulator.element_duration, 'element_duration');

    this.offset = this.duration / 2;

    this.maxRadius = maxRadio(x, y, simulator.width, simulator.height, this.offset);
    this.radius = 0;

    // Transparencia: 0.8 al inicio → 0.2 al final
    this.alpha = 0.8;

    // Aceleración inicial (relativa a magnitud, con variación random)
    this.accelInit = this.magnitude * 0.0017; // aceleración inicial

    this.acceleration = this.accelInit;
    this.velocity = this.accelInit;  // velocidad inicial aproximada
    this.displacement = 0;

    // Amplitud máxima (escala logarítmica simplificada)
    this.amplitudeMax = Math.pow(10, this.magnitude / 2);

    // Registro del ruido sísmico (sismograma)
    this.signal = [];
    this.elapsed = 0;

    // calcular distancia total (aproximada con MRUV)
    this.totalRadius = ((this.accelInit / k) * this.duration
      - (this.accelInit / (k * k)) * (1 - Math.exp(-k * this.duration)))
      * this.simulator.kmToPx;
  }

  getPGD() {
    return Math.max(...this.signal.map(s => Math.abs(s.amp)), 0);
  }
  getPGV() {
    return this.velocity;
  }
  getPGA() {
    return this.acceleration;
  }
  getDuration() {
    return this.duration;
  }

  update(dt) {
    this.elapsed += dt;

    // --- Aceleración decreciente ---
    const k = 0.5 / this.magnitude;
    this.acceleration = this.accelInit * Math.exp(-k * this.elapsed);

    // --- Velocidad (integrando aceleración) ---
    this.velocity += this.acceleration * dt;

    // --- Radio (integrando velocidad) ---
    this.radius += this.velocity * dt * this.simulator.kmToPx;

    // --- Transparencia ---
    let progress = Math.min(this.radius / this.totalRadius, 1);
    this.alpha = 0.8 - (0.6 * progress);

    // --- Señal (solo mientras la onda está en fase sólida) ---
    if (this.radius < this.duration) {
      let sample = (Math.random() - 0.5) * this.amplitudeMax;
      this.signal.push({ t: this.elapsed, amp: sample });
      this.simulator.chart_waves.update();
    }
  }

  draw() {
    let ctx = this.simulator.ctx;
    ctx.beginPath();

    let color = `rgba(94, 22, 22, ${this.alpha.toFixed(3)})`;

    if (this.radius < this.duration) {
      // --- Fase sólida (disco) ---
      ctx.arc(this.x, this.y, this.radius, 0, Simulator.angleComplete);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

    } else {
      // --- Fase hueca (anillo) ---
      let centerRadius = this.radius - (this.duration / 2);
      ctx.arc(this.x, this.y, centerRadius, 0, Simulator.angleComplete);
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.lineWidth = this.duration;
      ctx.stroke();


      // --- centro ---
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1, 0, Simulator.angleComplete);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;

    }

    ctx.stroke();
  }
}

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
    saveLocalStorage(this.element_mapScale, 'element_mapScale');
    this.nodeSpacing = parseFloat(this.element_nodeSpacing.value); // km
    saveLocalStorage(this.element_nodeSpacing, 'element_nodeSpacing');
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

    // iteramos en axial q,r

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
    this.waves.add(new Wave(this, x, y));
  }

  update(dt) {
    this.waves.forEach((wave) => {
      wave.update(dt);

      if (wave.radius > wave.maxRadius)
        this.waves.delete(wave);
    });
    this.nodes.forEach(node => node.update());
  }

  draw() {
    this.ctx.drawImage(this.element_img, 0, 0, this.width, this.height);
    this.waves.forEach(wave => wave.draw());
    this.nodes.forEach(node => node.draw());
  }

  loop = (timestamp) => {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
  const element_img = new Image();
  element_img.src = '/src/map.png';

  const element_mapCanvas = document.getElementById("mapCanvas");
  const element_mapScale = document.getElementById("mapScale");
  const element_nodeSpacing = document.getElementById("nodeSpacing");
  const element_magnitude = document.getElementById("magnitude");
  const element_duration = document.getElementById("duration");
  const element_chartWave = document.getElementById("chartWave");

  const element_applyBtn = document.getElementById("applyBtn");
  const element_clearCharts = document.getElementById("clearCharts");

  const simulator = new Simulator(
    element_img,
    element_mapCanvas,
    element_mapScale,
    element_nodeSpacing,
    element_magnitude,
    element_duration,
    element_chartWave,
  );

  restoreLocalStorage(element_mapScale, 'element_mapScale');
  restoreLocalStorage(element_nodeSpacing, 'element_nodeSpacing');
  restoreLocalStorage(element_magnitude, 'element_magnitude');
  restoreLocalStorage(element_duration, 'element_duration');

  element_img.onload = () => {
    simulator.applySettings();
    simulator.loop();
  };

  element_applyBtn.addEventListener("click", () => {
    simulator.applySettings();
  });
  element_clearCharts.addEventListener('click', () => {
    simulator.chart_waves.clear();
  })
})