class Triangulation {
  constructor(waveSpeed = 5) { // km/s o cualquier unidad consistente
    this.nodes = [];
    this.waveSpeed = waveSpeed;
    this.locked = false;
    this.estimatedEpicenter = null;
  }

  /**
   * Agrega un nodo a la triangulación
   * @param {DetectorNodes} node - Nodo que detectó el evento
   * @param {number} timestamp - Tiempo en segundos del evento detectado
   */
  addNode(node, timestamp) {
    if (this.locked) return false; // No se permite más de 3 nodos
    this.nodes.push({ node, timestamp });

    if (this.nodes.length === 3) {
      this.locked = true;
      this.calculateEpicenter();
    }
    return true;
  }

  /**
   * Calcula el epicentro aproximado dentro del triángulo formado
   * usando trilateración inversa basada en los tiempos de detección.
   */
  calculateEpicenter() {
    const [A, B, C] = this.nodes;

    const x1 = A.node.x, y1 = A.node.y, t1 = A.timestamp;
    const x2 = B.node.x, y2 = B.node.y, t2 = B.timestamp;
    const x3 = C.node.x, y3 = C.node.y, t3 = C.timestamp;

    // Convertimos tiempos en distancias relativas (d = v * Δt)
    const r1 = 0; // referencia (el primero en detectar)
    const r2 = this.waveSpeed * (t2 - t1);
    const r3 = this.waveSpeed * (t3 - t1);

    // Sistema de ecuaciones lineales para resolver el punto (x, y)
    // Basado en la trilateración 2D simplificada
    const A1 = 2 * (x2 - x1);
    const B1 = 2 * (y2 - y1);
    const C1 = r1 * r1 - r2 * r2 - x1 * x1 + x2 * x2 - y1 * y1 + y2 * y2;

    const A2 = 2 * (x3 - x1);
    const B2 = 2 * (y3 - y1);
    const C2 = r1 * r1 - r3 * r3 - x1 * x1 + x3 * x3 - y1 * y1 + y3 * y3;

    const det = (A1 * B2 - A2 * B1);

    if (Math.abs(det) < 1e-6) {
      console.warn("Triangulación degenerada o nodos colineales.");
      this.estimatedEpicenter = null;
      return;
    }

    const x = (C1 * B2 - C2 * B1) / det;
    const y = (A1 * C2 - A2 * C1) / det;

    this.estimatedEpicenter = { x, y };
  }

  /**
   * Dibuja el triángulo y el epicentro estimado (opcional, en canvas)
   */
  draw(ctx) {
    if (this.nodes.length < 2) return;

    ctx.strokeStyle = "rgba(255,255,0,0.6)";
    ctx.beginPath();
    const { x, y } = this.nodes[0].node;
    ctx.moveTo(x, y);
    for (let i = 1; i < this.nodes.length; i++) {
      ctx.lineTo(this.nodes[i].node.x, this.nodes[i].node.y);
    }
    ctx.closePath();
    ctx.stroke();

    // Marca del epicentro estimado
    if (this.estimatedEpicenter) {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(this.estimatedEpicenter.x, this.estimatedEpicenter.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}