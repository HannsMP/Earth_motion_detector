class Population {
    static SHOW_NAME = false;

    /** @type {Map<string, Population>} */
    static COLLECTION = new Map;

    /** @type {number} */
    static DEFAULT_SIZE = 14;





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
        this.state = 'tranquilo';

        Population.COLLECTION.set(this.name, this);
    }





    reset() {
        this.state = 'tranquilo';
        this.events.emitAsync('update');
    }





    /**
     * Cambia el estado y emite evento de actualización
     * @param {string} state
     */
    setState(state) {
        if (!POP_STATES[state]) return;
        this.state = state;
        this.events.emitAsync('update');
    }





    /**
     * Comprueba si una onda colisiona con esta población
     * @param {Wave} wave
     * @returns {boolean}
     */
    collisionWithWave(wave) {
        const d = distance(this.x, this.y, wave.x, wave.y);
        return d <= (wave.radius + (this.size / 2));
    }





    draw() {
        let ctx = this.simulator.ctx;
        let half = this.size / 2;

        // cuerpo (cuadrado)
        ctx.beginPath();
        ctx.fillStyle = POP_STATES[this.state][0];
        ctx.fillRect(this.x - half, this.y - half, this.size, this.size);

        // borde
        ctx.lineWidth = 2;
        ctx.strokeStyle = POP_STATES[this.state][1];
        ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);

        // etiqueta pequeña según SHOW_NAME
        if (Population.SHOW_NAME) {
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "black";
            ctx.fillText(this.name, this.x, this.y - half - 4);
        }
    }





    remove() {
        Population.COLLECTION.delete(this.name);
    }
}


// Estados de la población: [relleno, borde]
const POP_STATES = {
    'tranquilo': ["rgba(124, 124, 124, 0.7)", "rgba(119, 119, 119, 0.9)"],
    'alerta': ["rgba(255,69,0,0.8)", "rgba(200,30,0,1)"],
    'normal': ["rgba(0,128,0,0.6)", "rgba(0,100,0,0.9)"],
    'afectado': ["rgba(139,0,0,0.8)", "rgba(120,0,0,1)"]
};