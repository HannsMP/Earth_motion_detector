class Triangulation {
  /** @type {[]Triangulation} */
  static COLLECTION = [];





  /**
   * @param {Simulator} simulator 
   */
  constructor(simulator) {
    this.simulator = simulator;
    this.locked = false;
    this.estimatedEpicenter = null;
    this.estimatedRadio = null;
    /** @type {{node: DetectorNodes, t: number}[]} */
    this.nodes = [];

    Triangulation.COLLECTION.push(this);
  }





  /**
   * @param {DetectorNodes} node - Nodo que detectó el evento
   */
  addNode(node) {
    if (this.locked) return false; // No se permite más de 3 nodos
    this.nodes.push({ node, t: Date.now() });

    if (this.nodes.length === 3) {
      this.locked = true;
      this.calculateEpicenter();
      this.calculateRadio();
    }

    return true;
  }





  calculateEpicenter() {
    if (this.nodes.length < 3) return;

    // Extrae puntos y tiempos
    const pts = this.nodes.map(n => ({ x: n.node.x, y: n.node.y, t: n.t }));
    const minT = Math.min(...pts.map(p => p.t));
    // tiempos relativos en segundos (earliest -> 0)
    const relSec = pts.map(p => (p.t - minT) / 1000);

    // Centroide simple de las 3 coordenadas
    const centroid = pts.reduce((acc, p) => {
      acc.x += p.x; acc.y += p.y; return acc;
    }, { x: 0, y: 0 });

    centroid.x /= pts.length;
    centroid.y /= pts.length;

    // Pesos que favorecen a los detectores más tempranos.
    // s = 1 / (1 + relSec) -> earliest (relSec=0) => s=1, luego va decreciendo.
    const weights = relSec.map(r => 1 / (1 + r));
    const wSum = weights.reduce((s, w) => s + w, 0) || 1;

    const weighted = pts.reduce((acc, p, i) => {
      acc.x += p.x * weights[i];
      acc.y += p.y * weights[i];
      return acc;
    }, { x: 0, y: 0 });

    weighted.x /= wSum;
    weighted.y /= wSum;

    // Beta controla cuánto "jalar" desde el centroide hacia el punto ponderado.
    // Se escala según la máxima diferencia de tiempos: si hay mucha diferencia -> beta ≈ 1.
    const maxSec = Math.max(...relSec);
    const beta = Math.min(1, maxSec / (maxSec + 0.5)); // 0.5s es constante ajustable

    // Resultado final: interpolación entre centroide y punto ponderado
    const fx = centroid.x * (1 - beta) + weighted.x * beta;
    const fy = centroid.y * (1 - beta) + weighted.y * beta;

    this.estimatedEpicenter = { x: fx, y: fy };
  }





  calculateRadio() {
    if (this.nodes.length === 0 || !this.estimatedEpicenter) return;

    // Preparar tiempos de referencia
    const pts = this.nodes.map(n => ({ node: n.node, t: n.t }));
    const minT = Math.min(...pts.map(p => p.t));
    const maxT = Math.max(...pts.map(p => p.t));
    // Usamos maxT como instante "ahora" (última detección)
    const refT = maxT;

    // Calcula distancia desde epicentro y una estimación de radio por nodo
    let weightedSum = 0;
    let weightSum = 0;

    for (const p of pts) {
      const n = p.node;
      const dt = (refT - p.t) / 1000; // segundos transcurridos desde la detección hasta refT
      const dx = n.x - this.estimatedEpicenter.x;
      const dy = n.y - this.estimatedEpicenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Detectar propiedades posibles en el nodo (robusto ante distintos nombres)
      const speed = n.speed ?? n.v ?? n.velocity ?? null; // unidad esperada: px/s (o m/s según escala)
      const accel = n.accel ?? n.a ?? n.acceleration ?? null; // unidad esperada: px/s^2
      const v0 = n.v0 ?? n.initialVelocity ?? 0; // si existe velocidad inicial

      // Estimar radio local al tiempo refT
      let rLocal = dist;
      if (speed != null && !Number.isNaN(speed)) {
        // Si nodo reporta velocidad instantánea, asumimos que la onda sigue expandiéndose a esa velocidad
        rLocal = dist + speed * dt;
      } else if (accel != null && !Number.isNaN(accel)) {
        // Si solo hay aceleración, integrar con v0 si está, o suponer v0=0
        rLocal = dist + v0 * dt + 0.5 * accel * dt * dt;
      } else {
        // Sin información dinámica, usamos la distancia pura
        rLocal = dist;
      }

      // Peso: favorece nodos con información de velocidad/accel y detecciones tempranas
      const timeWeight = 1 / (1 + ((p.t - minT) / 1000)); // earliest -> 1
      const infoWeight = (speed != null ? 2 : (accel != null ? 1.5 : 1));
      const w = timeWeight * infoWeight;

      weightedSum += rLocal * w;
      weightSum += w;
    }

    const estimated = weightSum > 0 ? (weightedSum / weightSum) : 0;

    this.estimatedRadio = 2 * Math.max(0, estimated) * this.simulator.kmToPx;
  }





  draw() {
    const ctx = this.simulator.ctx;
    if (!this.estimatedEpicenter) return;

    const { x, y } = this.estimatedEpicenter;
    const r = Math.max(0, this.estimatedRadio ?? 0);

    // Dibujar circunferencia del radio estimado (si hay radio)
    if (r > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Dibujar epicentro como triángulo centrado en (x,y)
    const size = 12; // longitud de lado del triángulo
    const h = size * Math.sqrt(3) / 2; // altura del triángulo equilátero
    ctx.save();
    ctx.fillStyle = "rgba(4, 0, 255, 0.97)";
    ctx.strokeStyle = "rgba(255, 255, 0, 1)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // triángulo equilátero apuntando hacia arriba, centrado en (x,y)
    ctx.moveTo(x, y - (2 / 3) * h);           // vértice superior
    ctx.lineTo(x - size / 2, y + (1 / 3) * h); // vértice inferior izquierdo
    ctx.lineTo(x + size / 2, y + (1 / 3) * h); // vértice inferior derecho
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
