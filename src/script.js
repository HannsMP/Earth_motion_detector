let CACHE_FULL_SCREEN = 'CACHE_FULL_SCREEN';
let CACHE_SCALE = 'CACHE_SCALE';
let CACHE_NODE_SPACE = 'CACHE_NODE_SPACE';
let CACHE_MAGNTUDE = 'CACHE_MAGNTUDE';
let CACHE_DURATION = 'CACHE_DURATION';

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {

  const element_img = new Image();
  const element_container = document.querySelector('.container');
  const element_fullScreenBtn = document.getElementById("fullScreenBtn");
  const element_mapCanvas = document.getElementById("mapCanvas");
  const element_chartWave = document.getElementById("chartWave");
  const element_nodeSpacing = document.getElementById("nodeSpacing");
  const element_magnitude = document.getElementById("magnitude");
  const element_duration = document.getElementById("duration");
  const elements_scale = document.querySelectorAll("input[name=scaleDef]");
  const element_applyBtn = document.getElementById("applyBtn");
  const element_clearBtn = document.getElementById("clearCharts");
  const element_predictWave = document.getElementById("predictWave");
  const element_selectorModule = document.getElementById("selectorModule");










  const simulator = new Simulator(
    element_img,
    element_mapCanvas,
    element_chartWave,
  );
  window.simulator = simulator;










  /* SET DEFAULT */
  const FULL_SCREEN = localStorage.getItem(CACHE_FULL_SCREEN) == 'true';
  element_container.classList.toggle('fullscreen', FULL_SCREEN);

  const MAP_SCALE = parseFloat(localStorage.getItem(CACHE_SCALE) || Simulator.MAP_SCALE);
  Simulator.MAP_SCALE = MAP_SCALE;
  element_img.src = `/src/maps/${MAP_SCALE}km.png`;
  elements_scale.forEach(el => {
    if (el.value != MAP_SCALE) return
    el.checked = true
    simulator.mapScale = parseFloat(el.value);
    simulator.applySettings();
  });

  const NODE_SPACING = parseFloat(localStorage.getItem(CACHE_NODE_SPACE) || Simulator.NODE_SPACING);
  Simulator.NODE_SPACING = NODE_SPACING;
  element_nodeSpacing.value = NODE_SPACING;

  const MAGNITUDE = parseFloat(localStorage.getItem(CACHE_MAGNTUDE) || Wave.MAGNITUDE);
  Wave.MAGNITUDE = MAGNITUDE;
  element_magnitude.value = MAGNITUDE;

  const PULSE_DURATION = parseFloat(localStorage.getItem(CACHE_DURATION) || Wave.PULSE_DURATION);
  Wave.PULSE_DURATION = PULSE_DURATION;
  element_duration.value = PULSE_DURATION;










  element_img.onload = () => {
    simulator.applySettings();
  };
  simulator.run();










  element_fullScreenBtn.addEventListener('click', () => {
    let contains = element_container.classList.contains('fullscreen');
    element_container.classList.toggle('fullscreen', !contains);
    localStorage.setItem(CACHE_FULL_SCREEN, contains);
  });
  /* INPUTS */
  elements_scale.forEach(el => el.addEventListener('click', () => {
    let value = parseFloat(el.value);
    Simulator.MAP_SCALE = value;
    localStorage.setItem(CACHE_SCALE, value);
    element_img.src = `/src/maps/${value}km.png`;
    simulator.applySettings();
  }));
  element_nodeSpacing.addEventListener('input', () => {
    let value = parseFloat(element_nodeSpacing.value);
    Simulator.NODE_SPACING = value;
    localStorage.setItem(CACHE_NODE_SPACE, value);
    simulator.generateNodes();
  })
  element_magnitude.addEventListener('input', () => {
    let value = parseFloat(element_magnitude.value);
    Wave.MAGNITUDE = value;
    localStorage.setItem(CACHE_MAGNTUDE, value);
  })
  element_duration.addEventListener('input', () => {
    let value = parseFloat(element_duration.value);
    Wave.PULSE_DURATION = value;
    localStorage.setItem(CACHE_DURATION, value);
  })
  /* BOTONS */
  element_applyBtn.addEventListener("click", () => {
    simulator.applySettings();
    simulator.chart_waves.clear();
  });
  element_clearBtn.addEventListener('click', () => {
    simulator.chart_waves.clear();
  });










  let magnitudeChange = () => {
    let distanceMax = Wave.DISTANCE_MAX(Wave.MAGNITUDE).toFixed(2);
    let durationMax = Wave.DURATION_MAX(Wave.MAGNITUDE).toFixed(2);

    element_predictWave.innerText
      = `Distancia maxima: ${distanceMax} km`
      + `\nDuracion: ${durationMax} s`;

    let mapScale = simulator.mapScale;
    let whereAlert = distanceMax > mapScale / 2;
    let whereWarn = whereAlert && distanceMax > mapScale;

    element_mapCanvas.className = '';
    element_predictWave.className = '';

    if (whereWarn) {
      element_mapCanvas.classList.toggle('warn', whereWarn);
      element_predictWave.classList.toggle('warn-text', whereWarn);
    } else {
      element_mapCanvas.classList.toggle('alert', whereAlert);
      element_predictWave.classList.toggle('alert-text', whereAlert);
    }
  }
  element_magnitude.addEventListener('input', magnitudeChange);
  magnitudeChange();










  DetectorNodes.EVENTS.on('collision_before', (node) => {
    let span = document.createElement('span');
    span.innerText = `Nodo (${node.q}, ${node.r})`;

    let buttonSelect = document.createElement('button');
    buttonSelect.innerText = 'INF';

    let cont = document.createElement('div');
    cont.className = 'info-box';
    cont.append(buttonSelect, span);

    element_selectorModule.append(cont);

    buttonSelect.addEventListener('click', () => {
      DetectorNodes.CURRECT_SELECT = node;
    });

    node.info.span = span;
  });
})