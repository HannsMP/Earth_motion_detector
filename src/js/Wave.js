
// --- Clase Onda ---
class Wave {

  /** @type {Set<Wave>} */
  static COLLECTION = new Set;

  static MAGNITUDE = 5;

  static PULSE_DURATION = 5;

  // ecuacion empíric (km)
  static DISTANCE_MAX(richter) {
    return 1.8693 * Math.exp(0.7076 * richter); // km
  }

  // ecuacion empíric (s)
  static DURATION_MAX(richter) {
    return 2.7344 * Math.exp(0.4805 * richter); // s
  }

  // easing suave: acelera al inicio y desacelera al final
  static EASE_IN_OUT_CUBIC(t) {
    // t en [0,1]
    if (t < 0.5)
      return 4 * (t ** 3);

    return 1 - (Math.pow(-2 * t + 2, 3) / 2);
  }

  static NOISE_ENVELOPE(tNorm) {
    // curva con subida y bajada suave
    // tNorm: [0..1] del tiempo de vida del ruido
    const rise = 0.05;
    const fall = 0.8;

    // sube suavemente (ease-in)
    if (tNorm < rise) {
      const x = tNorm / rise;
      return x * x * (3 - 2 * x); // cubic in-out
    }

    // baja suavemente (ease-out)
    if (tNorm > fall) {
      const x = (1 - tNorm) / (1 - fall);
      return x * x * (3 - 2 * x);
    }

    // zona media estable
    return 1;
  }






  /**
   * @param {Simulator} simulator 
   * @param {number} x 
   * @param {number} y 
   */
  constructor(simulator, x, y) {
    this.simulator = simulator;
    this.x = x;
    this.y = y;
    this.triangulation = new Triangulation(simulator);

    // --- Distancia total y travel duration por ecuaciones empíricas ---
    this.totalDistanceKm = Wave.DISTANCE_MAX(Wave.MAGNITUDE); // km
    this.travelDuration = Wave.DURATION_MAX(Wave.MAGNITUDE);  // s

    // conversión km -> px (simulator.kmToPx = px / km)
    this.totalRadiusPx = this.totalDistanceKm * this.simulator.kmToPx;

    // max visible radius en canvas (solo condicional visual)
    this.maxRadiusPx = maxRadio(x, y, Simulator.WIDTH, Simulator.HEIGHT, Wave.PULSE_DURATION / 2);
    this.lifeRadiusPx = Math.min(this.maxRadiusPx, this.totalRadiusPx);

    // elapsed time
    this.elapsed = 0;

    // radio actual
    this.radius = 0;

    // thickness (grosor espacial) -> aproximamos como fracción de la distancia total:
    // la porción del total que corresponde a PULSE_DURATION sobre travelDuration
    // thicknessPx = totalRadiusPx * (PULSE_DURATION / travelDuration)
    const safeT = Math.max(this.travelDuration, 1e-6);
    this.thicknessPx = Math.max(1, this.totalRadiusPx * (Wave.PULSE_DURATION / safeT));
    this.offset = this.thicknessPx / 2;

    // visual
    this.alpha = 0.8;

    // ruido / sismograma
    this.amplitudeMax = Math.pow(10, Wave.MAGNITUDE / 2); // escala (puedes ajustar)
    /** @type {{ x: number, y: number }[]} */
    this.signal = [];

    // para calcular derivadas numéricas
    this._prevRadius = 0;
    this._velocityPxPerS = 0;     // v (px/s)
    this._prevVelocity = 0;
    this._accelPxPerS2 = 0;       // a (px/s^2)

    // stats
    this.peakVelocityPx = 0;
    this.peakAccelPx = 0;

    this.__scan();
  }





  // amplitud maxima 
  get PGD() {
    if (!this.signal.length) return 0;
    return Math.max(...this.signal.map(s => Math.abs(s.amp)));
  }

  // velocidad en km/s (convertir px/s -> km/s)
  get PGV() {
    return this._velocityPxPerS / this.simulator.kmToPx;
  }

  // aceleración en km/s^2
  get PGA() {
    return this._accelPxPerS2 / this.simulator.kmToPx;
  }

  get is_off_the_map() {
    return this.radius >= this.lifeRadiusPx
      || this.velocity <= 0
      && this.elapsed >= this.travelDuration;
  }





  __scan() {
    /** @type {Map<DetectorNodes, number>} */
    this.map = new Map;
    DetectorNodes.COLLECTION.forEach((node) => {
      const dist = distance(this.x, this.y, node.x, node.y);
      // dentro del sismo
      if (dist < this.totalRadiusPx)
        this.map.set(node, dist);
    })
  }





  collision(node) {
    let dist = this.map.get(node);
    if (!dist) return false;

    // sismo circulo
    if (this.radius < this.thicknessPx) {
      if (dist < this.radius)
        return true;
    }
    // sismo anillo
    else {
      if (this.radius - this.thicknessPx <= dist && dist <= this.radius)
        return true;
    }
  }





  update(dt) {
    // dt en segundos
    this.elapsed += dt;

    // progreso normalizado [0,1] respecto al travelDuration empírico
    const T = Math.max(this.travelDuration, 1e-6);
    const tNorm = Math.min(this.elapsed / T, 1);

    // eased progress [0..1]
    const eased = Wave.EASE_IN_OUT_CUBIC(tNorm);

    // nuevo radio en px (easing sobre la distancia total)
    const newRadius = eased * this.totalRadiusPx;

    // velocidad px/s (derivada numérica)
    if (dt > 0) {
      this._velocityPxPerS = (newRadius - this._prevRadius) / dt;
      this._accelPxPerS2 = (this._velocityPxPerS - this._prevVelocity) / dt;
    }

    // actualizamos prevs para siguiente frame
    this._prevRadius = newRadius;
    this._prevVelocity = this._velocityPxPerS;

    // asignamos radio
    this.radius = newRadius;

    if (Math.abs(this._velocityPxPerS) > this.peakVelocityPx)
      this.peakVelocityPx = Math.abs(this._velocityPxPerS);
    if (Math.abs(this._accelPxPerS2) > this.peakAccelPx)
      this.peakAccelPx = Math.abs(this._accelPxPerS2);

    const progressPhys = Math.min(this.radius / Math.max(1, this.totalRadiusPx), 1);
    this.alpha = 0.8 - (0.6 * progressPhys);

    // generar ruido
    if (this.radius < this.thicknessPx) {
      let tNoise = (this.radius / this.thicknessPx);

      let env = Wave.NOISE_ENVELOPE(Math.min(tNoise, 1));
      let sample = (Math.random() - 0.5) * this.amplitudeMax * env;
      this.signal.push({ x: this.elapsed, y: sample });
    }
  }





  draw() {
    const ctx = this.simulator.ctx;
    const color = `rgba(94,22,22,${this.alpha.toFixed(3)})`;

    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.arc(this.x, this.y, this.totalRadiusPx, 0, Simulator.ANGLE_COMPLETE);
    ctx.strokeStyle = `rgba(94,22,22,.6)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.radius <= 0) return;

    if (this.radius < this.thicknessPx) {
      // fase sólida
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Simulator.ANGLE_COMPLETE);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // fase anillo
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius - this.offset, 0, Simulator.ANGLE_COMPLETE);
      ctx.closePath();

      ctx.strokeStyle = color;
      ctx.lineWidth = this.thicknessPx;
      ctx.stroke();

      // punto central
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1, 0, Simulator.ANGLE_COMPLETE);
      ctx.fillStyle = color;
      ctx.fill();
    }

    this.triangulation.draw();
  }
}










/**
 * @param {number} ax 
 * @param {number} ay 
 * @param {number} bx 
 * @param {number} by 
 */
function maxRadio(ax, ay, bx, by, offset = 0) {
  return Math.max(
    distance(ax, ay, -offset, -offset),
    distance(ax, ay, -offset, by + offset),
    distance(ax, ay, bx + offset, -offset),
    distance(ax, ay, bx + offset, by + offset)
  )
}