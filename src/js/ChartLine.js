// --- Clase ChartLine ---

class ChartLine {
  static COLORS = [
    'orange', 'purple', 'red', 'blue', 'green',
    'brown', 'teal', 'pink', 'gray', 'cyan'
  ];

  static randomColor(i) {
    return ChartLine.COLORS[i % ChartLine.COLORS.length];
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
    [...this.simulator.waves].forEach((wave, idx) => {
      if (!this.chart.data.datasets[idx]) {
        this.chart.data.datasets[idx] = {
          label: `Wave ${idx + 1}`,
          data: [],
          borderColor: ChartLine.randomColor(idx),
          borderWidth: 1,
          fill: false
        };
      }

      this.chart.data.datasets[idx].data = wave.signal.map(s => ({
        x: s.t,
        y: s.amp
      }));
    });

    this.chart.data.datasets = this.chart.data.datasets
      .slice(0, this.simulator.waves.length);

    this.chart.update();
  }

  clear() {
    this.chart.data.datasets = [];
    this.chart.update();
  }
}