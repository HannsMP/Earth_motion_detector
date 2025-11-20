class Population {
  static SHOW_NAME = false;

  /** @type {Map<string, Population>} */
  static COLLECTION = new Map;

  /** @type {number} */
  static DEFAULT_SIZE = 14;

  static COUNTER_MAX = 75;

  static EVACUATION_TIME = 10 * 1000;



  /**
   * @param {Simulator} simulator
   * @param {string} name
   * @param {number} x
   * @param {number} y
   * @param {number} [size]
   */
  constructor(simulator, name, x, y, size = Population.DEFAULT_SIZE) {
    this.simulator = simulator;
    this.name = name ?? `${x},${y}`;
    this.x = x;
    this.y = y;
    this.size = size;
    this.events = new EventListener();

    // estado por defecto
    /** @type {keyof POP_STATES} */
    this.state = 'tranquilo';
    this.counter = 0;

    Population.COLLECTION.set(this.name, this);
  }





  reset() {
    this.state = 'tranquilo';
    this.events.emitAsync('update');
    this.counter = 0;
  }





  /**
   * Cambia el estado y emite evento de actualización
   * @param {keyof POP_STATES} state
   */
  setState(state) {
    if (!POP_STATES[state] || this.state == state) return;

    console.log(state);
    this.state = state;
    this.events.emitAsync('update');

    if (state == 'alerta') {
      this.counter = 0;
      this.startTime = Date.now();
    }
  }





  checkWaveCollision() {
    for (const wave of Wave.COLLECTION) {
      if (wave.population_in_collision(this))
        return wave;
    }

    return false;
  }





  update(dt) {
    let wave = this.checkWaveCollision();

    if (wave) {
      if (this.state == 'afectado' || this.state == 'normal') return;

      let interval = Date.now() - this.startTime;
      if (interval < Population.EVACUATION_TIME)
        return this.setState('afectado');

      return this.setState('normal');
    }
  }





  draw() {
    let ctx = this.simulator.ctx;
    let half = this.size / 2;

    let [fill, stroke] = this.state == 'alerta'
      ? Population.COUNTER_MAX < this.counter
        ? POP_STATES.alerta[1]
        : POP_STATES.alerta[0]
      : POP_STATES[this.state];


    // cuerpo (cuadrado)
    ctx.beginPath();
    ctx.fillStyle = fill;
    ctx.fillRect(this.x - half, this.y - half, this.size, this.size);

    // borde
    ctx.lineWidth = 2;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);

    // etiqueta pequeña según SHOW_NAME
    if (Population.SHOW_NAME) {
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "black";
      ctx.fillText(this.name, this.x, this.y - half - 4);
    }

    this.counter = Population.COUNTER_MAX * 2 < this.counter ? 0 : this.counter + 1;
  }





  remove() {
    Population.COLLECTION.delete(this.name);
  }
}


// Estados de la población: [relleno, borde]
const POP_STATES = {
  'tranquilo': ["rgba(119, 119, 119, 0.7)", "rgba(59, 59, 59, 0.9)"],

  'alerta': [["rgba(255,215,0,0.7)", "rgba(255,180,0,0.9)"], ["rgba(255,69,0,0.7)", "rgba(200,30,0,0.9)"]],

  'normal': ["rgba(0,128,0,0.7)", "rgba(0,100,0,0.9)"],
  'afectado': ["rgba(139,0,0,0.7)", "rgba(120,0,0,0.9)"]
};