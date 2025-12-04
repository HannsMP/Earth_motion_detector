class Triangulation {
  /** @type {[]Triangulation} */
  static COLLECTION = [];





  /**
   * @param {Simulator} simulator 
   * @param {Wave} wave 
   */
  constructor(simulator, wave) {
    this.simulator = simulator;
    this.wave = wave;

    this.locked = false;
    this.estimatedEpicenter = null;
    this.estimatedRadio = wave.maxRadiusPx;
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
      this.calculatePopulation();
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





  calculatePopulation() {
    this.wave.populationMap.forEach((_, population) => population.setState('alerta'));
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
      ctx.lineWidth = 5;
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
