/**
 * Statistical Functions for Quality Analysis
 * Uses simple-statistics and jstat libraries
 */

const ss = require('simple-statistics');

// ============ BASIC STATISTICS ============

const mean = (arr) => ss.mean(arr);
const stdDev = (arr) => ss.standardDeviation(arr);
const variance = (arr) => ss.variance(arr);
const min = (arr) => ss.min(arr);
const max = (arr) => ss.max(arr);
const median = (arr) => ss.median(arr);
const sum = (arr) => ss.sum(arr);

const skewness = (arr) => {
  const n = arr.length;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  const skew = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0) / n;
  return skew;
};

const kurtosis = (arr) => {
  const n = arr.length;
  const m = mean(arr);
  const s = stdDev(arr);
  if (s === 0) return 0;
  const kurt = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0) / n - 3;
  return kurt;
};

// ============ HISTOGRAM ============

const histogram = (arr, numBins = 10) => {
  const minVal = min(arr);
  const maxVal = max(arr);
  const binWidth = (maxVal - minVal) / numBins;

  const bins = [];
  for (let i = 0; i < numBins; i++) {
    bins.push({
      binStart: minVal + i * binWidth,
      binEnd: minVal + (i + 1) * binWidth,
      count: 0,
      label: `${(minVal + i * binWidth).toFixed(2)} - ${(minVal + (i + 1) * binWidth).toFixed(2)}`
    });
  }

  arr.forEach(val => {
    const binIndex = Math.min(Math.floor((val - minVal) / binWidth), numBins - 1);
    if (binIndex >= 0 && binIndex < numBins) {
      bins[binIndex].count++;
    }
  });

  return bins;
};

// ============ DISTRIBUTION FITTING ============

const normalPDF = (x, mu, sigma) => {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) *
         Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
};

const andersonDarling = (arr) => {
  const n = arr.length;
  const sorted = [...arr].sort((a, b) => a - b);
  const m = mean(arr);
  const s = stdDev(arr);

  // Standardize
  const z = sorted.map(x => (x - m) / s);

  // Calculate CDF using standard normal
  const phi = z.map(zi => 0.5 * (1 + erf(zi / Math.sqrt(2))));

  // Anderson-Darling statistic
  let A2 = 0;
  for (let i = 0; i < n; i++) {
    const p1 = Math.max(0.0001, Math.min(0.9999, phi[i]));
    const p2 = Math.max(0.0001, Math.min(0.9999, phi[n - 1 - i]));
    A2 += (2 * (i + 1) - 1) * (Math.log(p1) + Math.log(1 - p2));
  }
  A2 = -n - A2 / n;

  // Adjusted for estimated parameters
  A2adj = A2 * (1 + 0.75 / n + 2.25 / (n * n));

  // p-value approximation
  let pValue;
  if (A2adj >= 0.6) {
    pValue = Math.exp(1.2937 - 5.709 * A2adj + 0.0186 * A2adj * A2adj);
  } else if (A2adj >= 0.34) {
    pValue = Math.exp(0.9177 - 4.279 * A2adj - 1.38 * A2adj * A2adj);
  } else if (A2adj >= 0.2) {
    pValue = 1 - Math.exp(-8.318 + 42.796 * A2adj - 59.938 * A2adj * A2adj);
  } else {
    pValue = 1 - Math.exp(-13.436 + 101.14 * A2adj - 223.73 * A2adj * A2adj);
  }

  return { statistic: A2adj, pValue: Math.max(0, Math.min(1, pValue)) };
};

// Error function approximation
const erf = (x) => {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
};

// ============ PROCESS CAPABILITY ============

const processCapability = (arr, lsl, usl, target = null) => {
  const m = mean(arr);
  const s = stdDev(arr);
  const n = arr.length;

  // Short-term capability (Cp, Cpk)
  const cp = (usl - lsl) / (6 * s);
  const cpupper = (usl - m) / (3 * s);
  const cplower = (m - lsl) / (3 * s);
  const cpk = Math.min(cpupper, cplower);

  // Long-term performance (Pp, Ppk) - using sample std dev
  const sampleS = Math.sqrt(arr.reduce((acc, x) => acc + Math.pow(x - m, 2), 0) / (n - 1));
  const pp = (usl - lsl) / (6 * sampleS);
  const ppupper = (usl - m) / (3 * sampleS);
  const pplower = (m - lsl) / (3 * sampleS);
  const ppk = Math.min(ppupper, pplower);

  // Cpm (if target provided)
  let cpm = null;
  if (target !== null) {
    const tau = Math.sqrt(s * s + Math.pow(m - target, 2));
    cpm = (usl - lsl) / (6 * tau);
  }

  return {
    mean: m,
    stdDev: s,
    cp,
    cpk,
    cpupper,
    cplower,
    pp,
    ppk,
    ppupper,
    pplower,
    cpm,
    lsl,
    usl,
    target,
    n
  };
};

// ============ CONTROL CHARTS ============

const xbarRChart = (data, subgroupSize) => {
  const subgroups = [];
  for (let i = 0; i < data.length; i += subgroupSize) {
    const subgroup = data.slice(i, i + subgroupSize);
    if (subgroup.length === subgroupSize) {
      subgroups.push(subgroup);
    }
  }

  const xbars = subgroups.map(sg => mean(sg));
  const ranges = subgroups.map(sg => max(sg) - min(sg));

  const xbarBar = mean(xbars);
  const rBar = mean(ranges);

  // Control chart constants (for subgroup sizes 2-10)
  const A2 = [0, 0, 1.880, 1.023, 0.729, 0.577, 0.483, 0.419, 0.373, 0.337, 0.308];
  const D3 = [0, 0, 0, 0, 0, 0, 0, 0.076, 0.136, 0.184, 0.223];
  const D4 = [0, 0, 3.267, 2.574, 2.282, 2.114, 2.004, 1.924, 1.864, 1.816, 1.777];

  const a2 = A2[subgroupSize] || 0.577;
  const d3 = D3[subgroupSize] || 0;
  const d4 = D4[subgroupSize] || 2.114;

  return {
    xbar: {
      data: xbars,
      cl: xbarBar,
      ucl: xbarBar + a2 * rBar,
      lcl: xbarBar - a2 * rBar
    },
    r: {
      data: ranges,
      cl: rBar,
      ucl: d4 * rBar,
      lcl: d3 * rBar
    },
    subgroups: subgroups.length
  };
};

const imrChart = (data) => {
  const mr = [];
  for (let i = 1; i < data.length; i++) {
    mr.push(Math.abs(data[i] - data[i - 1]));
  }

  const xBar = mean(data);
  const mrBar = mean(mr);

  // d2 for n=2
  const d2 = 1.128;
  const D4 = 3.267;

  const sigma = mrBar / d2;

  return {
    individuals: {
      data: data,
      cl: xBar,
      ucl: xBar + 3 * sigma,
      lcl: xBar - 3 * sigma
    },
    mr: {
      data: mr,
      cl: mrBar,
      ucl: D4 * mrBar,
      lcl: 0
    }
  };
};

// ============ CORRELATION / REGRESSION ============

const correlation = (x, y) => {
  return ss.sampleCorrelation(x, y);
};

const linearRegression = (x, y) => {
  const reg = ss.linearRegression(x.map((xi, i) => [xi, y[i]]));
  const line = ss.linearRegressionLine(reg);

  const yPred = x.map(xi => line(xi));
  const yMean = mean(y);

  const ssRes = y.reduce((acc, yi, i) => acc + Math.pow(yi - yPred[i], 2), 0);
  const ssTot = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);

  const r2 = 1 - ssRes / ssTot;
  const r = Math.sqrt(r2) * (reg.m >= 0 ? 1 : -1);

  return {
    slope: reg.m,
    intercept: reg.b,
    r,
    r2,
    equation: `Y = ${reg.b.toFixed(4)} + ${reg.m.toFixed(4)}X`,
    predict: line
  };
};

// ============ GAGE R&R (ANOVA METHOD) ============

const gageRR = (data, partCol, operatorCol, measurementCol) => {
  // Group data
  const parts = [...new Set(data.map(d => d[partCol]))];
  const operators = [...new Set(data.map(d => d[operatorCol]))];
  const n = parts.length;
  const k = operators.length;

  // Calculate measurements per part/operator
  const measurements = {};
  let totalReps = 0;

  parts.forEach(p => {
    measurements[p] = {};
    operators.forEach(o => {
      measurements[p][o] = data
        .filter(d => d[partCol] === p && d[operatorCol] === o)
        .map(d => parseFloat(d[measurementCol]));
      if (measurements[p][o].length > totalReps) {
        totalReps = measurements[p][o].length;
      }
    });
  });

  const r = totalReps; // replications

  // Grand mean
  const allValues = data.map(d => parseFloat(d[measurementCol]));
  const grandMean = mean(allValues);

  // Part means
  const partMeans = {};
  parts.forEach(p => {
    const vals = data.filter(d => d[partCol] === p).map(d => parseFloat(d[measurementCol]));
    partMeans[p] = mean(vals);
  });

  // Operator means
  const operatorMeans = {};
  operators.forEach(o => {
    const vals = data.filter(d => d[operatorCol] === o).map(d => parseFloat(d[measurementCol]));
    operatorMeans[o] = mean(vals);
  });

  // Sum of squares
  let ssPart = 0, ssOperator = 0, ssInteraction = 0, ssError = 0;

  // SS Part
  parts.forEach(p => {
    ssPart += k * r * Math.pow(partMeans[p] - grandMean, 2);
  });

  // SS Operator
  operators.forEach(o => {
    ssOperator += n * r * Math.pow(operatorMeans[o] - grandMean, 2);
  });

  // SS Interaction and Error
  parts.forEach(p => {
    operators.forEach(o => {
      const cellMean = mean(measurements[p][o]);
      ssInteraction += r * Math.pow(cellMean - partMeans[p] - operatorMeans[o] + grandMean, 2);
      measurements[p][o].forEach(val => {
        ssError += Math.pow(val - cellMean, 2);
      });
    });
  });

  // Degrees of freedom
  const dfPart = n - 1;
  const dfOperator = k - 1;
  const dfInteraction = (n - 1) * (k - 1);
  const dfError = n * k * (r - 1);
  const dfTotal = n * k * r - 1;

  // Mean squares
  const msPart = ssPart / dfPart;
  const msOperator = ssOperator / dfOperator;
  const msInteraction = ssInteraction / dfInteraction;
  const msError = ssError / dfError;

  // Variance components
  const varRepeatability = msError;
  const varReproducibility = Math.max(0, (msOperator - msInteraction) / (n * r));
  const varInteraction = Math.max(0, (msInteraction - msError) / r);
  const varPart = Math.max(0, (msPart - msInteraction) / (k * r));

  const varGRR = varRepeatability + varReproducibility + varInteraction;
  const varTotal = varGRR + varPart;

  // Standard deviations
  const sigmaRepeatability = Math.sqrt(varRepeatability);
  const sigmaReproducibility = Math.sqrt(varReproducibility + varInteraction);
  const sigmaGRR = Math.sqrt(varGRR);
  const sigmaPart = Math.sqrt(varPart);
  const sigmaTotal = Math.sqrt(varTotal);

  // Percentages
  const pctRepeatability = (varRepeatability / varTotal) * 100;
  const pctReproducibility = ((varReproducibility + varInteraction) / varTotal) * 100;
  const pctGRR = (varGRR / varTotal) * 100;
  const pctPart = (varPart / varTotal) * 100;

  // Study variation (6 sigma)
  const svRepeatability = 6 * sigmaRepeatability;
  const svReproducibility = 6 * sigmaReproducibility;
  const svGRR = 6 * sigmaGRR;
  const svPart = 6 * sigmaPart;
  const svTotal = 6 * sigmaTotal;

  // % Study variation
  const pctSVRepeatability = (svRepeatability / svTotal) * 100;
  const pctSVReproducibility = (svReproducibility / svTotal) * 100;
  const pctSVGRR = (svGRR / svTotal) * 100;
  const pctSVPart = (svPart / svTotal) * 100;

  // Interpretation
  let interpretation;
  if (pctSVGRR < 10) {
    interpretation = 'ACCEPTABLE - Measurement system is acceptable';
  } else if (pctSVGRR <= 30) {
    interpretation = 'MARGINAL - May be acceptable based on application importance';
  } else {
    interpretation = 'UNACCEPTABLE - Measurement system needs improvement';
  }

  return {
    parts: n,
    operators: k,
    replications: r,
    anova: {
      part: { ss: ssPart, df: dfPart, ms: msPart },
      operator: { ss: ssOperator, df: dfOperator, ms: msOperator },
      interaction: { ss: ssInteraction, df: dfInteraction, ms: msInteraction },
      error: { ss: ssError, df: dfError, ms: msError }
    },
    variance: {
      repeatability: varRepeatability,
      reproducibility: varReproducibility,
      interaction: varInteraction,
      grr: varGRR,
      part: varPart,
      total: varTotal
    },
    contribution: {
      repeatability: pctRepeatability,
      reproducibility: pctReproducibility,
      grr: pctGRR,
      part: pctPart
    },
    studyVariation: {
      repeatability: { sv: svRepeatability, pct: pctSVRepeatability },
      reproducibility: { sv: svReproducibility, pct: pctSVReproducibility },
      grr: { sv: svGRR, pct: pctSVGRR },
      part: { sv: svPart, pct: pctSVPart }
    },
    interpretation
  };
};

// ============ PARETO ============

const paretoAnalysis = (data, categoryCol) => {
  // Count frequencies
  const counts = {};
  data.forEach(d => {
    const cat = d[categoryCol];
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Sort descending
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Calculate cumulative
  const total = sorted.reduce((acc, item) => acc + item.count, 0);
  let cumulative = 0;

  sorted.forEach(item => {
    cumulative += item.count;
    item.percentage = (item.count / total) * 100;
    item.cumulative = (cumulative / total) * 100;
  });

  return {
    data: sorted,
    total
  };
};

// ============ TAGUCHI DOE ============

const taguchiArrays = {
  L4: {
    runs: 4,
    factors: 3,
    levels: 2,
    array: [
      [1, 1, 1],
      [1, 2, 2],
      [2, 1, 2],
      [2, 2, 1]
    ]
  },
  L8: {
    runs: 8,
    factors: 7,
    levels: 2,
    array: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 2, 2, 2, 2],
      [1, 2, 2, 1, 1, 2, 2],
      [1, 2, 2, 2, 2, 1, 1],
      [2, 1, 2, 1, 2, 1, 2],
      [2, 1, 2, 2, 1, 2, 1],
      [2, 2, 1, 1, 2, 2, 1],
      [2, 2, 1, 2, 1, 1, 2]
    ]
  },
  L9: {
    runs: 9,
    factors: 4,
    levels: 3,
    array: [
      [1, 1, 1, 1],
      [1, 2, 2, 2],
      [1, 3, 3, 3],
      [2, 1, 2, 3],
      [2, 2, 3, 1],
      [2, 3, 1, 2],
      [3, 1, 3, 2],
      [3, 2, 1, 3],
      [3, 3, 2, 1]
    ]
  },
  L16: {
    runs: 16,
    factors: 15,
    levels: 2,
    array: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,2,2,2,2,2,2,2,2],
      [1,1,1,2,2,2,2,1,1,1,1,2,2,2,2],
      [1,1,1,2,2,2,2,2,2,2,2,1,1,1,1],
      [1,2,2,1,1,2,2,1,1,2,2,1,1,2,2],
      [1,2,2,1,1,2,2,2,2,1,1,2,2,1,1],
      [1,2,2,2,2,1,1,1,1,2,2,2,2,1,1],
      [1,2,2,2,2,1,1,2,2,1,1,1,1,2,2],
      [2,1,2,1,2,1,2,1,2,1,2,1,2,1,2],
      [2,1,2,1,2,1,2,2,1,2,1,2,1,2,1],
      [2,1,2,2,1,2,1,1,2,1,2,2,1,2,1],
      [2,1,2,2,1,2,1,2,1,2,1,1,2,1,2],
      [2,2,1,1,2,2,1,1,2,2,1,1,2,2,1],
      [2,2,1,1,2,2,1,2,1,1,2,2,1,1,2],
      [2,2,1,2,1,1,2,1,2,2,1,2,1,1,2],
      [2,2,1,2,1,1,2,2,1,1,2,1,2,2,1]
    ]
  }
};

const generateTaguchiArray = (arrayType) => {
  return taguchiArrays[arrayType] || null;
};

const calculateSNRatio = (values, type = 'nominal') => {
  const m = mean(values);
  const s = stdDev(values);
  const n = values.length;

  let sn;
  switch (type) {
    case 'smaller': // Smaller is better
      sn = -10 * Math.log10(values.reduce((acc, y) => acc + y * y, 0) / n);
      break;
    case 'larger': // Larger is better
      sn = -10 * Math.log10(values.reduce((acc, y) => acc + 1 / (y * y), 0) / n);
      break;
    case 'nominal': // Nominal is best
    default:
      sn = 10 * Math.log10((m * m) / (s * s));
      break;
  }

  return sn;
};

const analyzeTaguchi = (array, results, snType = 'nominal') => {
  const numFactors = array[0].length;
  const numLevels = Math.max(...array.flat());

  // Calculate S/N for each run
  const snRatios = results.map(r => calculateSNRatio(Array.isArray(r) ? r : [r], snType));

  // Calculate main effects
  const mainEffects = [];
  for (let f = 0; f < numFactors; f++) {
    const levels = {};
    for (let l = 1; l <= numLevels; l++) {
      levels[l] = [];
    }

    array.forEach((run, i) => {
      levels[run[f]].push(snRatios[i]);
    });

    const effect = {};
    Object.keys(levels).forEach(l => {
      effect[`level${l}`] = mean(levels[l]);
    });
    effect.range = Math.max(...Object.values(effect)) - Math.min(...Object.values(effect));
    mainEffects.push({ factor: f + 1, ...effect });
  }

  // Rank factors by effect size
  mainEffects.sort((a, b) => b.range - a.range);
  mainEffects.forEach((e, i) => e.rank = i + 1);

  return {
    snRatios,
    mainEffects,
    snType
  };
};

module.exports = {
  // Basic stats
  mean,
  stdDev,
  variance,
  min,
  max,
  median,
  sum,
  skewness,
  kurtosis,

  // Distribution
  histogram,
  normalPDF,
  andersonDarling,

  // Capability
  processCapability,

  // Control charts
  xbarRChart,
  imrChart,

  // Regression
  correlation,
  linearRegression,

  // Gage R&R
  gageRR,

  // Pareto
  paretoAnalysis,

  // Taguchi
  generateTaguchiArray,
  calculateSNRatio,
  analyzeTaguchi
};
