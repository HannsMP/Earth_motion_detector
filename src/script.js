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
  const elements_nodeCord = document.getElementById("node-cord");
  const elements_infoNode_dirs = document.querySelectorAll(".cords-hex .node-selector");
  const elements_infoNode1 = document.getElementById("info-node-1");
  const elements_infoNode2 = document.getElementById("info-node-2");
  const elements_infoNode3 = document.getElementById("info-node-3");
  const elements_infoNode4 = document.getElementById("info-node-4");
  const elements_infoNode5 = document.getElementById("info-node-5");










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
  element_img.src = `./maps/${MAP_SCALE}km.png`;
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
    localStorage.setItem(CACHE_FULL_SCREEN, !contains);
  });
  /* INPUTS */
  elements_scale.forEach(el => el.addEventListener('click', () => {
    let value = parseFloat(el.value);
    Simulator.MAP_SCALE = value;
    localStorage.setItem(CACHE_SCALE, value);
    element_img.src = `./maps/${value}km.png`;
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
    let distanceMax = Wave.DISTANCE_MAX(Wave.MAGNITUDE);
    let durationMax = Wave.DURATION_MAX(Wave.MAGNITUDE);

    element_predictWave.innerText
      = `Distancia maxima: ${distanceMax.toFixed(2)} km`
      + `\nDuracion: ${durationMax.toFixed(2)} s`;

    let { MAP_SCALE } = Simulator;

    let whereAlert = distanceMax > MAP_SCALE / 2;
    let whereWarn = whereAlert && distanceMax > MAP_SCALE;

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
  elements_scale.forEach(el => el.addEventListener('click', () => magnitudeChange()));
  magnitudeChange();










  DetectorNodes.EVENTS.on('collision_before', (node) => {

    let data = document.createElement('span');
    data.innerText = `(${node.q}, ${node.r})`;

    let selector = document.createElement('button');
    selector.className = 'node-selector';
    selector.innerText = `NODO`;

    let content = document.createElement('div');
    content.className = 'info-box';
    content.append(selector, data);

    selector.addEventListener('click', () => {
      DetectorNodes.CURRECT_SELECT = node;
      DetectorNodes.EVENTS.emitAsync('selected_node', node);
    });

    if (!element_selectorModule.childNodes)
      return element_selectorModule.append(content);

    let br = document.createElement('div');
    br.className = 'br-dashed';
    element_selectorModule.append(content, br);
  });










  /** @type {Map<string, {el:HTMLButtonElement, self: DetectorNodes?}>} */
  let infoNode_dirs = new Map;
  /** @type {()=>void} */
  let call_temp;

  let selected_node = DetectorNodes.EVENTS
    .on('selected_node', node => {
      infoNode_dirs.forEach((data, dir) => {
        if (!node.neighbors.has(dir)) {
          data.self = null;
          return data.el.disabled = true;
        }
        data.el.disabled = false;
        data.self = node.neighbors.get(dir);
      });

      elements_nodeCord.textContent = node.name;
      node.events.off('update', call_temp);
      call_temp = () => {
        elements_infoNode1.innerText = node.state;
        elements_infoNode2.innerText = node.accelerationMax.toFixed(2) + ' Km/s²';
        elements_infoNode3.innerText = node.velocityMax.toFixed(2) + ' Km/s';
        elements_infoNode4.innerText = node.elapsed.toFixed(2) + ' s';
        elements_infoNode5.innerText = node.elapsed.toFixed() + ' i';
      }
      node.events.on('update', call_temp);
    });

  elements_infoNode_dirs.forEach(el => {
    let data = { el, self: null }
    infoNode_dirs.set(el.id, data);

    el.addEventListener('click', () => {
      if (data.self) DetectorNodes.SELECT_NODE(data.self);
    })
  });


  DetectorNodes.EVENTS.on('diselected_node', node => {
    infoNode_dirs.forEach((data, dir) => {
      data.self = null;
      return data.el.disabled = true;
    })
    elements_nodeCord.textContent = ''
    node.events.off('update', call_temp);
  });
})