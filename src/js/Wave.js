
// --- Clase Onda ---
class Wave {
  // ecuaciones empíricas (km, s)
  static distanceMax(richter) {
    return 1.8693 * Math.exp(0.7076 * richter); // km
  }
  static durationMax(richter) {
    return 2.7344 * Math.exp(0.4805 * richter); // s
  }

  // easing suave: acelera al inicio y desacelera al final
  static easeInOutCubic(t) {
    // t en [0,1]
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  get outerRadius() {
    return this.radius;
  }
  get innerRadius() {
    return Math.max(0, this.radius - this.thicknessPx);
  }

  get PGD() {
    if (!this.signal.length) return 0;
    return Math.max(...this.signal.map(s => Math.abs(s.amp)));
  }
  get PGV() {
    // velocidad en km/s (convertir px/s -> km/s)
    return this._velocityPxPerS / this.simulator.kmToPx;
  }
  get PGA() {
    // aceleración en km/s^2
    return this._accelPxPerS2 / this.simulator.kmToPx;
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

    // Magnitud (input usuario) y pulseDuration (input usuario)
    this.magnitude = parseFloat(simulator.element_magnitude.value);

    this.pulseDuration = parseFloat(simulator.element_duration.value);

    // --- Distancia total y travel duration por ecuaciones empíricas ---
    this.totalDistanceKm = Wave.distanceMax(this.magnitude); // km
    this.travelDuration = Wave.durationMax(this.magnitude);  // s

    // conversión km -> px (simulator.kmToPx = px / km)
    this.totalRadiusPx = this.totalDistanceKm * this.simulator.kmToPx;

    // max visible radius en canvas (solo condicional visual)
    this.maxRadiusPx = maxRadio(x, y, simulator.width, simulator.height, this.pulseDuration / 2);
    this.lifeRadiusPx = Math.min(this.maxRadiusPx, this.totalRadiusPx);

    // elapsed time
    this.elapsed = 0;

    // radio actual
    this.radius = 0;

    // thickness (grosor espacial) -> aproximamos como fracción de la distancia total:
    // la porción del total que corresponde a pulseDuration sobre travelDuration
    // thicknessPx = totalRadiusPx * (pulseDuration / travelDuration)
    const safeT = Math.max(this.travelDuration, 1e-6);
    this.thicknessPx = Math.max(1, this.totalRadiusPx * (this.pulseDuration / safeT));
    this.offset = this.thicknessPx / 2;

    // visual
    this.alpha = 0.8;

    // ruido / sismograma
    this.amplitudeMax = Math.pow(10, this.magnitude / 2); // escala (puedes ajustar)
    this.signal = [];

    // para calcular derivadas numéricas
    this._prevRadius = 0;
    this._velocityPxPerS = 0;     // v (px/s)
    this._prevVelocity = 0;
    this._accelPxPerS2 = 0;       // a (px/s^2)

    // stats
    this.peakVelocityPx = 0;
    this.peakAccelPx = 0;
  }

  update(dt) {
    // dt en segundos
    this.elapsed += dt;

    // progreso normalizado [0,1] respecto al travelDuration empírico
    const T = Math.max(this.travelDuration, 1e-6);
    const tNorm = Math.min(this.elapsed / T, 1);

    // eased progress [0..1]
    const eased = Wave.easeInOutCubic(tNorm);

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
    if (this.outerRadius < this.thicknessPx) {
      const sample = (Math.random() - 0.5) * this.amplitudeMax;
      this.signal.push({ t: this.elapsed, amp: sample });
    }
  }

  draw() {
    const ctx = this.simulator.ctx;
    const color = `rgba(94,22,22,${this.alpha.toFixed(3)})`;

    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.arc(this.x, this.y, this.totalRadiusPx, 0, Simulator.angleComplete);
    ctx.strokeStyle = `rgba(94,22,22,.6)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.outerRadius <= 0) return;

    if (this.outerRadius < this.thicknessPx) {
      // fase sólida: disco relleno
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.outerRadius, 0, Simulator.angleComplete);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // fase anillo hueco (inner..outer)
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius - this.offset, 0, Simulator.angleComplete);
      ctx.closePath();

      ctx.strokeStyle = color;
      ctx.lineWidth = this.thicknessPx;
      ctx.stroke();

      // punto central
      ctx.beginPath();
      ctx.arc(this.x, this.y, 1, 0, Simulator.angleComplete);
      ctx.fillStyle = color;
      ctx.fill();
    }
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