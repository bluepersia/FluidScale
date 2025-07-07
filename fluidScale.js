let React;
import { Parser } from "expr-eval";

const evalParser = new Parser ();

let rootFontSize = 16;
const rootFontSizeChanged = [];

const unitToPx = {
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  pt: 96 / 72,
  pc: 16, 
};


let rootFontSizeEl;
try {
rootFontSizeEl = document.createElement("div");
rootFontSizeEl.id = 'root-font-size';
rootFontSizeEl.style.position = "absolute";
rootFontSizeEl.style.visibility = "hidden";
rootFontSizeEl.style.height = "1rem";
document.body.appendChild(rootFontSizeEl);
const newRem = rootFontSizeEl.offsetHeight;
  rootFontSize = newRem;
  rootFontSizeChanged.forEach (cb => cb());
const observer = new ResizeObserver(() => {
  const newRem = rootFontSizeEl.offsetHeight;
  
  rootFontSize = newRem;
  rootFontSizeChanged.forEach (cb => cb());
  // You can now update your px conversions
});

observer.observe(rootFontSizeEl);
}catch(err){}

/*
async function loadReact() {
  try {
    React = await import('react');
  } catch (err) {}
}

loadReact();
*/
const fluidPropertyNames = [
  'padding-min',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin-min',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'gap',
  'column-gap',
  'row-gap',
  'columns-min',
  'rows-min',
  'grid-auto',
  'grid-auto-fit',
  'grid-auto-fill',
  'grid-template-columns',
  'grid-template-rows',
  'grid-auto-rows',
  'grid-auto-fit-rows',
  'grid-auto-fill-rows',
  'width',
  'height',
  'font-size',
  'box-shadow-min',
  'box-shadow-x',
  'box-shadow-y',
  'box-shadow-spread',
  'background-size-min',
  'background-width',
  'background-height',
  'background-position-min',
  'background-position-x',
  'background-position-y',
  'border-radius-min',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'border-width-min',
  'border-top-width',
  'border-left-width',
  'border-right-width',
  'border-bottom-width',
  'line-height',
  'top',
  'bottom',
  'left',
  'right',
  'flex-basis',
  'flex',
  'letter-spacing'
];
const fluidPropertySync = {
  columns: 'grid-template-columns',
  rows: 'grid-template-rows',
};
/*
const noMin = [
  'box-shadow',
  'font-size',
  'row-gap',
  'column-gap',
  'height',
  'padding',
  'padding-top',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'gap',
  'grid-template-rows',
  'grid-auto-rows',
  'grid-auto-fit-rows',
  'grid-auto-fill-rows',
];*/

let breakpoints;
let autoBreakpoints;
let baseBreakpoint = null;
let minBreakpoint;
let maxBreakpoint;
let usingPartials = true;
let autoApply = true;
let autoTransition = {onlyStart:true};
let minimizedMode = true;
let enableComments = false;
let observerPaused = false;
let forceGPU = true;
let updateRate = 0;

class FluidScale {
  fluidProperties = [];
  classCache = new Map();
  breakpoints = [550, 1085];
  minBreakpoint = 300;
  maxBreakpoint = 1085;

  static async create (elList, bps, config = {})
  {
    if (elList && !Array.isArray(elList))
      elList = [elList, ...elList.querySelectorAll('*')];

    const fs = new FluidScale (elList, config);
    await fs.init (elList, bps, config);
    return fs;
  }
  constructor(elList, config = {}) {
    if (config.observeDestroy) {
      this.element = elList[0];
      this.parent = this.element.parentElement;
      this.observer = new MutationObserver(this.onMutation.bind(this));
      this.observer.observe(this.parent, { childList: true });
    }
  }

  async init(
    elList,
    bps,
    { minBp, maxBp, checkUsage = false, json, autoTransition = true }
  ) {
    if (json) await loadJSON(json);

    let wasParsed = stylesParsed;

    if (!stylesParsed && (!json || jsonLoaded !==  json)) {

      // run once on load
      let sheets = checkUsage
        ? (await waitForStylesheets()).filter((sheet) => {
            try {
              const ownerNode = sheet.ownerNode;
              if (!ownerNode) return false;

              if (ownerNode.tagName === 'STYLE') {
                const text = ownerNode.textContent.trimStart();
                return text.startsWith('/*enable-fluid');
              } else if (ownerNode.tagName === 'LINK') {
                return 'fluid' in node.dataset;
              }
            } catch {
              return false;
            }
          })
        : document.styleSheets;

        sheets = Array.from (sheets).filter (sheet => {
          try {
            sheet.cssRules;
            return true;
          }
          catch(e) {
            
            return false;
          }
        })       
        parseRules(sheets.map (sheet => Array.from (sheet.cssRules)).flat(), 0);

      stylesParsed = true;
    }

    this.breakpoints = bps || breakpoints;
    this.minBreakpoint = minBp || minBreakpoint || this.breakpoints[0];
    this.maxBreakpoint =
      maxBp || maxBreakpoint || this.breakpoints[this.breakpoints.length - 1];
    this.autoTransition = autoTransition;
    this.elVariables = {};
    this.animateBound = this.animate.bind (this);
    this.updateBound = this.update.bind(this);
    //this.onResizeBound = this.onResize.bind(this);
    //window.addEventListener('scroll', this.onResizeBound);
    rootFontSizeChanged.push (this.updateBound);

    if (!json && (this.breakpoints !== breakpoints || wasParsed)) {
      if (!usingPartials)
        console.error(
          `FluidScale - usePartials is disabled, but partials are being instantiated. Set usingPartials to true in the initializer config or integrate partials into the singleton.`
        );
      if (this.breakpoints === breakpoints)
        console.warn(
          'FluidScale singleton is initializing late. Optimize performance by initializing the singleton first.'
        );

      this.fluidVariableSelectors = structuredClone(fluidVariableSelectors);
      for (const bpMap of Object.values(this.fluidVariableSelectors)) {
        for (const bp of bpMap.values()) {
          for (const variableObj of Object.values(bp)) {
            if (variableObj.bpIndex === 0) variableObj.bp = this.breakpoints[0];
            else if (!variableObj.bpIndex)
              variableObj.bpIndex = this.breakpoints.indexOf(variableObj.bp);

            variableObj.nextBpIndex = variableObj.nextBp
              ? this.breakpoints.indexOf(variableObj.nextBp)
              : variableObj.bpIndex + 1;
          }
        }
      }
    } else this.fluidVariableSelectors = fluidVariableSelectors;

    if (elList) this.addElements(elList);
  }

  onMutation(mutations) {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed === this.element) {
          this.destroy();
          return;
        }
      }
    }
  }

  addElements(els) {

    els
      .filter((el) => !this.fluidProperties.find((fp) => fp.el === el))
      .forEach((el) => {
        if(!el.state)
          el.state = {};

        const classKey = getClassSelector(el);

        if (this.classCache.has(classKey)) {
          const classCacheArr = this.classCache.get(classKey);
          classCacheArr.forEach(({ variableName, arr, breakpoints, key }) => {
            const fluidProperty = FluidProperty.Parse(
              el,
              variableName,
              arr,
              breakpoints,
              this.autoTransition,
              this.computedStyleCache,
              this.boundClientRectCache,
              this,
            );

            this.fluidProperties.push(fluidProperty);
          });
        } else {
          const classCacheArr = [];
          this.classCache.set(classKey, classCacheArr);

          Object.keys(this.fluidVariableSelectors).forEach((key) => {
            const test = key.includes ('/') ? key.split ('/')[0] : key;

            if (el.matches(test)) {
              const rulesByBp = this.fluidVariableSelectors[key];

              const bpObj = [...rulesByBp.entries()];

              const variableMap = {};
              bpObj.forEach(([bpIndex, bpMap]) => {
                const bpMapEntries = Object.entries(bpMap);

                for (const [variableName, ruleObj] of bpMapEntries) {
                  if (!variableMap[variableName])
                    variableMap[variableName] = bpObj.map(
                      ([bpIndex, bpMap]) => bpMap[variableName]
                    );
                }
              });

              for (const [variableName, arr] of Object.entries(variableMap)) {
                const fluidProperty = FluidProperty.Parse(
                  el,
                  variableName,
                  arr,
                  this.breakpoints,
                  this.autoTransition,
                  this.computedStyleCache,
                  this.boundClientRectCache,
                  this, 
                );
                this.fluidProperties.push(fluidProperty);

                classCacheArr.push({
                  variableName,
                  arr,
                  breakpoints: this.breakpoints,
                  key
                });
              }
            }
          });
        }
      });

    if (this.autoTransition) {
      const { time, easing, delay } =
        typeof this.autoTransition === 'object' ? this.autoTransition : {};
      for (const el of els) {
        if (!el.variables) continue;
        const varTransitions = el.variables.map(
          (variable) =>
            `${variable} ${time || '300'}ms ${easing || 'ease'} ${delay || ''}`
        );

        const transitions = el.transitions 
          ? [...el.transitions, ...varTransitions]
          : varTransitions;
        el.transitionStr = transitions.join(', ');
        el.transitionBaseStr = el.transitions ? [...el.transitions].join(', ') : '';
        el.style.transition = el.transitionStr;
      }
    }

    if (this.observeRemove) {
    }
    requestAnimationFrame (this.animateBound);
  }

  removeElements(els) {
    this.fluidProperties = this.fluidProperties.filter(
      (f) => !els.includes(f.el)
    );
  }

  animate ()
  {
    if(this.destroyed)
      return;

    this.update ();
    requestAnimationFrame (this.animateBound);
  }
  updateDebounceCb = null
  onResize ()
  {
    if (!this.updateDebounceCb)
    {
      this.updateDebounceCb = () =>
      {
        this.update ();
        this.updateDebounceCb = null
      }

      setTimeout (this.updateDebounceCb, updateRate);
    }
  }

  computedStyleCache = new Map();
  boundClientRectCache = new Map();

  calcCurrentWidth ()
  {
    let currentWidth =
      window.innerWidth < this.minBreakpoint
        ? this.minBreakpoint
        : window.innerWidth > this.maxBreakpoint
        ? this.maxBreakpoint
        : window.innerWidth;

    if(currentWidth === this.currentWidth)
      return;

    if (this.breakpoints.length === 0) return;

    this.currentWidth = currentWidth;

    if (this.breakpoints.length === 1) {
      this.currentBpIndex = 0;
      return;
    }

    let currentBpIndex;
    if (currentWidth >= this.breakpoints[this.breakpoints.length - 1]) {
      currentBpIndex = this.breakpoints.length - 2;
    } else {
      for (let i = this.breakpoints.length - 1; i >= 0; i--) {
        if (currentWidth < this.breakpoints[i]) continue;
      
        currentBpIndex = i;
        break;
      }
    }
   
    this.currentBpIndex = currentBpIndex;
  }

  fluidState = [];

  update() {
    this.calcCurrentWidth ();

    this.fluidProperties = this.fluidProperties.filter((fp) => {
      
      if (!fp.el.isConnected) return false;
      fp.update(this.currentBpIndex, this.currentWidth);
      return true;
    });

    this.fluidState = this.fluidState.filter (state => {

      if(!state.el.isConnected) return false;
  
      const {lastValue, value, el, propertyName, fp} = state;
      
      const valueChanged = lastValue !== value || state.inlineActive === false;

      if (valueChanged && !state.inlineActive)
      {
        state.inlineActive = null;

        if (value === null)
        {
          el.style.removeProperty (propertyName);
          if(this.autoTransition?.onlyStart)
            el.style.setProperty ('transition', el.transitionStr);
        }
        else 
        {
          el.style.setProperty (propertyName, value);
          if(this.autoTransition?.onlyStart)
           setTimeout (() => el.style.setProperty ('transition', el.transitionBaseStr), this.autoTransition.time || 300);
        }

          state.lastValue = value;
      }
      
      state.order = -1;
      state.value = null;
      state.lastFp = fp;
      state.lastDynamicChange = state.dynamicChange
      state.dynamicChange = null
      return true;
     })

    this.computedStyleCache.clear();
    this.boundClientRectCache.clear ();
    this.lastWindowWidth = this.currentWidth;
  }

  destroy() {
    //window.removeEventListener('resize', this.onResizeBound);
    //window.removeEventListener ('scroll', this.onResizeBound);
    this.destroyed = true;
    rootFontSizeChanged.splice (rootFontSizeChanged.findIndex (this.updateBound), 1);
    this.observer?.disconnect();
  }
}

class FluidProperty {
  //noMin = false;
  //noUnit = false;
  breakpoints = [];
  constructor(el, name, valuesByBreakpoint, breakpoints, computedStyleCache, boundClientRectCache, fs) {
    this.el = el;
    this.fs = fs;
    this.name = name;
    this.isSet = '';
    this.valuesByBreakpoint = breakpoints.map((bp, index) =>
      valuesByBreakpoint.find((vbbp) => vbbp?.bpIndex === index)
    );
    this.breakpoints = breakpoints;
    this.computedStyleCache = computedStyleCache;
    this.boundClientRectCache = boundClientRectCache;
    this.active = true;
   
    if(forceGPU)
      constructGPUVersion (this);
    
    //if (name === 'line-height') this.noUnit = true;

    if(name.startsWith ('grid-auto'))
    {
      this.customTransition = {
        startTime: performance.now (),
        time: autoTransition?.time || 300,
        easing: autoTransition?.easing || 'ease',
        delay: autoTransition?.delay || 0
      }
    }
    if (valuesByBreakpoint[0]?.isPseudo)
      {
        this.isPseudo = true;
        this.pseudoSel = valuesByBreakpoint[0].selector;
      }
      else 
    if (valuesByBreakpoint[0]?.dynamic)
    {
      const observedAttribs = ['class', ...valuesByBreakpoint[0].attribs || []];
      const selector = valuesByBreakpoint[0].dynamic;
      this.active = el.matches (selector);
      this.observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'attributes' && observedAttribs.includes (mutation.attributeName)) {
           this.active = el.matches (selector);
          }
        }
      });

      this.observer.observe(el, {
        attributes: true,
        attributeFilter: observedAttribs
      });
    } 

   
      let propertyName;
      if (autoApply) {
        propertyName = fluidPropertySync[name] || name;
  
        if (name === 'grid-auto' || name === 'grid-auto-fit')
        {
          propertyName = 'grid-template-columns';
        }
        else if (name === 'grid-auto-fill')
        {
          propertyName = 'grid-template-columns';
        }
        else if (name === 'grid-auto-rows' || name === 'grid-auto-fit-rows')
        {
          propertyName = 'grid-template-rows';
        }
          else if (name === 'grid-auto-fill')
          {
            propertyName = 'grid-template-rows';
          }
      }
      else {
      propertyName = `--fluid-${this.name}-value`;
      }

    this.propertyName = propertyName;
    //for (const noMinEntry of noMin) if (name === noMinEntry) this.noMin = true;

    let state = el.state[propertyName];

    if(!state)
      state = el.state[propertyName] = {};

    if (!state.isInit)
    {
      state.order =  -1;
      state.value = null;
      state.lastValue = null;
      state.el = el;
      state.propertyName = propertyName;
      fs.fluidState.push (state);
      state.isInit = true;
    }

      this.state = state;
  }
/*
  getValUnit(val) {
    return this.noUnit
      ? ''
      : val.includes('rem')
      ? 'rem'
      : val.includes('em')
      ? 'em'
      : val.includes('%')
      ? '%'
      : val.includes('px')
      ? 'px'
      : 'rem';
  }

  valToNumber(val) {
    return Number(val.replace('rem', '').replace('em', '').replace('%', ''));
  }*/

  destroy ()
  {
    if (this.observer)
      this.observer.disconnect ();
  }
  getValues(breakpointIndex, currentWidth) {
    
    if (breakpointIndex >= this.breakpoints.length - 1)
      breakpointIndex = this.breakpoints.length - 2;

    while (breakpointIndex > 0 && !this.valuesByBreakpoint[breakpointIndex])
      breakpointIndex--;

    let breakpointValues = this.valuesByBreakpoint[breakpointIndex];

    if (!breakpointValues || (breakpointValues.minValues.some (v => typeof v === 'string') || breakpointValues.maxValues.some (v => typeof v === 'string') )) return [];

    this.order = breakpointValues.order;

    function calcProgress(breakpointMin, breakpointMax) {
      return Math.min(
        Math.max(
          (currentWidth - breakpointMin) / (breakpointMax - breakpointMin)
        ),
        1
      );
    }

    const progress = calcProgress(
      this.breakpoints[breakpointIndex],
      this.breakpoints[breakpointValues.nextBpIndex]
    );

    let values;
   
    if(progress >= 1)
      values = breakpointValues.maxValues.map((maxVal, index) => computeVal(maxVal, breakpointValues.maxUnits[index], this.name, this.el, this.computedStyleCache, this.boundClientRectCache))
    else 
      values = breakpointValues.minValues.map((val, index) => {
        
        const maxRaw = breakpointValues.maxValues[index];
       
        if(typeof val === 'string' || typeof maxRaw === 'string')
          return val;
       
        const minVal = computeVal (val, breakpointValues.minUnits[index], this.name, this.el, this.computedStyleCache, this.boundClientRectCache);

      if(Array.isArray (minVal) && minVal[0] === 'break')
      {
       
          return minVal[1];
      }
        const maxVal = computeVal (maxRaw, breakpointValues.maxUnits[index], this.name, this.el, this.computedStyleCache, this.boundClientRectCache);
        
       
        const rangeValue = maxVal - minVal;

        
        return minVal + (rangeValue * progress);
      });
   
    if (this.customTransition)
    {
      if (!this.customTransition.startValues || !values.every ((val, index) => val === this.customTransition.targetValues[index]))
      {
        this.customTransition.startValues = this.lastValues;
        
        if (!this.customTransition.startValues)
        {
          const prop = this.name.startsWith ('grid-auto') ? this.name.includes ('rows') ? 'grid-template-rows' : 'grid-template-columns' : this.name;
         
          let propVal = getCachedComputedStyle (this.el, this.computedStyleCache).getPropertyValue (prop);

          this.customTransition.startValues = propVal.split(' ').map (strVal => convertToPx(parseSingleVal(strVal), extractUnit(strVal, this.name), this.name, this.el, this.boundClientRectCache));
        }
        this.customTransition.targetValues = values;
        this.customTransition.startTime = performance.now ();
        
        if(this.customTransition.engine)
          clearInterval (this.customTransition.engine);
        
        setTimeout (()=> {
          this.customTransition.engine = setInterval(() => { 
            this.fs.calcCurrentWidth();
            this.update (this.fs.currentBpIndex, this.fs.currentWidth)
          }, 16);
      }, this.customTransition.delay);
      }
      else 
      {
        const time = performance.now () - this.customTransition.startTime;
        let progress = time / this.customTransition.time;
        progress = applyEasing (this.customTransition.easing, progress);
        
        if(progress >= 1) {
          progress = 1;
          clearInterval (this.customTransition.engine);
          this.customTransition.engine = null;
        }
        
        
        values = values.map ((val, index) => {
          const startValue = this.customTransition.startValues[index];
          if(!isNumber(startValue))
            return progress >= 1 ? val : startValue;

          const range = val - startValue;
          const curr = startValue + (range * progress);
          return curr;
        })
        
      }
    }
    
    this.lastValues = values;
    values = values.map((val, index) => {
      return !isNumber(val) ? val : `${val}px`;
  });

  /*
    if(!this.noMin)
     values = values.map((val) => {
      return `min(${val}, 100%)`;
    });*/

   
    return values;
  }

  static Parse(el, name, valuesByBreakpoint, breakpoints, autoTransition, computedStyleCache, clientBoundRectCache, fs) {
    const instanceName = name.replace('-min', '');
    if (autoTransition && !name.startsWith ('--grid')) {
      if (!el.variables) el.variables = [];

      el.variables.push(name);

      if(!el.transitions) el.transitions = new Set();

      for(const vbbp of valuesByBreakpoint)
      {
        if(vbbp?.transition)
        {
          const arr = vbbp.transition.split (',').map (t => t.trim());
          for(const t of arr)
            el.transitions.add (t);
        }
      }
    }
 
    if (valuesByBreakpoint.some((vbbp) => vbbp?.isCombo)) {
      return new FluidPropertyCombo(
        el,
        instanceName,
        valuesByBreakpoint,
        breakpoints,
        computedStyleCache,
        clientBoundRectCache,
        fs,
      );
    } else {
      return new FluidPropertySingle(el, name, valuesByBreakpoint, breakpoints, computedStyleCache, clientBoundRectCache, fs);
    }
  }

  toString(breakpointIndex, currentWidth) {
    return '';
  }

  lastActive = null
  lastPseudoMatch = null
  update(breakpointIndex, currentWidth) {
    const state = this.state;

    const isActive = this.active;
    const isPseudoMatch = this.isPseudo ? this.el.matches (this.pseudoSel) : true;

    state.dynamicChange = isActive !== this.lastActive || isPseudoMatch !== this.lastPseudoMatch;
    
    this.lastActive = isActive;
    this.lastPseudoMatch = isPseudoMatch;

    if(!isActive || !isPseudoMatch)
      return;
    
    if(this.fs.lastWindowWidth === currentWidth && !state.lastDynamicChange)
    {
      if(state.lastFp === this)
      {
        state.fp = state.lastFp;
        state.value = state.lastValue;
      }
      return;
    }
    
    if(!isInViewport (this.el, this.boundClientRectCache))
      return;
    
    const strValue = this.toString(breakpointIndex, currentWidth);
   
    if(!strValue)
      return;

   
    state.fp = this;
    if (autoApply) {

      if (this.name === 'grid-auto' || this.name === 'grid-auto-fit')
      {
        state.value =`repeat(auto-fit, ${strValue})`
      }
      else if (this.name === 'grid-auto-fill')
      {
        state.value =`repeat(auto-fill, ${strValue})`
      }
      else if (this.name === 'grid-auto-rows' || this.name === 'grid-auto-fit-rows')
      {
        state.value =`repeat(auto-fit, ${strValue})`;
      }
        else if (this.name === 'grid-auto-fill')
        {
        state.value =`repeat(auto-fill, ${strValue})`;
        }
      else { 
        state.value = strValue;
      }
      return;
    }
    state.value = strValue;
  }
}

class FluidPropertySingle extends FluidProperty {
  toString(breakpointIndex, currentWidth) {
    return super.getValues(breakpointIndex, currentWidth)[0];
  }
}

class FluidPropertyCombo extends FluidProperty {
  toString(breakpointIndex, currentWidth) {
    return super.getValues(breakpointIndex, currentWidth).join(' ');
  }
}

function constructGPUVersion (fluidProperty)
{
  switch (fluidProperty.name)
  {
    case "font-size":
    let maxFontSize;
    let maxFontUnit;
    for(let i = fluidProperty.valuesByBreakpoint.length - 1; i >= 0; i--)
    {
      const vbbp = fluidProperty.valuesByBreakpoint[i];
      if(vbbp)
      {
        maxFontSize = vbbp.maxValues[0]; 
        maxFontUnit = vbbp.maxUnits[0];
      }
    }
    break;
  }
}

async function waitForStylesheets(maxRetries = 10, delay = 50) {
  for (let i = 0; i < maxRetries; i++) {
    if (document.styleSheets.length > 0) {
      return document.styleSheets;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Stylesheets didn't load in time");
}

function getCachedComputedStyle (el, cache) 
{
  if(!cache.has (el))
    cache.set (el, getComputedStyle (el));
  
  return cache.get (el);
}

function getCachedBoundingClientRect (el, cache)
{
  if(!cache.has (el))
    cache.set (el, el.getBoundingClientRect());
  
  return cache.get (el);
}

function isInViewport(el, cache) {
  const rect = getCachedBoundingClientRect (el, cache);
  if (rect.width === 0 && rect.height === 0)
    return false;
  const vwWidth = window.innerWidth;
  const vwHeight = window.innerHeight;

  const marginPercent = 0.5;
  const marginX = vwWidth * marginPercent;
  const marginY = vwHeight * marginPercent;
  return (
    rect.bottom    >= -marginY &&
    rect.right   >= -marginX &&
    rect.top <= vwHeight + marginY &&
    rect.left  <= vwWidth + marginX
  );
}



function getCharUnit(el, unit = 'ch') {
  const test = document.createElement('span');
  test.style.visibility = 'hidden';
  test.style.position = 'absolute';
  test.style.font = getComputedStyle(el).font;
  test.textContent = unit === 'ch' ? '0' : 'x';
  document.body.appendChild(test);
  const rect = test.getBoundingClientRect();
  document.body.removeChild(test);
  return unit === 'ch' ? rect.width : rect.height;
}

function isArithemtic (v)
{
  if(typeof v !== 'string')
    return false;

  return v === '+' || v === '-' || v === '/' || v === '*';
}
function isNumber(value) {
  return typeof value === 'number' && isFinite(value);
}
function computeVal (val, units, property, el, computedStyleCache, boundClientRectCache)
{
  
  if(Array.isArray (val))
  {
    return computeCalc(val[0], val[1], units[1], property, el, computedStyleCache, boundClientRectCache);
  }
  return convertToPx (val, units, property, el, computedStyleCache, boundClientRectCache);
}

function computeCalc (type, arr, units, property, el, computedStyleCache, boundClientRectCache)
{
  const pxValues = arr.map ((v, index) => isArithemtic (v) ? v : computeVal(v, units[index], property, el, computedStyleCache, boundClientRectCache));

  switch(type)
  {
    case "break":
      return ['break', pxValues[0]];
    case "min":
      return Math.min (...pxValues);
    case "max":
      return Math.max (...pxValues);
    case "clamp": 
      const [minVal, fluidVal, maxVal] = pxValues;
      return Math.min(Math.max(fluidVal, minVal), maxVal);
    case "calc":
      const expr = evalParser.parse (pxValues.join(' '));
      return expr.evaluate ();
    case "minmax":
      const style = getCachedComputedStyle (el, computedStyleCache);
      switch(property)
      {
        case "grid-auto-fit":
        case "grid-auto-fill": {
          const gap = style.columnGap || style.gap || 0;
          const gapProperty = style.columnGap ? 'column-gap' : "gap";
          const gapVal = parseSingleVal (gap);
          const gapUnit = extractUnit (gap, gapProperty);
       
          return computeAutoFitGrid (getCachedBoundingClientRect(el, boundClientRectCache).width, pxValues[0], pxValues[1], computeVal (gapVal, gapUnit, gapProperty, el, computedStyleCache, boundClientRectCache))
        }
        case "grid-auto-fit-rows":
        case "grid-auto-fill-rows": {
          const gap = style.rowap || style.gap || 0;
          const gapProperty = style.rowGap ? 'row-gap' : "gap";
          const gapVal = parseSingleVal (gap);
          const gapUnit = extractUnit (gap, gapProperty);
          return computeAutoFitGrid (getCachedBoundingClientRect(el, boundClientRectCache).height, pxValues[0], pxValues[1], computeVal (gapVal, gapUnit, gapProperty, el, computedStyleCache, boundClientRectCache))
        }
      }

      return Math.max(pxValues[0], pxValues[1]);
  }
}

function computeAutoFitGrid(containerWidth, minTrackSize, maxTrackSize, gap = 0) {
  const totalGap = (n) => (n - 1) * gap;

  // Try to fit as many tracks of `minTrackSize` as possible
  let numTracks;
  if (minTrackSize === 0) {
    // Fallback to maximum possible tracks, limited by maxTrackSize
    numTracks = Math.floor((containerWidth + gap) / (1 + gap)); // assume 1px to avoid division by 0
    numTracks = Math.max(1, numTracks);
    return maxTrackSize; // Use the max value if min is 0
  }

  // Edge case: make sure we have at least one track
  numTracks = Math.max(1, numTracks);

  // Calculate available space per track
  const spaceForTracks = containerWidth - totalGap(numTracks);
  const trackSize = Math.min(maxTrackSize, Math.max(minTrackSize, spaceForTracks / numTracks));

 return trackSize;
}

function convertToPx (val, unit, property, el, computedStyleCache, boundClientRectCache)
{
  switch(unit)
  {
    case "px":
      return val;
    case "rem":
      return val * rootFontSize;
    case "em":
      const targetEl = property === 'font-size' ? el.parentElement : el;
      const targetFontSize = getCachedComputedStyle (targetEl, computedStyleCache).fontSize;

      const targetVal = parseSingleVal (targetFontSize);
      const targetUnit = extractUnit (targetFontSize, 'font-size');

      return convertToPx(targetVal, targetUnit, 'font-size', targetEl, computedStyleCache, boundClientRectCache) * val;
    case "%":
      
      const parentStyle = getCachedComputedStyle(el.parentElement, computedStyleCache);
      const parentEl = el.parentElement;
      switch(property)
      {
        case "height":
        case "top":
        case "bottom":
          const padTop = parentStyle.paddingTop;
          const padBtm = parentStyle.paddingBottom;
          const padding = convertToPx (parseSingleVal (padTop), extractUnit(padTop, 'padding-top'), 'padding-top', parentEl, computedStyleCache, boundClientRectCache) + convertToPx (parseSingleVal (padBtm), extractUnit(padBtm, 'padding-bottom'), 'padding-bottom', parentEl, computedStyleCache, boundClientRectCache);
          return (val / 100) * (getCachedBoundingClientRect (el.parentElement, boundClientRectCache).height - padding);
      }
      
      const padLeft = parentStyle.paddingLeft
      const padRight = parentStyle.paddingRight;
      const padding = convertToPx (parseSingleVal (padLeft), extractUnit(padLeft, 'padding-left'), 'padding-left', parentEl, computedStyleCache, boundClientRectCache) + convertToPx (parseSingleVal (padRight), extractUnit(padRight, 'padding-right'), 'padding-right', parentEl, computedStyleCache, boundClientRectCache);
     
      return (val / 100) * (getCachedBoundingClientRect(el.parentElement, boundClientRectCache).width - padding);

    case "vw":
      return (val / 100) * window.innerWidth;
    case "vh":
      return (val / 100) * window.innerHeight;

    case "vmin":
      return (val / 100) * Math.min (window.innerWidth, window.innerHeight);
    case "vmax":
      return (val / 100) * Math.max (window.innerWidth, window.innerHeight);
    
    case 'cm':
    case 'mm':
    case 'in':
    case 'pt':
    case 'pc':
      return val * unitToPx[unit];

    case 'ch':
    case 'ex':
      return val * getCharUnit(el, unit);

    case "lh": 
      const style = getCachedComputedStyle(el, computedStyleCache);
      const fontSize = style.fontSize;
      const fsVal = parseSingleVal(fontSize);
      const fsUnit = extractUnit(fontSize, 'font-size');
      const fontSizePx = convertToPx(fsVal, fsUnit, 'font-size', el, computedStyleCache, boundClientRectCache);

      if (val === "normal") 
        return fontSizePx * 1.2;

      return fontSizePx * val;
  }
}

function applyEasing (easing, t)
{
  if (easing === 'ease')
    return t < 0.5
    ? (4 * t * t * t)
    : ((t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

  if (easing === 'ease-in')
    return t * t;

  if(easing === 'ease-out')
    return t * (2 - t);

  if (easing === 'ease-in-out')
    return t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t;

  return t;
}

// before FluidScale …
let fluidVariableSelectors = {};
let stylesParsed = false;
// Map<variableName, Array<{ selector: string, value: string, bpIndex: number }>>

// helper: walk rules

let prevValues = {};

function parseNextValues(rules) {
  for (const rule of rules) {
    const next = rule.style.getPropertyValue('--fluid-next');
    const nextBp = next ? Number(next.replace('px', '')) : null;
    rule.nextBp = nextBp;
    if (nextBp && autoBreakpoints) breakpoints.push(nextBp);
  }
}

function findCSSRuleConstructor(rules) {
  for (const rule of rules) {
    const proto = Object.getPrototypeOf(Object.getPrototypeOf(rule));
    if (proto && proto.constructor && proto.constructor.name === 'CSSRule') {
      return proto.constructor;
    }
    // Recursively search inside group rules like @media
    if ('cssRules' in rule) {
      const found = findCSSRuleConstructor(rule.cssRules);
      if (found) return found;
    }
  }
  return null;
}

const calcFuncs = ['min', 'max', 'clamp', 'minmax', 'calc'];

function tryParseCalcs (val)
{

  for(const calcFunc of calcFuncs)
    {
      const result = parseCalc (val, calcFunc);
    
      if(result[0])
      {
        return result;
      }
    }

    return val;

}

function parseCalc(value, type) {


  const prefix = `${type}(`;  
  if (!value.startsWith(prefix) || !value.endsWith(')')) return [null, value];
  //if (type === 'calc' && (value.includes(' ') && !isArithemtic (value))) return [null, value];

  const inner = value.slice(prefix.length, -1).trim()


  
  //if(type === 'var')
    //return inner;

  if (type === "calc") {
    
    // Split into tokens: operands and operators
    const tokens = [];
    let depth = 0;
    let current = "";

    for (let i = 0; i < inner.length; i++) {
      const char = inner[i];

      if (char === "(") {
        depth++;
        current += char;
      } else if (char === ")") {
        depth--;
        current += char;
      } else if ("+-*/".includes(char) && depth === 0) {
        if (current.trim()) tokens.push(tryParseCalcs(current.trim()));
        tokens.push(char);
        current = "";
      } else {
        current += char;
      }
    }


    if (current.trim()) tokens.push(tryParseCalcs(current.trim()));
    
    return tokens.length === 1 ? ['break', tokens] : [type, tokens];
  }

  const args = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];

    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      args.push(tryParseCalcs (current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  if (current) args.push(tryParseCalcs (current.trim()));
  
  return args.length === 1 ? ['break', args] : [type, args];
}


function parseAllCalcs(value) {
 
  const parts = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    }

    if (char === ' ' && depth === 0) {
     
      if (current.trim()) parts.push(tryParseCalcs(current.trim()));
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(tryParseCalcs(current.trim()));   
  return parts;
}

function splitByOuterSpaces(input) {
  const result = [];
  let buffer = '';
  let depth = 0;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '(') {
      depth++;
      buffer += char;
    } else if (char === ')') {
      depth--;
      buffer += char;
    } else if (char === ' ' && depth === 0) {
      if (buffer) {
        result.push(buffer);
        buffer = '';
      }
    } else {
      buffer += char;
    }
  }

  if (buffer) {
    result.push(buffer);
  }

  return result;
}
const clockSymmetry = [
  'margin',
  'padding',
  'border-width',
  'border-style',
  'border-color',
  'inset',
  'scroll-padding',
  'scroll-margin',
]
const clockMap = new Map ([
  [1, {
    'top': 0,
    'left': 0,
    'right': 0,
    'bottom': 0
  }],
  [2, {
    'top': 0,
    'bottom': 0,
    'left': 1,
    'right': 1
  }],
  [3,{
    'top': 0,
    'left': 1,
    'right': 1,
    'bottom': 2
  }],
  [4, {
    'top': 0,
    'right': 1,
    'bottom': 2,
    'left': 3
  }]
]
)

const borderMap = new Map([
  [1, {
    'top-left': 0,
    'top-right': 0,
    'bottom-right': 0,
    'bottom-left': 0
  }],
  [2, {
    'top-left': 0,
    'bottom-right':0,
    'top-right':1,
    'bottom-left':1
  }],
  [3, {
    'top-left': 0,
    'top-right':1,
    'bottom-left':1,
    'bottom-right':2
  }],
  [4, {
    'top-left': 0,
    'top-right':1,
    'bottom-right':2,
    'bottom-left':3 
  }]
])

const flexMap = new Map ([
  [1, {
    'basis': 0
  }],
  [3, {
    'basis': 2
  }]
])


const explicitValues = {
  'padding-left': [clockMap, 'padding', 'left'],
  'padding-right': [ clockMap, 'padding', 'right'],
  'padding-bottom': [clockMap, 'padding', 'bottom'],
  'padding-top': [clockMap, 'padding', 'top'],

  'margin-left': [clockMap, 'margin', 'left'],
  'margin-right': [ clockMap, 'margin', 'right'],
  'margin-bottom': [ clockMap, 'margin', 'bottom'],
  'margin-top': [clockMap, 'margin', 'top'],

  'border-top-width': [clockMap, 'border-width', 'top'],
  'border-right-width': [clockMap, 'border-width', 'right'],
  'border-bottom-width': [clockMap, 'border-width', 'bottom'],
  'border-left-width': [clockMap, 'border-width', 'left'],

  'border-top-style': [clockMap, 'border-style', 'top'],
  'border-right-style': [clockMap, 'border-style', 'right'],
  'border-bottom-style': [clockMap, 'border-style',  'bottom'],
  'border-left-style': [clockMap, 'border-style', 'left'],

  'border-top-color':[clockMap, 'border-color', 'top'],
  'border-right-color':[clockMap, 'border-color', 'right'],
  'border-bottom-color': [clockMap, 'border-color', 'bottom'],
  'border-left-color': [clockMap, 'border-color',  'left'],

  'top': [clockMap, 'inset', 'top'],
  'right':[clockMap, 'inset', 'right'],
  'bottom': [clockMap, 'inset', 'bottom'],
  'left': [clockMap, 'inset', 'left'],

  'scroll-padding-top': [clockMap, 'scroll-padding', 'top'],
  'scroll-padding-right': [clockMap, 'scroll-padding', 'right'],
  'scroll-padding-bottom': [clockMap, 'scroll-padding', 'bottom'],
  'scroll-padding-left': [clockMap, 'scroll-padding', 'left'],

  'scroll-margin-top': [clockMap, 'scroll-margin', 'top'],
  'scroll-margin-right': [clockMap, 'scroll-margin', 'right'],
  'scroll-margin-bottom': [clockMap, 'scroll-margin', 'bottom'],
  'scroll-margin-left': [clockMap, 'scroll-margin', 'left'],

  'border-top-left-radius': [borderMap, 'border-radius', 'top-left'],
  'border-top-right-radius': [borderMap, 'border-radius', 'top-right'],
  'border-bottom-right-radius': [borderMap, 'border-radius', 'bottom-right'],
  'border-bottom-left-radius': [borderMap, 'border-radius', 'bottom-left'],

  'flex-basis': [flexMap, 'flex', 'basis']
}

const shorthandValues = 
{
  'padding': [clockMap, {
    'padding-left': 'left',
    'padding-right': 'right',
    'padding-top': 'top',
    'padding-bottom': 'bottom'
  }],
  'margin': [clockMap, {
    'margin-left': 'left',
    'margin-right': 'right',
    'margin-top': 'top',
    'margin-bottom': 'bottom'
  }],
  'border-width': [clockMap, {
    'border-left-width': 'left',
    'border-right-width': 'right',
    'border-top-width': 'top',
    'border-bottom-width': 'bottom'
  }],
  'border-style': [clockMap, {
    'border-left-style': 'left',
    'border-right-style': 'right',
    'border-top-style': 'top',
    'border-bottom-style': 'bottom'
  }],
  'border-color': [clockMap, {
    'border-left-color': 'left',
    'border-right-color': 'right',
    'border-top-color': 'top',
    'border-bottom-color': 'bottom'
  }],
  'inset': [clockMap, {
    'left': 'left',
    'right': 'right',
    'top': 'top',
    'bottom': 'bottom'
  }],
  'scroll-padding': [clockMap, {
    'scroll-padding-left': 'left',
    'scroll-padding-right': 'right',
    'scroll-padding-top': 'top',
    'scroll-padding-bottom': 'bottom'
  }],
  'scroll-margin': [clockMap, {
    'scroll-margin-left': 'left',
    'scroll-margin-right': 'right',
    'scroll-margin-top': 'top',
    'scroll-margin-bottom': 'bottom'
  }],
  'border-radius': [borderMap, {
    'border-top-left-radius': 'top-left',
    'border-top-right-radius': 'top-right',
    'border-bottom-right-radius': 'bottom-right',
    'border-bottom-left-radius': 'bottom-left'
  }],
  'flex': [flexMap, {'flex-basis': 'basis'}]
}



function equalize (vals1, vals2, map)
{
  if(vals2.length > vals1.length)
    return [stretch (vals1, vals2, map), vals2];
  else 
    return [vals1, stretch (vals2, vals1, map)]
}

function stretch (smaller, larger, map)
{
  const stretched = new Array(larger.length);

  const smallMap = map.get (smaller.length);
  for(const [pos, index] of Object.entries (map.get (larger.length)))
  {
    const smallIndex = smallMap[pos];

    stretched[index] = smaller[smallIndex];
  }

  return stretched;
}



function parseGridTemplateColumns(value) {
  
  const match = value.match(/^repeat\(\s*(auto-fit|auto-fill)\s*,\s*(.+)\)$/);
  if (match) {
    return match[2].trim();
  }
  return null; // Not a match
}

function parseRepeat(value) {
  if(!value.includes ('repeat'))
    return value;
  const match = value.match(/^repeat\(\s*(\d+)\s*,\s*([^)]+)\s*\)$/);
  if (!match) return null;

  const count = parseInt(match[1], 10);
  const unit = match[2].trim();

  return Array(count).fill(unit).join(' ');
}

function isStrVal (val)
{
 return (!/^[\d.]/.test (val));
}
function parseSingleValFull (val)
{
  if(Array.isArray (val))
    return [val[0], val[1].map(v => parseSingleValFull (v))];

  return parseSingleVal (val);
}
function parseSingleVal (val)
{
  //if (isStrVal(val))
    //return val;

const match = val.match(/[\d.]+/);
const number = match ? parseFloat(match[0]) : val;

return number;
}
function extractUnit(input, property) {
  const match = input.match(/[a-z%]+$/i);
  return match ? match[0] : property === 'line-height' ? 'lh' : 'px';
}

function parseUnit (val, property)
{
  if (Array.isArray (val))
    return ['', val[1].map(v => parseUnit (v))]

  return val.startsWith('0.') || !val.startsWith('0') ? extractUnit (val, property) : 'px';
}

function extractExplicitValue (rule, explicitData)
{
  if(explicitData)
  {
    const [symmetryMap, shorthand, posId] = explicitData;

    const shorthandVal = rule.style.getPropertyValue (shorthand);
    if (shorthandVal)
    {
      const shorthandValSpl = splitByOuterSpaces (shorthandVal);

      const index = symmetryMap.get(shorthandValSpl.length)[posId];
      return shorthandValSpl[index];
    }
    else if (shorthand === 'border-width')
    {
      const borderVal = rule.style.getPropertyValue ('border');

      if(borderVal)
        return extractBorderWidthFromBorderShorthand (borderVal);
    }
  }

      return null;
}
 const BORDER_WIDTH_KEYWORDS = new Map([
    ['thin', '1px'],
    ['medium', '2px'],
    ['thick', '3px']
  ])

function extractBorderWidthFromBorderShorthand(value) {
 
  const parts = splitByOuterSpaces (value);

  for (const part of parts) {
    // If it's a length or keyword that matches border-width
    if (
      BORDER_WIDTH_KEYWORDS.has(part) // crude length match
    ) {
      return BORDER_WIDTH_KEYWORDS.get (part);
    }
    else if ( /^[\d.]+(px|em|rem|%)?$/.test(part))
      return part;
  }

  // fallback
  return null;
}

let CSSRuleRef;
let mediaBps;
let spans = {};

function assignOrderIndex(rules, state = {currOrder:0}) {
 
  for(const rule of rules)
  {
    if (rule.type === CSSRuleRef.MEDIA_RULE)
      assignOrderIndex (rule.cssRules, state);
    else 
      rule.order = state.currOrder++;
  }
}
function processComments(rule) {
  if (!enableComments || rule.comments) return;

  let comments;
  const rawRuleText = rule.cssText;
  const matches = rawRuleText.match(
    /\/\*\s*fluid-([a-z-]+):\s*([^\*]+?)\s*\*\//gi
  );
  if (matches) {
    comments = {};

    for (const match of matches) {
      const [, prop, value] = match.match(
        /fluid-([a-z-]+):\s*([^\*]+?)\s*\*\//i
      );
      comments[prop] = value.trim();
    }
  }
  rule.comments = comments;
}

function parseRules(rules, bpIndex = 0, bp = 0) {

  if(!CSSRuleRef)
    CSSRuleRef = typeof CSSRule !== 'undefined' ? CSSRule :  findCSSRuleConstructor (rules);
  

  if (bpIndex == 0) {
    const rulesArr = [...rules];

    assignOrderIndex (rulesArr);
    

    mediaBps = rulesArr
      .filter(
        (rule) =>
          rule.type === CSSRuleRef.MEDIA_RULE &&
          rule.media.mediaText.includes('(min-width:')
      )
      .map((rule) => {
        if (breakpoints && !usingPartials && !autoBreakpoints) {
          for (let i = 1; i < breakpoints.length; i++) {
            if (rule.media.mediaText.includes(`${breakpoints[i]}px`)) {
              return { cssRules: rule.cssRules };
            }
          }
        } else {
          const width = parseFloat(
            rule.media.mediaText.match(/\(min-width:\s*(\d+\.?\d*)px\)/)[1]
          );

          return { cssRules: rule.cssRules, width };
        }
      })
      .sort((a, b) => a.width - b.width);

    if (autoBreakpoints) {
      breakpoints = Array.from (new Set (mediaBps.map((mediaBp) => mediaBp.width)));
     
      if (mediaBps.length <= 1 && !baseBreakpoint) return;
    }
    if(baseBreakpoint)
      breakpoints.unshift (baseBreakpoint);

    parseNextValues(
      [...rules].filter((rule) => rule.type === CSSRuleRef.STYLE_RULE)
    );

    for (const { cssRules } of mediaBps)
      parseNextValues(
        [...cssRules].filter((rule) => rule.type === CSSRuleRef.STYLE_RULE)
      );

    if (autoBreakpoints) breakpoints = breakpoints.sort((a, b) => a - b);
  }

  for (const rule of rules) {
    
    if (rule.type === CSSRuleRef.STYLE_RULE) {

      let force;
      let spanStart;
      let spanEnd;
     
      processComments(rule);
      let nextBp = rule.nextBp;

      bp = bpIndex !== -1 ? bpIndex : bp;

      let nextBpIndex = breakpoints
        ? nextBp
          ? breakpoints.indexOf(nextBp)
          : bpIndex + 1
        : null;


      const selectors = rule.selectorText.split (',').map (s => s.trim());
      for (const selector of selectors)
      {
        let bps = fluidVariableSelectors[selector];

        for (const fluidPropertyName of fluidPropertyNames) {

          let variableName =  autoApply
            ? fluidPropertyName.replace('-min', '')
            : `${fluidPropertyName}`;

          if(autoApply && shorthandValues[variableName])
            continue;

          let value;

          if (bps && !minimizedMode) {
            const arr = [...bps.values()]
            const lastBp = arr[arr.length - 1];
            if (lastBp) {
              const variableObj = lastBp[variableName];
              if (variableObj) value = variableObj.maxValues.join(' ');
            }
          }

          const explicitData = explicitValues[variableName];
          const shorthand = explicitData?[1] : null;
         spanEnd = spanEnd || rule.style.getPropertyValue ('--span-end')?.split (',').map (s => s.trim()) || [];
          if (!value && (!minimizedMode || spanEnd.includes ('all') || spanEnd.includes (variableName))|| spanEnd.includes (shorthand))
          {
            value = prevValues[selector]?.[variableName];
          }
          if (!value) {
            if (rule.comments?.hasOwnProperty(variableName))
              value = rule.comments[variableName];
            else {
              value = rule.style
                .getPropertyValue(
                  autoApply && !variableName.startsWith('grid-auto') ? variableName : `--fluid-${variableName}`
                )
                .trim();
            }
          }

          
          if (!value && autoApply)
            value = extractExplicitValue (rule, explicitData);
          

          if (!value || value.includes ('var(')) continue;

          
          const spanValue = value;

          let gridTemplateVarName;
          if (value.includes ('auto-') && !value.includes ('--grid-auto'))
          {
            gridTemplateVarName = `${value.includes('-fit') ? 'grid-auto-fit' : 'grid-auto-fill'}`
            if(variableName.includes ('rows'))
              gridTemplateVarName += '-rows';
            value = parseGridTemplateColumns (value);
          }
          else 
          {
            value = parseRepeat (value);
          }

          spanStart = spanStart || rule.style.getPropertyValue ('--span-start')?.split(',').map (s => s.trim()) || [];
          if (!minimizedMode || spanStart.includes ('all') || spanStart.includes (variableName) || spanStart.includes (shorthand)) {
            if (!prevValues[selector])
              prevValues[selector] = {};

            const prevValuesForRule = prevValues[selector];

            prevValuesForRule[variableName] = value;
          }
          const allCalcsParsed = parseAllCalcs (value);
          let minValues;
          let maxValues;
          let isCombo = false;
          if (autoApply || fluidPropertyName.includes('-min')) {
        
            minValues = allCalcsParsed;
            let maxVal;
            if (autoApply && minimizedMode) {
          
              // Search future breakpoints for the same selector and variable
              const startIndex = mediaBps.findIndex(
                ({ width }) => width === breakpoints[bpIndex + 1]
              );
              if (startIndex === -1) continue;

              for (let i = startIndex; i < mediaBps.length; i++) {
                const { cssRules, width } = mediaBps[i];
                const futureVal = findMap(cssRules, r =>
                  {
                    if(r.type === CSSRuleRef.STYLE_RULE &&
                      r.selectorText.split(',').map(s => s.trim()).includes (selector))
                    {
                      let futureV = r.style.getPropertyValue(variableName);

                      if(!futureV)
                        futureV = extractExplicitValue (r, explicitData);

                      if (!futureV)
                      {
                        const spanEnd = r.style.getPropertyValue ('--span-end')?.split(',').map (s => s.trim()) || [];
                        if (spanEnd.includes ('all') || spanEnd.includes (variableName) || spanEnd.includes (shorthand))
                          return spanValue;
                      }

                      if(futureV)
                        return futureV;

                      return;
                      //const explicitData = explicitValues[variableName];
                      const shorthandData = shorthandValues[variableName]
                      if(explicitData || !shorthandData)
                      {
                        let futureV = r.style.getPropertyValue(variableName);
                        
                        if(futureV)
                          return futureV;

                        if(false && explicitData)
                        {
                          futureV = r.style.getPropertyValue (explicitData[1]);
                          if (futureV)
                          {
                            const vSpl = splitByOuterSpaces (futureV);
                            const symmetryMap = explicitData[0];
                            
                            const shorthandLength = vSpl.length;
                            const symmetryDir = explicitData[2];
                            const shorthandIndex = symmetryMap.get (shorthandLength)[symmetryDir];
                            return vSpl[shorthandIndex];
                          }
                        }
                        else if (false && shorthandData)
                        {
                          const symmetryMap = shorthandData[0];
                          const symmetry4 = symmetryMap.get(4);
                          const dirInfo = shorthandData[1];

                          const futureExpl = new Array (4);
                          
                          for(const [dir, index] of Object.entries (symmetryMap.get(allCalcsParsed.length)))
                            futureExpl[symmetry4[dir]] = allCalcsParsed[index];
                          
                          for(const [dirProp, dir] of Object.entries (dirInfo))
                          {
                            const index = symmetry4[dir];
                            futureExpl[index] = r.style.getPropertyValue (dirProp);
                          }

                          const futureShort = splitByOuterSpaces (r.style.getPropertyValue (variableName));

                          for(const [dir, index] of Object.entries (symmetryMap.get(futureShort.length)))
                          {
                            const dir4 = symmetry4[dir];
                            if (!futureExpl[dir4])
                              futureExpl[dir4] = futureShort[index];
                          }

                          return futureExpl.join (' ');
                        }
                      }
                    }
                  })
                  /*;[...cssRules].find((r) => {
                  //processComments(r);
                  return (
                    //r.comments?.hasOwnProperty(variableName) ||
                    (r.type === CSSRuleRef.STYLE_RULE &&
                      r.selectorText === selector &&
                      r.style.getPropertyValue(variableName))
                  );
                });*/

                if (futureVal) {
                  maxVal = futureVal.trim();

                  if (gridTemplateVarName)
                  {
                    maxVal = parseGridTemplateColumns (maxVal);
                    variableName = gridTemplateVarName;
                  }
                  else 
                    maxVal = parseRepeat (maxVal);
                  
                  nextBp = width;
                  nextBpIndex = breakpoints.indexOf(width);
                  break;
                }
              }
            }
          
            if (!maxVal) {
              const maxField = autoApply
                ? rule.style.getPropertyValue(`--${variableName}-max`)
                : fluidPropertyName.replace('-min', '-max');
              maxVal = rule.style.getPropertyValue(`--fluid-${maxField}`).trim();

              if (!maxVal) {
                force = force || rule.style.getPropertyValue ('--force')?.split(',').map(s => s.trim()) || [];

                if (force.includes ('all') || force.includes (variableName) || force.includes (shorthand))
                {
                  nextBpIndex = breakpoints.length - 1;
                  nextBp = breakpoints[nextBpIndex];
                  maxValues = minValues;
                }
                else 
                {
                  continue;
                }
              }
            }

            if (!maxValues)
            {
              maxValues = parseAllCalcs (maxVal);   
              if (maxValues.length !== minValues.length)
              {
                
                if (clockSymmetry.includes (variableName))
                {
                  const eq = equalize (minValues, maxValues, clockMap);
                  minValues = eq[0];
                  maxValues = eq[1];
                } else if (variableName === 'border-radius')
                {
                  if(minValues.includes('/'))
                    continue;
                  
                  const eq = equalize (minValues, maxValues, borderMap);
                  minValues = eq[0];
                  maxValues = eq[1];
                }
              }
          }
            isCombo = true;
          } else {
            const valueArr = allCalcsParsed;
            const isOne = valueArr.length <= 1;
            let first = valueArr[0];
            if (isOne)
            {
              if(Array.isArray (first) && first[0] === 'break')
                first = first[1];
              
              minValues = [first];
              maxValues = [first];
            }
            else 
            {
              minValues = [valueArr[0]];
              maxValues = [valueArr[1]];
            }
          }
          let transition;
          if (bpIndex === 0 && autoTransition)
            transition = rule.style.getPropertyValue('transition');

          //const unitsBase = minValues.length >= maxValues.length ? minValues : maxValues;
          const minUnits = minValues.map (v => parseUnit(v, fluidPropertyName));
          const maxUnits = maxValues.map(v => parseUnit (v, fluidPropertyName));
          //let unitValues = unitsBase.map((val) => parseUnit (val));

          minValues = minValues.map((val) =>
            parseSingleValFull (val)
          );
          maxValues = maxValues.map((val) =>
            parseSingleValFull(val)
          );

          /*
          const rangeValues = minValues.map(
            (minVal, index) => { 
              const maxVal = maxValues[index] || maxValues[maxValues.length - 1];
              return isStrVal (minVal) || isStrVal(maxVal) ? null : maxVal - minVal
            }

          if (unitValues.some(unit => unit === null))
          {
            const root = unitValues.find(unit => unit !== null) || 'rem';
            unitValues = unitValues.map ((u) => u || root);
          }
          );*/

          let bpApply =  bp;
          let bpIndexApply = bpIndex;


          let dynamic;
          let attribs = [];
          let root = selector;
          let isPseudo;
          if (selector.includes (':'))
          {
            isPseudo = true;
            root = stripToBaseSelector (selector);
          }
          else 
          {
             dynamic = rule.style.getPropertyValue ('--dynamic') === 'true';

            if (dynamic)
            {
              if (selector.includes ('['))
              {
                const attrMatches = selector.match(/\[(.+?)(?:[~|^$*]?=.+?)?\]/g) || [];
                attribs = attrMatches.map(attr => attr.replace(/[\[\]=].*$/, ''));
              }
              root = stripAttributeSelectors (stripClassModifiers (selector));
            }
          }

          if (root !== selector)
            root = `${root}/${selector}`;

          if (!bps) fluidVariableSelectors[root] = bps = new Map();

          let bpMap;
          if (bps.has(bp)) bpMap = bps.get(bp);
          else {
            bpMap = {};
            bps.set(bp, bpMap);
          }
          
          
          const variableObj = (bpMap[variableName] = {
            selector,
            minValues,
            maxValues,
            minUnits,
            maxUnits,
            variableName,
            order: rule.order
          });
          
          
          if (isCombo) variableObj.isCombo = true;
          if (bpIndexApply !== -1) variableObj.bpIndex = bpIndexApply;
          if (bpApply) variableObj.bp = bpApply;
          if (nextBp) variableObj.nextBp = nextBp;
          if (nextBpIndex) variableObj.nextBpIndex = nextBpIndex;
          if (transition) variableObj.transition = transition;
          if (dynamic) variableObj.dynamic = selector;
          if (attribs.length > 0) variableObj.attribs = attribs;
          if (isPseudo) variableObj.isPseudo = true;
        }
      }
    }
  }
  if (bpIndex === 0) {
    
    for (const { cssRules, width } of mediaBps) {
      const index = breakpoints.indexOf (width);
      if (autoBreakpoints && index === 0) continue;
      cssRules.CSSRule = rules.CSSRule;
      parseRules(
        cssRules,
        index,//breakpoints ? index : -1,
        width
      );
    }
  }
}

function stripPseudoSelectors(selector) {
  return selector.replace(/::?[a-zA-Z0-9\-\_()]+/g, '');
}

function stripClassModifiers(selector) {
  return selector.replace(/\.[\w-]+/g, (cls) => {
    const base = cls.split(/--/)[0]; // Keep only base part
    return base;
  });
}

function stripAttributeSelectors(selector) {
  return selector.replace(/\[[^\]]+\]/g, '');
}

function stripToBaseSelector(selector) {
  return stripAttributeSelectors(
    stripClassModifiers(
      stripPseudoSelectors(selector)
    )
  ).trim();
}


function getJSON() {
  return {
    bps: breakpoints,
    fluidVariableSelectors,
  };
}
export { parseRules, getJSON };

let parsedRules = false;

/**
 * Observe the DOM for added *and* removed elements in one observer.
 *
 * @param {Object}   handlers
 * @param {function(Element[]):void} [handlers.onAdded]
 *   Called once per batch with an array of newly added Element nodes.
 * @param {function(Element[]):void} [handlers.onRemoved]
 *   Called once per batch with an array of removed Element nodes.
 * @param {Element|Document} [root=document.body]
 *   The subtree root to watch. Defaults to document.body.
 * @returns {MutationObserver}
 *   The observer instance (call .disconnect() to stop).
 */
function observeDomChanges(
  { onAdded = () => {}, onRemoved = () => {} },
  root = document.body
) {
  const observer = new MutationObserver((mutations) => {
    if (observerPaused) return;

    const added = [];
    const removed = [];

    for (const mutation of mutations) {
      // Collect added nodes
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          added.push(node, ...node.querySelectorAll('*'));
        }
      }
      // Collect removed nodes
      /*for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          removed.push(node, ...node.querySelectorAll('*'));
        }
      }*/
    }

    if (added.length > 0) onAdded(added);
    //if (removed.length > 0) onRemoved(removed);
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
  });

  return observer;
}

let fluidScale;
export { fluidScale };

export { FluidScale };

let jsonLoaded;
export async function loadJSON(path) {
  const originalPath = path;
  
  let config;
  try {
    const response = await fetch('/fluid-scale.config.json');
    if (response.ok) 
      config = await response.json();

    if (config)
      path = `/${config.outputDir}/${path}`;

  } catch (err) {
    console.warn(
      'Failed to load config. Runtime scan will be applied instead.'
    );
  }

  if (!config) return;
  if (!path.endsWith('.json')) path += '.json';

  try {
    const res = await fetch(path);

    const json = await res.text();

    const revived = JSON.parse(json, (key, value) => {
      if (value && value.__type__ === 'Map') {
        return new Map(value.value);
      }
      return value;
    });

    breakpoints = revived.bps;
    fluidVariableSelectors = revived.fluidVariableSelectors;
    jsonLoaded = originalPath;
  } catch (err) {
    console.warn('Failed to load JSON. Runtime scan will be applied instead.');
  }
}
function waitForJSON(path, checkInterval = 100) {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (jsonLoaded.includes(path)) {
        clearInterval(interval);
        resolve();
      }
    }, checkInterval);
  });
}

export function nodeInit({
  bps = 'auto',
  baseBreakpoint : baseBp = null,
  minBp,
  maxBp,
  usingPartials: usingPs = true,
  autoApply: autoApp = true,
  autoTransition: autoT = false,
  minMode = true,
  enableComments: customCmm = false,
}) {
  breakpoints = bps;
  baseBreakpoint = baseBp;
  minBreakpoint = minBp;
  maxBreakpoint = maxBp;
  usingPartials = usingPs;
  autoApply = autoApp;
  autoBreakpoints = bps === 'auto';
  autoTransition = autoT;
  minimizedMode = minMode;
  enableComments = customCmm;
}

export default async function init({
  autoObserve = true,
  root = autoObserve ? document.body : null,
  breakpoints: bps = 'auto',
  baseBreakpoint : baseBp, 
  minBreakpoint: minBp,
  maxBreakpoint: maxBp,
  usingPartials: usingPs,
  checkUsage = false,
  autoApply: autoApp,
  json = '',
  autoTransition: autoT,
  minimizedMode: minMode,
  enableComments: customCmm,
  forceGPU = false,
  updateRate : updateRt
} = {}) {
  autoBreakpoints = bps === 'auto';
  baseBreakpoint = baseBp;
  breakpoints = autoBreakpoints ? null : bps;
  minBreakpoint = minBp;
  maxBreakpoint = maxBp;
  if (typeof usingPs === 'boolean') usingPartials = usingPs;
  if (typeof autoApp === 'boolean') autoApply = autoApp;
  if (typeof autoT === 'boolean' || autoT) autoTransition = autoT;
  if (typeof minMode === 'boolean') minimizedMode = minMode;
  if (typeof customCmm === 'boolean') enableComments = customCmm;
  if (typeof updateRt === 'number') updateRate = updateRt;

  if (fluidScale) {
    fluidScale.autoTransition = autoTransition;
    if (json) {
      observerPaused = true;
      await loadJSON(json);
      observerPaused = false;
    }
    fluidScale.addElements(root);
  } else {
    const fs = await FluidScale.create (root, breakpoints, {
      minBp,
      maxBp,
      observeDestroy: false,
      checkUsage,
      json,
      autoTransition,
    });

    fluidScale = fs;

    if (autoObserve) {
      observeDomChanges({
        onAdded: (els) => fluidScale.addElements(els),
        onRemoved: (els) => fluidScale.removeElements(els),
      });
    }
  }

  return fluidScale;
}


function findMap(array, mapFn) {
  for (const item of array) {
    const result = mapFn(item);
    if (result) return result;
  }
  return undefined;
}

function containsDynamicPseudo(selector) {
  const dynamicPseudos = [
    ':hover',
    ':focus',
    ':active',
    ':visited',
    ':focus-visible',
    ':focus-within',
    ':target',
    ':checked',
    ':indeterminate',
    ':enabled',
    ':disabled',
    ':default',
    ':valid',
    ':invalid',
    ':user-invalid',
    ':required',
    ':optional',
    ':read-only',
    ':read-write',
    ':placeholder-shown'
  ];

  return dynamicPseudos.some(pseudo => selector.includes(pseudo));
}


function fluidEffect(ref, breakpoints = null, minBp = null, maxBp = null) {
  let fs = fluidScale;
  const prevBatch = useRef(null);
  React.useEffect(() => {
    if (prevBatch.current) {
      prevBatch.observer.disconnect();
      fs.removeElements(allEls);
    }

    if (ref.current) {
      const allEls = [ref.current, ...ref.current.querySelectorAll('*')];
      fs.addElements(allEls);
      const newBatch = {
        observer: observeDomChanges({
          onAdded: (els) => fs.addElements(els),
          onRemoved: (els) => fs.removeElements(els),
        }),
        container: ref.current,
        allEls,
      };
      prevBatch.current = newBatch;
    }
  }, [ref.current]);

  if (breakpoints) {
    useEffect(() => {
      fs = new FluidScale([], breakpoints, minBp, maxBp);

      return () => {
        fs.destroy();
      };
    }, []);
  }
}



function setInlineStyle (el, styles = {})
{
  if(!el.state)
    el.state = {};

const id = performance.now ();
  for(const [key, val] of Object.entries (styles))
  {
    const state = el.state[key] || {};
    state.inlineActive = true;

    state.inlineQueue = state.inlineQueue || new Map ();
    state.inlineQueue.set (id, val);

    el.state[key] = state;
    el.style.setProperty (key, val);
  }

  const inlineStyle = 
  {
    undo: () =>  { 
      const keys = Object.keys (styles);
      const toUndo = [];

      for(const key of keys)
      {
        const state = el.state[key];

        state.inlineQueue.delete (id);
        if(state.inlineQueue.size > 0)
        {
          const inlineQueueEntries = [...map.entries()];
          el.style.setProperty (key, inlineQueueEntries[inlineQueueEntries.length - 1]);
        }
        else 
        {
          toUndo.push (key);
        }
      }
      removeInlineStyle (el, toUndo)
    }
  }
  return  inlineStyle;
}

function removeInlineStyle (el, styles = [])
{
  for(const key of styles)
  {
    const state = el.state[key];
    state.inlineActive = false;
    el.style.removeProperty (key);
  }
}
export { fluidEffect, setInlineStyle, removeInlineStyle };

function getClassSelector(el) {
  return `${el.tagName.toLowerCase()}${el.className
    .split(/\s+/)
    .map((cls) => `.${cls}`)
    .join('')}`;
}
