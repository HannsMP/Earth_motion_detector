/**
 * @param {HTMLInputElement} element 
 * @param {string} name 
 */
function createLocalStorage(element, name) {
  element.value = localStorage.getItem(name) || element.value;
  element.addEventListener('input', () => localStorage.setItem(name, element.value));
}

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {

  document.querySelector('.container').classList
    .toggle('fullscreen', localStorage.getItem('fullscreen') == 'true');

  const element_mapCanvas = document.getElementById("mapCanvas");
  const element_mapScale = document.getElementById("mapScale");
  const element_nodeSpacing = document.getElementById("nodeSpacing");
  const element_magnitude = document.getElementById("magnitude");
  const element_duration = document.getElementById("duration");
  const element_chartWave = document.getElementById("chartWave");

  const elements_scale = document.querySelectorAll("input[name=scaleDef]");

  const element_img = new Image();

  const element_applyBtn = document.getElementById("applyBtn");
  const element_clearBtn = document.getElementById("clearCharts");

  const element_infoWave = document.getElementById("infoWave");

  createLocalStorage(element_mapScale, 'element_mapScale');
  createLocalStorage(element_nodeSpacing, 'element_nodeSpacing');
  createLocalStorage(element_magnitude, 'element_magnitude');
  createLocalStorage(element_duration, 'element_duration');

  let valeu_elements_scale = localStorage.getItem('elements_scale') || '300';
  element_img.src = `/src/maps/${valeu_elements_scale}km.png`;

  const simulator = new Simulator(
    element_img,
    element_mapCanvas,
    element_mapScale,
    element_nodeSpacing,
    element_magnitude,
    element_duration,
    element_chartWave,
  );

  element_img.onload = () => {
    simulator.applySettings();
    simulator.loop();
  };

  elements_scale.forEach(el => {
    if (el.value == valeu_elements_scale) {
      el.checked = true
      simulator.applySettings();
      element_mapScale.value = el.value;
    };

    el.addEventListener('click', () => {
      let { value } = el;
      localStorage.setItem('elements_scale', value);
      element_img.src = `/src/maps/${value}km.png`;
      element_mapScale.value = value;
      simulator.applySettings();
    });
  })

  element_applyBtn.addEventListener("click", () => {
    simulator.applySettings();
    simulator.chart_waves.clear();
  });
  element_clearBtn.addEventListener('click', () => {
    simulator.chart_waves.clear();
  });

  let magnitudeChange = () => {
    let magnitude = parseFloat(element_magnitude.value);
    let distanceMax = Wave.DISTANCE_MAX(magnitude).toFixed(2);
    let durationMax = Wave.DURATION_MAX(magnitude).toFixed(2);

    element_infoWave.innerText
      = `Distancia maxima: ${distanceMax} km`
      + `\nDuracion: ${durationMax} s`;

    let mapScale = parseFloat(element_mapScale.value);
    let whereAlert = distanceMax > mapScale / 2;
    let whereWarn = whereAlert && distanceMax > mapScale;

    element_mapCanvas.className = '';
    element_infoWave.className = '';

    if (whereWarn) {
      element_mapCanvas.classList.toggle('warn', whereWarn);
      element_infoWave.classList.toggle('warn-text', whereWarn);
    } else {
      element_mapCanvas.classList.toggle('alert', whereAlert);
      element_infoWave.classList.toggle('alert-text', whereAlert);
    }
  }

  element_magnitude.addEventListener('input', magnitudeChange);

  magnitudeChange();

})