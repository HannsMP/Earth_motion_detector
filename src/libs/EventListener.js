/** @template {{[eventName: string]: any[]}} D */
class EventListener {
  /** 
   * @type {Map<keyof D, OnMap | EventOption>} 
   */
  #data = new Map;

  /**
   * @template {keyof D} O
   * @param {O} eventName 
   * @param  {D[O]} eventData 
   */
  emit(eventName, ...eventData) {
    let eventMap = this.#data.get(eventName);

    if (!(eventMap instanceof Map)) return;

    eventMap.forEach(({ persistence, once }, eventFun) => {
      if (!persistence && once) eventMap.delete(eventFun);
      eventFun(...eventData);
    })
  }

  /**
   * @template {keyof D} O
   * @param {O} eventName 
   * @param  {D[O]} eventData 
   */
  async emitAsync(eventName, ...eventData) {

    let eventMap = this.#data.get(eventName);

    if (!(eventMap instanceof Map)) return;

    let eventFuns = eventMap.keys();

    for (let eventFun of eventFuns) {
      let { persistence, once } = eventMap.get(eventFun);

      if (!persistence && once) eventMap.delete(eventFun);
      await eventFun(...eventData);
    }
  }

  /**
   * @template {keyof D} O
   * @param {O} processName 
   * @param  {D[O]} processData 
   */
  complete(processName, ...processData) {
    let processMap = this.#data.get(processName);

    let processAwait = new Promise((res) => {
      if (!(processMap instanceof Map))
        return res();

      processMap.forEach(({ persistence, once }, eventFun) => {
        if (!persistence && once) eventMap.delete(eventFun);
        eventFun(...processData);
      })

      res();
    });

    this.#data.set(processName, { processAwait, processData })

    return processAwait;
  }

  /**
   * @template {keyof D} O
   * @param {O} processName 
   * @param  {D[O]} processData 
   */
  completeAsync(processName, ...processData) {
    let processMap = this.#data.get(processName);

    let processAwait = new Promise(async (res) => {
      if (!(processMap instanceof Map))
        return res();

      let eventFuns = processMap.keys();

      for (let eventFun of eventFuns) {
        let { persistence, once } = processMap.get(eventFun);

        if (!persistence && once) processMap.delete(eventFun);
        await eventFun(...processData);
      }

      res();
    });

    this.#data.set(processName, { processAwait, processData })

    return processAwait;
  }

  /**
   * @template {keyof D} O
   * @param {O} eventName 
   * @param {(...args: D[O])=>(Promise<void> | void)} eventFun 
   * @param {{ once: false, persistence: false}} option 
   */
  on(eventName, eventFun, option = {}) {
    let { once = false, persistence = false } = option;

    let eventMap = this.#data.get(eventName);

    if (!(eventMap instanceof Map)) {

      if (eventMap?.processAwait) {
        let process = eventMap;
        return process.processAwait = process.processAwait
          .then(async () => await eventFun(...process.processData));
      }

      eventMap = new Map;
      this.#data.set(eventName, eventMap)
    }

    eventMap.set(eventFun, { once, persistence })
  }

  /** 
   * @param {keyof D} eventName 
   * @param {Function} eventFun  
   */
  off(eventName, eventFun) {
    let eventMap = this.#data.get(eventName);
    if (!(eventMap instanceof Map))
      return false;

    eventMap.delete(eventFun);
    return true;
  }

  /** 
   * @param {keyof D} eventName  
   */
  empty(eventName) {
    let eventMap = this.#data.get(eventName);
    if (!(eventMap instanceof Map))
      return false;

    eventMap.forEach(({ persistence }, key) => {
      if (!persistence) eventMap.delete(key);
    });
    return true;
  }
}