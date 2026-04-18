import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import * as statService from '../../services/statisticalService';
import { useTheme } from '../../context/ThemeContext';

Chart.register(...registerables);

const ARRAYS = [
  { id: 'L4', runs: 4, factors: 3, levels: 2, desc: 'Estudios pequeños, 3 factores a 2 niveles' },
  { id: 'L8', runs: 8, factors: 7, levels: 2, desc: 'Estudios medianos, hasta 7 factores a 2 niveles' },
  { id: 'L9', runs: 9, factors: 4, levels: 3, desc: 'Estudios con 3 niveles, 4 factores' },
  { id: 'L16', runs: 16, factors: 15, levels: 2, desc: 'Estudios grandes, hasta 15 factores' }
];

const STEPS = [
  { id: 1, title: 'Array Ortogonal', icon: '📐' },
  { id: 2, title: 'Factores', icon: '⚙️' },
  { id: 3, title: 'S/N y Réplicas', icon: '📊' },
  { id: 4, title: 'Resultados', icon: '📝' },
  { id: 5, title: 'Análisis', icon: '📈' }
];

// ============ STYLES ============
const btnStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.2s'
};

const helpBoxStyle = {
  padding: '15px',
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  marginBottom: '20px',
  border: '1px solid #bfdbfe'
};

const tipBoxStyle = {
  padding: '12px 15px',
  backgroundColor: '#fefce8',
  borderRadius: '6px',
  fontSize: '13px',
  border: '1px solid #fef08a'
};

const exampleBoxStyle = {
  padding: '12px 15px',
  backgroundColor: '#fdf4ff',
  borderRadius: '6px',
  fontSize: '13px',
  border: '1px solid #f0abfc',
  lineHeight: '1.6'
};

// Ejemplo Soba pre-fabricado
const SOBA_EXAMPLE = {
  arrayType: 'L9',
  factorNames: ['Tipo de Harina', 'Cantidad de Agua', 'Tiempo Amasado', 'Temp. Secado'],
  factorLevels: [
    ['Tipo A', 'Tipo B', 'Tipo C'],
    ['35%', '40%', '45%'],
    ['5 min', '10 min', '15 min'],
    ['50°C', '60°C', '70°C']
  ],
  snType: 'smaller',
  replications: 3,
  // Resultados: fideos rotos por lote (menor es mejor)
  results: [
    [12, 15, 11],  // Corrida 1
    [8, 6, 9],     // Corrida 2
    [14, 12, 16],  // Corrida 3
    [5, 4, 6],     // Corrida 4
    [18, 20, 17],  // Corrida 5
    [7, 8, 6],     // Corrida 6
    [9, 11, 10],   // Corrida 7
    [3, 4, 2],     // Corrida 8 (mejor resultado!)
    [13, 15, 14]   // Corrida 9
  ]
};

const TaguchiTab = () => {
  const { theme } = useTheme();

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '10px',
    color: theme.text
  };

  const selectStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: theme.bgCard,
    color: theme.text
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
    backgroundColor: theme.bgCard,
    color: theme.text
  };

  const thStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    borderBottom: `2px solid ${theme.border}`,
    fontWeight: '600',
    fontSize: '12px',
    color: theme.text
  };

  const tdStyle = {
    padding: '8px',
    borderBottom: `1px solid ${theme.border}`,
    fontSize: '13px'
  };

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [showExampleButton, setShowExampleButton] = useState(true);
  const [isUsingSobaExample, setIsUsingSobaExample] = useState(false);

  // Data states
  const [selectedArray, setSelectedArray] = useState('L9');
  const [arrayData, setArrayData] = useState(null);
  const [factorNames, setFactorNames] = useState([]);
  const [factorLevels, setFactorLevels] = useState([]); // [[level1, level2, level3], ...]
  const [results, setResults] = useState([]);
  const [replications, setReplications] = useState(2);
  const [snType, setSnType] = useState('nominal');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Noise Factors (optional)
  const [useNoiseFactors, setUseNoiseFactors] = useState(false);
  const [noiseFactorCount, setNoiseFactorCount] = useState(2);
  const [noiseFactorNames, setNoiseFactorNames] = useState(['', '']);
  const [noiseFactorLevels, setNoiseFactorLevels] = useState([['', ''], ['', '']]); // 2 levels per noise factor
  const [noiseConditions, setNoiseConditions] = useState([]); // Outer array combinations

  // Confirmation experiment
  const [confirmationResults, setConfirmationResults] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const meansChartRef = useRef(null);
  const meansChartInstance = useRef(null);
  const gainChartRef = useRef(null);
  const gainChartInstance = useRef(null);

  // Generate noise conditions (outer array) based on noise factor count
  const generateNoiseConditions = (numNoiseFactors) => {
    // For 2 noise factors with 2 levels each: 4 combinations
    // For 1 noise factor with 2 levels: 2 combinations
    const conditions = [];
    const numCombinations = Math.pow(2, numNoiseFactors);

    for (let i = 0; i < numCombinations; i++) {
      const condition = [];
      for (let j = 0; j < numNoiseFactors; j++) {
        // Extract bit j from i to determine level (1 or 2)
        const level = ((i >> (numNoiseFactors - 1 - j)) & 1) + 1;
        condition.push(level);
      }
      conditions.push(condition);
    }
    return conditions;
  };

  // Handle noise factor count change
  const handleNoiseFactorCountChange = (count) => {
    setNoiseFactorCount(count);
    setNoiseFactorNames(Array(count).fill('').map((_, i) => noiseFactorNames[i] || ''));
    setNoiseFactorLevels(Array(count).fill(null).map((_, i) => noiseFactorLevels[i] || ['', '']));
    setNoiseConditions(generateNoiseConditions(count));

    // Reset results to accommodate noise conditions
    if (arrayData) {
      const numConditions = Math.pow(2, count);
      setResults(Array(arrayData.runs).fill(null).map(() =>
        Array(numConditions).fill(null).map(() => Array(replications).fill(''))
      ));
    }
  };

  // Toggle noise factors on/off
  const handleNoiseFactorToggle = (enabled) => {
    setUseNoiseFactors(enabled);
    if (enabled) {
      setNoiseConditions(generateNoiseConditions(noiseFactorCount));
      // Restructure results for noise: [run][noiseCondition][replication]
      if (arrayData) {
        const numConditions = Math.pow(2, noiseFactorCount);
        setResults(Array(arrayData.runs).fill(null).map(() =>
          Array(numConditions).fill(null).map(() => Array(replications).fill(''))
        ));
      }
    } else {
      setNoiseConditions([]);
      // Reset to simple structure: [run][replication]
      if (arrayData) {
        setResults(Array(arrayData.runs).fill(null).map(() => Array(replications).fill('')));
      }
    }
  };

  // Cargar ejemplo Soba
  const loadSobaExample = async () => {
    setSelectedArray(SOBA_EXAMPLE.arrayType);
    await loadArray(SOBA_EXAMPLE.arrayType, SOBA_EXAMPLE.replications);
    setFactorNames(SOBA_EXAMPLE.factorNames);
    setFactorLevels(SOBA_EXAMPLE.factorLevels);
    setSnType(SOBA_EXAMPLE.snType);
    setReplications(SOBA_EXAMPLE.replications);
    setResults(SOBA_EXAMPLE.results);
    setShowExampleButton(false);
    setIsUsingSobaExample(true);
    setUseNoiseFactors(false); // Soba example doesn't use noise factors
    setCurrentStep(1);
  };

  // Guardar análisis
  const saveAnalysis = async () => {
    if (!analysis) return;

    setIsSaving(true);
    try {
      const analysisName = `Taguchi ${selectedArray}${useNoiseFactors ? ' (Robust)' : ''} - ${new Date().toLocaleDateString()}`;
      const parameters = {
        arrayType: selectedArray,
        factorNames,
        factorLevels,
        snType,
        replications
      };

      // Include noise factor info if used
      if (useNoiseFactors) {
        parameters.noiseFactors = {
          enabled: true,
          count: noiseFactorCount,
          names: noiseFactorNames,
          levels: noiseFactorLevels,
          conditions: noiseConditions
        };
      }

      const result = await statService.saveAnalysis({
        name: analysisName,
        analysisType: useNoiseFactors ? 'taguchi_robust' : 'taguchi',
        datasetId: null,
        parameters,
        results: {
          ...analysis,
          inputResults: results
        }
      });

      if (result.success) {
        setSavedMessage('✓ Análisis guardado');
        setTimeout(() => setSavedMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving analysis:', error);
      setSavedMessage('Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadArray(selectedArray, replications);
    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
      if (meansChartInstance.current) meansChartInstance.current.destroy();
      if (gainChartInstance.current) gainChartInstance.current.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (analysis && currentStep === 5) {
      renderChart();
      renderMeansChart();
      setTimeout(() => renderGainChart(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, currentStep]);

  const loadArray = async (arrayType, numReps = replications) => {
    try {
      const result = await statService.getTaguchiArray(arrayType);
      if (result.success) {
        const numLevels = result.data.levels;
        setArrayData(result.data);
        setFactorNames(Array(result.data.factors).fill('').map((_, i) => `Factor ${i + 1}`));
        // Initialize factor levels: each factor has 'numLevels' level values
        setFactorLevels(Array(result.data.factors).fill(null).map(() => Array(numLevels).fill('')));
        setResults(Array(result.data.runs).fill(null).map(() => Array(numReps).fill('')));
        setAnalysis(null);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleArrayChange = (arrayType) => {
    setSelectedArray(arrayType);
    setIsUsingSobaExample(false);
    loadArray(arrayType, replications);
  };

  const handleReplicationsChange = (numReps) => {
    setReplications(numReps);
    if (arrayData) {
      if (useNoiseFactors) {
        const numConditions = Math.pow(2, noiseFactorCount);
        setResults(Array(arrayData.runs).fill(null).map(() =>
          Array(numConditions).fill(null).map(() => Array(numReps).fill(''))
        ));
      } else {
        setResults(Array(arrayData.runs).fill(null).map(() => Array(numReps).fill('')));
      }
      setAnalysis(null);
    }
  };

  const runAnalysis = async () => {
    if (snType === 'nominal' && replications < 2 && !useNoiseFactors) {
      alert('Nominal is Best requiere al menos 2 réplicas por corrida para calcular varianza');
      return;
    }

    let numericResults;
    let hasEmpty = false;

    if (useNoiseFactors) {
      // With noise: results[run][noiseCondition][replication] -> flatten to results[run][all values]
      numericResults = results.map(runConditions => {
        const flatValues = [];
        runConditions.forEach(conditionReps => {
          conditionReps.forEach(r => {
            const val = parseFloat(r);
            if (isNaN(val)) hasEmpty = true;
            flatValues.push(val);
          });
        });
        return flatValues;
      });
    } else {
      numericResults = results.map(runReps => runReps.map(r => parseFloat(r)));
      hasEmpty = numericResults.some(runReps => runReps.some(v => isNaN(v)));
    }

    if (hasEmpty) {
      alert('Por favor ingresa todos los resultados de todas las réplicas');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        arrayType: selectedArray,
        results: numericResults,
        snType,
        factorNames
      };

      // Add noise factor info if enabled
      if (useNoiseFactors) {
        payload.noiseFactors = {
          enabled: true,
          count: noiseFactorCount,
          names: noiseFactorNames,
          levels: noiseFactorLevels,
          conditions: noiseConditions
        };
      }

      const result = await statService.analyzeTaguchi(payload);
      if (result.success) {
        setAnalysis(result.data);
        setCurrentStep(5);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current || !analysis) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const { mainEffects } = analysis;
    const numLevels = analysis.array?.levels || 2;

    // Colores para cada factor
    const factorColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    // Construir labels y datasets estilo Taguchi clásico
    // Cada factor tiene su propia sección con sus niveles
    const labels = [];
    const datasets = [];

    mainEffects.forEach((effect, factorIndex) => {
      const factorName = factorNames[effect.factor - 1] || `Factor ${effect.factor}`;
      const color = factorColors[factorIndex % factorColors.length];

      // Calcular posición base para este factor
      const basePosition = factorIndex * (numLevels + 1); // +1 para espacio entre factores

      // Labels para este factor
      for (let lvl = 1; lvl <= numLevels; lvl++) {
        const labelIndex = basePosition + (lvl - 1);
        labels[labelIndex] = lvl === 1 ? factorName : `N${lvl}`;
      }
      // Espacio vacío después del factor (excepto el último)
      if (factorIndex < mainEffects.length - 1) {
        labels[basePosition + numLevels] = '';
      }

      // Dataset para este factor (valores solo en su sección, null en el resto)
      const data = [];
      const totalPoints = mainEffects.length * (numLevels + 1) - 1;

      for (let i = 0; i < totalPoints; i++) {
        if (i >= basePosition && i < basePosition + numLevels) {
          const levelIndex = i - basePosition;
          if (levelIndex === 0) data.push(effect.level1);
          else if (levelIndex === 1) data.push(effect.level2);
          else if (levelIndex === 2 && numLevels === 3) data.push(effect.level3);
        } else {
          data.push(null);
        }
      }

      datasets.push({
        label: factorName,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0,
        spanGaps: false // No conectar a través de nulls
      });
    });

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Gráfico de Efectos Principales (S/N Ratio)',
            font: { size: 14, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 15 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.raw === null) return null;
                return `${context.dataset.label}: ${context.raw.toFixed(2)} dB`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              maxRotation: 0
            }
          },
          y: {
            title: { display: true, text: 'S/N Ratio (dB)', font: { weight: 'bold' } },
            grid: { color: theme.border }
          }
        }
      }
    });
  };

  // Calculate means for each factor level
  const calculateMeans = () => {
    if (!arrayData || !results || results.length === 0) return null;

    const numLevels = arrayData.levels;
    const numFactors = arrayData.factors;
    const means = [];

    // For each factor
    for (let f = 0; f < numFactors; f++) {
      const factorMeans = [];

      // For each level
      for (let lvl = 1; lvl <= numLevels; lvl++) {
        let sum = 0;
        let count = 0;

        // Find all runs where this factor has this level
        arrayData.array.forEach((row, runIndex) => {
          if (row[f] === lvl) {
            // Get all values for this run
            if (useNoiseFactors) {
              // 3D: results[run][condition][rep]
              results[runIndex]?.forEach(cond => {
                cond?.forEach(val => {
                  const numVal = parseFloat(val);
                  if (!isNaN(numVal)) {
                    sum += numVal;
                    count++;
                  }
                });
              });
            } else {
              // 2D: results[run][rep]
              results[runIndex]?.forEach(val => {
                const numVal = parseFloat(val);
                if (!isNaN(numVal)) {
                  sum += numVal;
                  count++;
                }
              });
            }
          }
        });

        factorMeans.push(count > 0 ? sum / count : 0);
      }

      means.push({
        factor: f + 1,
        levels: factorMeans
      });
    }

    return means;
  };

  const renderMeansChart = () => {
    if (!meansChartRef.current || !analysis) return;
    if (meansChartInstance.current) meansChartInstance.current.destroy();

    const means = calculateMeans();
    if (!means) return;

    const ctx = meansChartRef.current.getContext('2d');
    const numLevels = arrayData?.levels || 2;

    const factorColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

    const labels = [];
    const datasets = [];

    means.forEach((factorData, factorIndex) => {
      const factorName = factorNames[factorIndex] || `Factor ${factorIndex + 1}`;
      const color = factorColors[factorIndex % factorColors.length];

      const basePosition = factorIndex * (numLevels + 1);

      for (let lvl = 1; lvl <= numLevels; lvl++) {
        const labelIndex = basePosition + (lvl - 1);
        labels[labelIndex] = lvl === 1 ? factorName : `N${lvl}`;
      }
      if (factorIndex < means.length - 1) {
        labels[basePosition + numLevels] = '';
      }

      const data = [];
      const totalPoints = means.length * (numLevels + 1) - 1;

      for (let i = 0; i < totalPoints; i++) {
        if (i >= basePosition && i < basePosition + numLevels) {
          const levelIndex = i - basePosition;
          data.push(factorData.levels[levelIndex]);
        } else {
          data.push(null);
        }
      }

      datasets.push({
        label: factorName,
        data: data,
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        tension: 0,
        spanGaps: false
      });
    });

    meansChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Gráfico de Medias (Promedio por Nivel)',
            font: { size: 14, weight: 'bold' }
          },
          legend: {
            display: true,
            position: 'top',
            labels: { usePointStyle: true, padding: 15 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                if (context.raw === null) return null;
                return `${context.dataset.label}: ${context.raw.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 11 },
              maxRotation: 0
            }
          },
          y: {
            title: { display: true, text: 'Promedio', font: { weight: 'bold' } },
            grid: { color: theme.border }
          }
        }
      }
    });
  };

  // Calculate optimal S/N (sum of best levels) and current average S/N
  const calculateGainData = () => {
    if (!analysis || !analysis.mainEffects || !analysis.snRatios) return null;

    const snRatios = analysis.snRatios || [];
    const mainEffects = analysis.mainEffects || [];

    // Current average S/N (average of all experiments)
    const currentSN = snRatios.reduce((a, b) => a + b, 0) / snRatios.length;

    // Optimal S/N prediction (additive model)
    // S/N_optimal = overall_mean + sum of (best_level_effect - overall_mean) for each factor
    const overallMean = currentSN;

    let optimalSN = overallMean;
    const bestLevels = [];

    mainEffects.forEach((effect) => {
      const levels = [effect.level1, effect.level2];
      if (effect.level3 != null) levels.push(effect.level3);

      // For S/N, higher is always better
      const bestLevel = Math.max(...levels);
      const bestLevelIdx = levels.indexOf(bestLevel);

      bestLevels.push({
        factor: effect.factor,
        levelNum: bestLevelIdx + 1,
        levelValue: factorLevels[effect.factor - 1]?.[bestLevelIdx] || `Nivel ${bestLevelIdx + 1}`,
        snValue: bestLevel
      });

      // Add contribution of this factor
      const factorMean = levels.reduce((a, b) => a + b, 0) / levels.length;
      optimalSN += (bestLevel - factorMean);
    });

    // Gain = Optimal - Current
    const gain = optimalSN - currentSN;

    // Best and worst runs for comparison
    const bestRunIdx = snRatios.indexOf(Math.max(...snRatios));
    const worstRunIdx = snRatios.indexOf(Math.min(...snRatios));

    return {
      currentSN,
      optimalSN,
      gain,
      bestLevels,
      bestRunSN: snRatios[bestRunIdx],
      bestRunIdx: bestRunIdx + 1,
      worstRunSN: snRatios[worstRunIdx],
      worstRunIdx: worstRunIdx + 1
    };
  };

  // Calculate S/N for confirmation experiment
  const calculateConfirmationSN = () => {
    if (!confirmationResults || confirmationResults.length === 0) return null;

    const values = confirmationResults.map(v => parseFloat(v)).filter(v => !isNaN(v));
    if (values.length === 0) return null;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    let sn;
    if (snType === 'smaller') {
      // S/N = -10 * log10(mean of y²)
      const sumSquares = values.reduce((a, b) => a + b * b, 0);
      sn = -10 * Math.log10(sumSquares / n);
    } else if (snType === 'larger') {
      // S/N = -10 * log10(mean of 1/y²)
      const sumInvSquares = values.reduce((a, b) => a + 1 / (b * b), 0);
      sn = -10 * Math.log10(sumInvSquares / n);
    } else {
      // Nominal - S/N = 10 * log10(mean² / variance)
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
      sn = variance > 0 ? 10 * Math.log10((mean * mean) / variance) : 0;
    }

    return { sn, mean, values };
  };

  const renderGainChart = () => {
    if (!gainChartRef.current || !analysis) return;
    if (gainChartInstance.current) gainChartInstance.current.destroy();

    const gainData = calculateGainData();
    if (!gainData) return;

    const ctx = gainChartRef.current.getContext('2d');
    const confirmSN = calculateConfirmationSN();

    const labels = ['Peor Corrida', 'Promedio Actual', 'Mejor Corrida', 'Óptimo Predicho'];
    const data = [gainData.worstRunSN, gainData.currentSN, gainData.bestRunSN, gainData.optimalSN];
    const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

    if (confirmSN) {
      labels.push('Confirmación');
      data.push(confirmSN.sn);
      colors.push('#8b5cf6');
    }

    gainChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'S/N Ratio (dB)',
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c),
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '📈 Comparación: Actual vs Óptimo Esperado',
            font: { size: 14, weight: 'bold' }
          },
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `S/N: ${ctx.raw?.toFixed(2)} dB`
            }
          }
        },
        scales: {
          y: {
            title: { display: true, text: 'S/N Ratio (dB)', font: { weight: 'bold' } },
            grid: { color: theme.border }
          }
        }
      }
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return selectedArray && arrayData;
      case 2: return factorNames.every(n => n.trim() !== '');
      case 3: return snType && (snType !== 'nominal' || replications >= 2 || useNoiseFactors);
      case 4:
        if (useNoiseFactors) {
          // 3D structure: results[run][condition][replication]
          return results.every(run =>
            run && run.every(cond =>
              cond && cond.every(r => r !== '' && !isNaN(parseFloat(r)))
            )
          );
        } else {
          // 2D structure: results[run][replication]
          return results.every(run => run.every(r => r !== '' && !isNaN(parseFloat(r))));
        }
      case 5: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (currentStep < 5 && canProceed()) {
      if (currentStep === 4) {
        runAnalysis();
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const arrayInfo = ARRAYS.find(a => a.id === selectedArray);

  // ============ RENDER STEPS ============

  const renderStep1 = () => (
    <div>
      {/* Botón de ejemplo arriba */}
      {showExampleButton && (
        <div style={{
          marginBottom: '15px',
          padding: '12px 15px',
          backgroundColor: '#fdf4ff',
          borderRadius: '8px',
          border: '1px solid #e879f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '13px', color: '#86198f' }}>
            <strong>🍜 ¿Primera vez?</strong> Carga el ejemplo de fideos Soba para aprender paso a paso
          </span>
          <button
            onClick={loadSobaExample}
            style={{
              padding: '8px 16px',
              backgroundColor: '#d946ef',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}
          >
            Cargar Ejemplo
          </button>
        </div>
      )}

      {showExampleButton ? (
        <div style={helpBoxStyle}>
          <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🍜 La Historia de los Fideos Soba</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
            Un fabricante de fideos Soba en Japón tenía un problema: sus fideos se rompían muy seguido.
            El Dr. Taguchi lo ayudó a encontrar la receta perfecta <strong>sin tener que probar miles de combinaciones</strong>.
          </p>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
            En lugar de probar cada combinación posible (¡tomaría años!), Taguchi creó una "tabla mágica"
            llamada <strong>Array Ortogonal</strong> que permite probar solo unas pocas combinaciones inteligentes
            y descubrir qué ingredientes importan más.
          </p>
          <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
            <strong>🎯 ¿Qué haremos?</strong> Vamos a crear nuestra propia "tabla mágica" para tu proceso.
            Solo necesitas decidir cuántos ingredientes (factores) quieres probar.
          </div>
        </div>
      ) : (
        <div style={{
          marginBottom: '15px',
          padding: '12px 15px',
          backgroundColor: '#d1fae5',
          borderRadius: '8px',
          border: '1px solid #a7f3d0',
          fontSize: '13px',
          color: '#065f46'
        }}>
          <strong>✓ Ejemplo Soba cargado.</strong> Navega por los pasos para ver cómo se configuró el estudio.
        </div>
      )}

      <label style={labelStyle}>¿Cuántos factores quieres estudiar?</label>
      <div style={{ display: 'grid', gap: '10px' }}>
        {ARRAYS.map(arr => (
          <div
            key={arr.id}
            onClick={() => handleArrayChange(arr.id)}
            style={{
              padding: '15px',
              border: selectedArray === arr.id ? '2px solid #3b82f6' : `1px solid ${theme.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              backgroundColor: selectedArray === arr.id ? '#eff6ff' : theme.bgCard,
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '16px' }}>{arr.id}</span>
              <span style={{
                padding: '4px 8px',
                backgroundColor: selectedArray === arr.id ? '#3b82f6' : theme.bgPanel,
                color: selectedArray === arr.id ? 'white' : theme.textMuted,
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                {arr.runs} experimentos
              </span>
            </div>
            <div style={{ fontSize: '13px', color: theme.textMuted, marginTop: '5px' }}>
              Hasta <strong>{arr.factors} factores</strong> con {arr.levels} valores cada uno
            </div>
            <div style={{ fontSize: '12px', color: theme.textDim, marginTop: '3px', fontStyle: 'italic' }}>
              {arr.id === 'L4' && '→ Ideal para empezar: pocos factores, resultados rápidos'}
              {arr.id === 'L8' && '→ Balance perfecto: varios factores, experimentos manejables'}
              {arr.id === 'L9' && '→ Cuando necesitas 3 valores por factor (bajo/medio/alto)'}
              {arr.id === 'L16' && '→ Estudios completos: muchos factores a investigar'}
            </div>
          </div>
        ))}
      </div>

    </div>
  );

  const renderStep2 = () => (
    <div>
      <div style={helpBoxStyle}>
        <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🧪 ¿Qué ingredientes quieres probar?</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
          Los <strong>factores</strong> son las "perillas" que puedes ajustar en tu proceso.
          Piensa: "¿Qué cosas puedo cambiar que podrían afectar mi resultado?"
        </p>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
          Para cada factor, define los <strong>niveles</strong> que vas a probar.
          Por ejemplo: si tu factor es "Temperatura", tus niveles podrían ser "100°C" y "150°C".
        </p>
        <div style={{ backgroundColor: '#dbeafe', padding: '10px', borderRadius: '6px', fontSize: '12px' }}>
          <strong>🎯 ¿Qué haremos?</strong> Nombra cada factor y especifica qué valores vas a probar.
          Sé específico - esto te ayudará cuando hagas los experimentos.
        </div>
      </div>

      <div style={{ ...exampleBoxStyle, marginBottom: '15px' }}>
        <strong>🍜 En el ejemplo Soba:</strong><br/>
        • <strong>Harina:</strong> Tipo A | Tipo B | Tipo C<br/>
        • <strong>Agua:</strong> 35% | 40% | 45%<br/>
        • <strong>Amasado:</strong> 5 min | 10 min | 15 min<br/>
        • <strong>Secado:</strong> 50°C | 60°C | 70°C
      </div>

      <label style={labelStyle}>Define tus {arrayInfo?.factors} factores y sus niveles</label>

      <div style={{ display: 'grid', gap: '15px', maxHeight: '400px', overflow: 'auto' }}>
        {factorNames.slice(0, arrayInfo?.factors).map((name, i) => (
          <div key={i} style={{
            padding: '15px',
            backgroundColor: theme.bg,
            borderRadius: '8px',
            border: `1px solid ${theme.border}`
          }}>
            {/* Factor Name Row */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#3b82f6',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: '600',
                flexShrink: 0
              }}>
                F{i + 1}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const newNames = [...factorNames];
                  newNames[i] = e.target.value;
                  setFactorNames(newNames);
                }}
                placeholder={`Nombre del Factor ${i + 1} (ej: Temperatura, Presión)`}
                style={{ ...inputStyle, flex: 1, fontWeight: '500' }}
              />
            </div>

            {/* Level Values Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${arrayInfo?.levels || 2}, 1fr)`,
              gap: '10px',
              marginLeft: '42px'
            }}>
              {Array(arrayInfo?.levels || 2).fill().map((_, levelIndex) => (
                <div key={levelIndex}>
                  <label style={{
                    display: 'block',
                    fontSize: '11px',
                    fontWeight: '600',
                    marginBottom: '4px',
                    color: levelIndex === 0 ? '#dc2626' : levelIndex === 1 ? '#059669' : '#d97706'
                  }}>
                    Nivel {levelIndex + 1}
                  </label>
                  <input
                    type="text"
                    value={factorLevels[i]?.[levelIndex] || ''}
                    onChange={(e) => {
                      const newLevels = factorLevels.map(f => [...f]);
                      if (!newLevels[i]) {
                        newLevels[i] = Array(arrayInfo?.levels || 2).fill('');
                      }
                      newLevels[i][levelIndex] = e.target.value;
                      setFactorLevels(newLevels);
                    }}
                    placeholder={levelIndex === 0 ? 'Bajo (ej: 100°C)' : levelIndex === 1 ? 'Alto (ej: 150°C)' : 'Medio (ej: 125°C)'}
                    style={{
                      ...inputStyle,
                      fontSize: '12px',
                      padding: '8px 10px',
                      backgroundColor: levelIndex === 0 ? '#fef2f2' : levelIndex === 1 ? '#f0fdf4' : '#fffbeb',
                      border: `1px solid ${levelIndex === 0 ? '#fecaca' : levelIndex === 1 ? '#bbf7d0' : '#fde68a'}`
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...tipBoxStyle, marginTop: '15px' }}>
        <strong>💡 Tip:</strong> Sé específico con los valores de nivel. Ejemplo: "100°C" en lugar de "bajo".
        Esto te ayudará a replicar el experimento correctamente.
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={helpBoxStyle}>
        <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🎯 ¿Qué quieres lograr?</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
          Antes de hacer los experimentos, necesitamos saber qué estás buscando.
          ¿Quieres que algo sea más grande? ¿Más pequeño? ¿O exactamente un valor específico?
        </p>

        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px', border: '1px solid #fde68a' }}>
            <strong>🎯 Quiero un valor exacto</strong> (Nominal is Best)
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#92400e' }}>
              Ejemplo: "Quiero que el diámetro sea exactamente 10mm, ni más ni menos"
              <br/><em>⚠️ Necesitas repetir cada experimento al menos 2 veces</em>
            </p>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
            <strong>📉 Quiero el menor valor posible</strong> (Smaller is Better)
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#065f46' }}>
              Ejemplo: "Quiero menos defectos", "Quiero menos tiempo de espera", "Quiero menos desperdicio"
            </p>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
            <strong>📈 Quiero el mayor valor posible</strong> (Larger is Better)
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#1e40af' }}>
              Ejemplo: "Quiero más resistencia", "Quiero más eficiencia", "Quiero más durabilidad"
            </p>
          </div>
        </div>
      </div>

      <div style={{ ...exampleBoxStyle, marginBottom: '15px' }}>
        <strong>🍜 En el ejemplo Soba:</strong> El fabricante quería que sus fideos
        se rompieran <strong>lo menos posible</strong>, así que eligió "Smaller is Better"
        (mientras menos fideos rotos, mejor).
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Tipo de S/N</label>
        <select
          value={snType}
          onChange={(e) => {
            const newType = e.target.value;
            setSnType(newType);
            if (newType === 'nominal' && replications < 2) {
              handleReplicationsChange(2);
            }
          }}
          style={selectStyle}
        >
          <option value="nominal">Nominal is Best (objetivo específico)</option>
          <option value="smaller">Smaller is Better (minimizar)</option>
          <option value="larger">Larger is Better (maximizar)</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>
          ¿Cuántas veces repetirás cada experimento?
          {snType === 'nominal' && <span style={{ color: '#dc2626', marginLeft: '5px' }}>*mínimo 2</span>}
        </label>
        <select
          value={replications}
          onChange={(e) => handleReplicationsChange(parseInt(e.target.value))}
          style={selectStyle}
        >
          {snType !== 'nominal' && <option value={1}>1 vez (sin repetir)</option>}
          <option value={2}>2 veces</option>
          <option value={3}>3 veces (recomendado)</option>
          <option value={4}>4 veces</option>
          <option value={5}>5 veces</option>
        </select>
        <p style={{ fontSize: '12px', color: theme.textMuted, marginTop: '8px', lineHeight: '1.5' }}>
          💡 <strong>¿Por qué repetir?</strong> Si haces un experimento una sola vez, no sabes si el resultado
          fue suerte o realidad. Repitiendo 2-3 veces confirmas que el resultado es confiable.
        </p>
      </div>

      <div style={{ ...tipBoxStyle }}>
        <strong>🎯 Resumen:</strong> Harás <strong>{arrayData?.runs || 9} experimentos</strong> diferentes,
        cada uno repetido <strong>{replications} {replications > 1 ? 'veces' : 'vez'}</strong>.
        Total: <strong>{(arrayData?.runs || 9) * replications} mediciones</strong>.
      </div>

      {/* Optional Noise Factors Section - Super Friendly */}
      <div style={{
        marginTop: '25px',
        padding: '20px',
        backgroundColor: '#fefce8',
        borderRadius: '12px',
        border: '2px solid #fbbf24'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🎲</span>
            <div>
              <h4 style={{ margin: '0', color: '#92400e', fontSize: '15px' }}>
                ¿Quieres una receta "a prueba de todo"?
              </h4>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#a16207' }}>
                Opcional - Solo si quieres ir más allá
              </p>
            </div>
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            padding: '8px 16px',
            backgroundColor: useNoiseFactors ? '#22c55e' : '#e5e7eb',
            borderRadius: '20px',
            transition: 'all 0.2s'
          }}>
            <input
              type="checkbox"
              checked={useNoiseFactors}
              onChange={(e) => handleNoiseFactorToggle(e.target.checked)}
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '13px', fontWeight: '600', color: useNoiseFactors ? 'white' : theme.textDim }}>
              {useNoiseFactors ? '✓ Activado' : 'Activar'}
            </span>
          </label>
        </div>

        {!useNoiseFactors && (
          <div style={{
            padding: '15px',
            backgroundColor: theme.bgCard,
            borderRadius: '8px',
            border: '1px dashed #fbbf24'
          }}>
            <div style={{ fontSize: '13px', lineHeight: '1.7', color: '#78350f' }}>
              <strong>🤔 ¿Qué es esto?</strong>
              <p style={{ margin: '8px 0' }}>
                Imagina que encontraste la receta perfecta de galletas en tu cocina...
                pero cuando las haces en casa de tu abuela, ¡salen diferentes!
              </p>
              <p style={{ margin: '8px 0' }}>
                ¿Por qué? Porque hay cosas que <strong>no puedes controlar</strong>:
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '10px 0' }}>
                <span style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '12px', fontSize: '12px' }}>🌡️ El horno es diferente</span>
                <span style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '12px', fontSize: '12px' }}>💧 La humedad del día</span>
                <span style={{ padding: '4px 10px', backgroundColor: '#fef3c7', borderRadius: '12px', fontSize: '12px' }}>🥛 Otra marca de leche</span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontWeight: '500', color: '#059669' }}>
                👆 Activa esto para encontrar una receta que funcione <strong>siempre</strong>,
                sin importar estos "imprevistos".
              </p>
            </div>
          </div>
        )}

        {useNoiseFactors && (
          <>
            <div style={{
              padding: '12px 15px',
              backgroundColor: '#dcfce7',
              borderRadius: '8px',
              marginBottom: '15px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>💪</span>
              <span>
                <strong>¡Genial!</strong> Ahora buscaremos la configuración más <strong>"resistente"</strong> -
                que funcione bien aunque las condiciones cambien.
              </span>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🎯</span>
                ¿Cuántas cosas "incontrolables" quieres simular?
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1, 2, 3].map(num => (
                  <button
                    key={num}
                    onClick={() => handleNoiseFactorCountChange(num)}
                    style={{
                      padding: '12px 20px',
                      border: noiseFactorCount === num ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: noiseFactorCount === num ? '#fef3c7' : 'white',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: noiseFactorCount === num ? '600' : '400'
                    }}
                  >
                    {num} {num === 1 ? 'cosa' : 'cosas'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {Array(noiseFactorCount).fill().map((_, nfIndex) => (
                <div key={nfIndex} style={{
                  padding: '15px',
                  backgroundColor: theme.bgCard,
                  borderRadius: '10px',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px'
                    }}>
                      {nfIndex === 0 ? '🌡️' : nfIndex === 1 ? '💧' : '📦'}
                    </span>
                    <input
                      type="text"
                      value={noiseFactorNames[nfIndex] || ''}
                      onChange={(e) => {
                        const newNames = [...noiseFactorNames];
                        newNames[nfIndex] = e.target.value;
                        setNoiseFactorNames(newNames);
                      }}
                      placeholder={
                        nfIndex === 0 ? '¿Qué cosa no puedes controlar? (ej: Temperatura del día)' :
                        nfIndex === 1 ? 'Otra cosa incontrolable (ej: Humedad)' :
                        'Una más (ej: Lote de material)'
                      }
                      style={{ ...inputStyle, flex: 1, fontSize: '13px', fontWeight: '500' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginLeft: '42px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#3b82f6' }}>
                        ❄️ Cuando está BAJO
                      </label>
                      <input
                        type="text"
                        value={noiseFactorLevels[nfIndex]?.[0] || ''}
                        onChange={(e) => {
                          const newLevels = noiseFactorLevels.map(l => [...l]);
                          if (!newLevels[nfIndex]) newLevels[nfIndex] = ['', ''];
                          newLevels[nfIndex][0] = e.target.value;
                          setNoiseFactorLevels(newLevels);
                        }}
                        placeholder="ej: Día frío (15°C)"
                        style={{ ...inputStyle, fontSize: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: '#ef4444' }}>
                        🔥 Cuando está ALTO
                      </label>
                      <input
                        type="text"
                        value={noiseFactorLevels[nfIndex]?.[1] || ''}
                        onChange={(e) => {
                          const newLevels = noiseFactorLevels.map(l => [...l]);
                          if (!newLevels[nfIndex]) newLevels[nfIndex] = ['', ''];
                          newLevels[nfIndex][1] = e.target.value;
                          setNoiseFactorLevels(newLevels);
                        }}
                        placeholder="ej: Día caluroso (35°C)"
                        style={{ ...inputStyle, fontSize: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '15px',
              padding: '12px 15px',
              backgroundColor: '#f0fdf4',
              borderRadius: '8px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>📋</span>
              <span>
                <strong>Plan:</strong> Probaremos cada receta en <strong>{Math.pow(2, noiseFactorCount)} situaciones</strong> diferentes
                ({noiseFactorCount === 1 ? 'bajo y alto' : noiseFactorCount === 2 ? 'todas las combinaciones de ambas cosas' : 'todas las combinaciones posibles'}).
                <br/>
                <span style={{ color: theme.textMuted, fontSize: '12px' }}>
                  Total: {arrayData?.runs || 9} recetas × {Math.pow(2, noiseFactorCount)} situaciones × {replications} repeticiones = {(arrayData?.runs || 9) * Math.pow(2, noiseFactorCount) * replications} pruebas
                </span>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const numNoiseConditions = useNoiseFactors ? Math.pow(2, noiseFactorCount) : 0;

    return (
    <div>
      <div style={helpBoxStyle}>
        <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🔬 ¡Hora de experimentar!</h4>
        <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
          Esta tabla te dice exactamente qué combinación usar en cada experimento.
          Solo sigue las instrucciones fila por fila:
        </p>
        <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
          <li><strong>Lee la fila:</strong> Cada fila te dice qué valor usar para cada factor</li>
          <li><strong>Configura tu proceso:</strong> Ajusta todo según los valores de esa fila</li>
          <li><strong>Ejecuta y mide:</strong> Haz el experimento y anota el resultado</li>
          <li><strong>Repite:</strong> Hazlo {replications} {replications > 1 ? 'veces' : 'vez'} para estar seguro</li>
        </ol>
      </div>

      {useNoiseFactors && (
        <div style={{
          marginBottom: '15px',
          padding: '15px',
          backgroundColor: '#fefce8',
          borderRadius: '12px',
          border: '2px solid #fbbf24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎲</span>
            <strong style={{ color: '#92400e', fontSize: '14px' }}>
              Situaciones a probar (condiciones "difíciles"):
            </strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {noiseConditions.map((condition, condIdx) => (
              <div key={condIdx} style={{
                padding: '10px 14px',
                backgroundColor: theme.bgCard,
                borderRadius: '8px',
                border: '1px solid #fde68a',
                fontSize: '12px',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '5px' }}>
                  Situación {condIdx + 1}
                </div>
                {condition.map((level, nfIdx) => {
                  const levelValue = noiseFactorLevels[nfIdx]?.[level - 1] || (level === 1 ? 'Bajo' : 'Alto');
                  return (
                    <div key={nfIdx} style={{ fontSize: '11px', color: theme.textMuted }}>
                      {level === 1 ? '❄️' : '🔥'} {noiseFactorNames[nfIdx] || `Variable ${nfIdx + 1}`}: <strong style={{ color: level === 1 ? '#3b82f6' : '#ef4444' }}>{levelValue}</strong>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#78350f', lineHeight: '1.5' }}>
            👆 Cada receta se probará en <strong>todas</strong> estas situaciones.
            Así encontramos cuál funciona mejor <strong>sin importar</strong> lo que pase.
          </p>
        </div>
      )}

      <div style={{ ...exampleBoxStyle, marginBottom: '15px' }}>
        <strong>🍜 En el ejemplo Soba:</strong> En la corrida 1, el fabricante usó Harina A, 35% agua,
        5 min de amasado y 50°C de secado. Hizo 3 lotes de fideos con esa receta y contó cuántos se rompieron en cada lote.
      </div>

      <label style={labelStyle}>
        Matriz de Experimentos - {arrayData?.runs} corridas
        {useNoiseFactors && ` × ${numNoiseConditions} condiciones de ruido`}
        {` × ${replications} réplicas`}
      </label>

      <div style={{
        maxHeight: '400px',
        overflow: 'auto',
        border: `1px solid ${theme.border}`,
        borderRadius: '8px',
        backgroundColor: theme.bgCard
      }}>
        {useNoiseFactors ? (
          /* Table WITH Noise Factors */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: theme.bgPanel, position: 'sticky', top: 0, zIndex: 2 }}>
                <th style={{ ...thStyle, rowSpan: 2 }}>Corrida</th>
                {factorNames.slice(0, arrayInfo?.factors).map((name, i) => (
                  <th key={i} style={{ ...thStyle, rowSpan: 2 }} title={factorLevels[i]?.filter(l => l).join(' | ') || name}>
                    {name.length > 8 ? name.substring(0, 8) + '..' : name}
                  </th>
                ))}
                {noiseConditions.map((_, condIdx) => (
                  <th
                    key={`cond${condIdx}`}
                    colSpan={replications}
                    style={{
                      ...thStyle,
                      backgroundColor: condIdx % 2 === 0 ? '#fef3c7' : '#fde68a',
                      textAlign: 'center',
                      borderLeft: '2px solid #d97706'
                    }}
                  >
                    C{condIdx + 1}
                  </th>
                ))}
              </tr>
              <tr style={{ backgroundColor: theme.bgPanel, position: 'sticky', top: '33px', zIndex: 1 }}>
                {noiseConditions.map((_, condIdx) => (
                  Array(replications).fill().map((__, repIdx) => (
                    <th
                      key={`cond${condIdx}-rep${repIdx}`}
                      style={{
                        ...thStyle,
                        backgroundColor: condIdx % 2 === 0 ? '#dbeafe' : '#bfdbfe',
                        fontSize: '10px',
                        padding: '4px'
                      }}
                    >
                      R{repIdx + 1}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {arrayData?.array.map((row, runIndex) => (
                <tr key={runIndex} style={{ backgroundColor: runIndex % 2 === 0 ? theme.bgCard : theme.bg }}>
                  <td style={{ ...tdStyle, fontWeight: '600', textAlign: 'center' }}>{runIndex + 1}</td>
                  {row.slice(0, arrayInfo?.factors).map((val, j) => {
                    const levelValue = factorLevels[j]?.[val - 1];
                    const displayValue = levelValue && levelValue.trim() !== '' ? levelValue : `N${val}`;
                    return (
                      <td key={j} style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            backgroundColor: val === 1 ? '#fee2e2' : val === 2 ? '#d1fae5' : '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '10px',
                            display: 'inline-block',
                            maxWidth: '60px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={`${factorNames[j]}: ${displayValue}`}
                        >
                          {displayValue}
                        </span>
                      </td>
                    );
                  })}
                  {noiseConditions.map((_, condIdx) => (
                    Array(replications).fill().map((__, repIdx) => (
                      <td
                        key={`cond${condIdx}-rep${repIdx}`}
                        style={{
                          ...tdStyle,
                          padding: '3px',
                          borderLeft: repIdx === 0 ? '2px solid #d97706' : 'none'
                        }}
                      >
                        <input
                          type="number"
                          value={results[runIndex]?.[condIdx]?.[repIdx] || ''}
                          onChange={(e) => {
                            const newResults = results.map(run =>
                              run.map(cond => [...cond])
                            );
                            if (!newResults[runIndex]) {
                              newResults[runIndex] = Array(numNoiseConditions).fill(null).map(() => Array(replications).fill(''));
                            }
                            if (!newResults[runIndex][condIdx]) {
                              newResults[runIndex][condIdx] = Array(replications).fill('');
                            }
                            newResults[runIndex][condIdx][repIdx] = e.target.value;
                            setResults(newResults);
                          }}
                          style={{
                            width: '50px',
                            padding: '4px',
                            fontSize: '11px',
                            border: `1px solid ${theme.border}`,
                            borderRadius: '3px',
                            textAlign: 'center'
                          }}
                          step="any"
                          placeholder="0"
                        />
                      </td>
                    ))
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Table WITHOUT Noise Factors (original) */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: theme.bgPanel, position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={thStyle}>Corrida</th>
                {factorNames.slice(0, arrayInfo?.factors).map((name, i) => (
                  <th key={i} style={thStyle} title={factorLevels[i]?.filter(l => l).join(' | ') || name}>
                    {name.length > 10 ? name.substring(0, 10) + '...' : name}
                  </th>
                ))}
                {Array(replications).fill().map((_, i) => (
                  <th key={`rep${i}`} style={{ ...thStyle, backgroundColor: '#dbeafe' }}>
                    R{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {arrayData?.array.map((row, runIndex) => (
                <tr key={runIndex} style={{ backgroundColor: runIndex % 2 === 0 ? theme.bgCard : theme.bg }}>
                  <td style={{ ...tdStyle, fontWeight: '600', textAlign: 'center' }}>{runIndex + 1}</td>
                  {row.slice(0, arrayInfo?.factors).map((val, j) => {
                    const levelValue = factorLevels[j]?.[val - 1];
                    const displayValue = levelValue && levelValue.trim() !== '' ? levelValue : `N${val}`;
                    return (
                      <td key={j} style={{ ...tdStyle, textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            backgroundColor: val === 1 ? '#fee2e2' : val === 2 ? '#d1fae5' : '#fef3c7',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'inline-block',
                            maxWidth: '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={`${factorNames[j]}: ${displayValue}`}
                        >
                          {displayValue}
                        </span>
                      </td>
                    );
                  })}
                  {Array(replications).fill().map((_, repIndex) => (
                    <td key={`rep${repIndex}`} style={{ ...tdStyle, padding: '4px' }}>
                      <input
                        type="number"
                        value={results[runIndex]?.[repIndex] || ''}
                        onChange={(e) => {
                          const newResults = results.map(r => [...r]);
                          if (!newResults[runIndex]) {
                            newResults[runIndex] = Array(replications).fill('');
                          }
                          newResults[runIndex][repIndex] = e.target.value;
                          setResults(newResults);
                        }}
                        style={{
                          width: '65px',
                          padding: '6px',
                          fontSize: '12px',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '4px',
                          textAlign: 'center'
                        }}
                        step="any"
                        placeholder="0.00"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ ...tipBoxStyle, marginTop: '15px' }}>
        <strong>💡 Consejo profesional:</strong> Si puedes, ejecuta las corridas en <strong>orden aleatorio</strong>
        (no de la 1 a la 9 en orden). Esto evita que factores externos (como el cansancio del operador
        o cambios de temperatura durante el día) afecten tus resultados.
      </div>
    </div>
  );
  };

  const renderStep5 = () => (
    <div>
      {analysis ? (
        <>
          <div style={helpBoxStyle}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e40af' }}>🏆 ¡Resultados listos!</h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', lineHeight: '1.6' }}>
              El análisis está completo. Aquí descubrirás <strong>qué factores importan más</strong>
              y <strong>qué valores usar</strong> para obtener el mejor resultado.
            </p>
          </div>

          {/* Charts Stacked Vertically */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
            {/* Chart 1: Means */}
            <div style={{
              padding: '15px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              border: '2px solid #86efac'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📊</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#166534' }}>Gráfico de Medias</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#15803d' }}>¿Qué nivel da mejor resultado promedio?</p>
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: '#166534'
                }}>
                  💡 Busca el punto más <strong>{snType === 'smaller' ? 'BAJO ↓' : snType === 'larger' ? 'ALTO ↑' : 'cercano al objetivo'}</strong>
                </div>
              </div>
              <div style={{ height: '280px', backgroundColor: theme.bgCard, borderRadius: '8px', padding: '10px' }}>
                <canvas ref={meansChartRef}></canvas>
              </div>
            </div>

            {/* Chart 2: S/N Ratio */}
            <div style={{
              padding: '15px',
              backgroundColor: '#eff6ff',
              borderRadius: '12px',
              border: '2px solid #93c5fd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🎯</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', color: '#1e40af' }}>Gráfico S/N (Consistencia)</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#2563eb' }}>¿Qué nivel da resultados más confiables?</p>
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  backgroundColor: '#dbeafe',
                  borderRadius: '20px',
                  fontSize: '11px',
                  color: '#1e40af'
                }}>
                  💡 Busca el punto más <strong>ALTO ↑</strong> (menos variación)
                </div>
              </div>
              <div style={{ height: '280px', backgroundColor: theme.bgCard, borderRadius: '8px', padding: '10px' }}>
                <canvas ref={chartRef}></canvas>
              </div>
            </div>
          </div>

          {/* How to interpret - friendly */}
          <div style={{
            padding: '15px',
            backgroundColor: '#fefce8',
            borderRadius: '12px',
            border: '2px solid #fde047',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🤔</span>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                <strong style={{ color: '#854d0e' }}>¿Cómo leer estos gráficos?</strong>
                <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', color: '#78350f' }}>
                  <li><strong>Línea muy inclinada</strong> = Ese factor importa MUCHO (¡pon atención!)</li>
                  <li><strong>Línea casi plana</strong> = Ese factor casi no afecta (puedes elegir el más barato)</li>
                  <li><strong>Punto más alto en S/N</strong> = Resultado más confiable y consistente</li>
                  <li><strong>Punto óptimo en Medias</strong> = Mejor resultado promedio</li>
                </ul>
                <p style={{ margin: '10px 0 0 0', padding: '8px', backgroundColor: '#fef9c3', borderRadius: '6px' }}>
                  🎯 <strong>Ideal:</strong> Cuando el mejor nivel coincide en AMBOS gráficos, ¡esa es tu configuración ganadora!
                </p>
              </div>
            </div>
          </div>

          {/* S/N Ratios */}
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Ratios S/N por Corrida</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
            {(analysis.snRatios || []).map((sn, i) => (
              <div key={i} style={{
                padding: '8px 12px',
                backgroundColor: theme.bg,
                borderRadius: '6px',
                fontSize: '12px',
                border: `1px solid ${theme.border}`
              }}>
                <span style={{ color: theme.textMuted }}>Corrida {i + 1}:</span>
                <span style={{ fontWeight: '600', marginLeft: '5px', color: sn > 0 ? '#059669' : '#dc2626' }}>
                  {sn != null && !isNaN(sn) ? sn.toFixed(2) : '-'} dB
                </span>
              </div>
            ))}
          </div>

          {/* Main Effects Table */}
          <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Efectos Principales (Ordenados por Influencia)</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: theme.bgPanel }}>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Factor</th>
                <th style={thStyle}>Nivel 1</th>
                <th style={thStyle}>Nivel 2</th>
                {analysis.array?.levels === 3 && <th style={thStyle}>Nivel 3</th>}
                <th style={thStyle}>Range</th>
              </tr>
            </thead>
            <tbody>
              {(analysis.mainEffects || []).map((effect, i) => (
                <tr key={i} style={{ backgroundColor: i === 0 ? '#dcfce7' : theme.bgCard }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      backgroundColor: i === 0 ? '#059669' : '#9ca3af',
                      color: 'white',
                      borderRadius: '50%',
                      lineHeight: '24px',
                      fontSize: '12px'
                    }}>
                      {effect?.rank ?? '-'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>
                    {factorNames[effect?.factor - 1] || `Factor ${effect?.factor || '?'}`}
                  </td>
                  <td style={tdStyle}>{effect?.level1 != null ? effect.level1.toFixed(3) : '-'}</td>
                  <td style={tdStyle}>{effect?.level2 != null ? effect.level2.toFixed(3) : '-'}</td>
                  {analysis.array?.levels === 3 && (
                    <td style={tdStyle}>{effect?.level3 != null ? effect.level3.toFixed(3) : '-'}</td>
                  )}
                  <td style={{ ...tdStyle, fontWeight: '600' }}>
                    {effect?.range != null ? effect.range.toFixed(3) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Noise Factors Summary - Friendly */}
          {useNoiseFactors && (
            <div style={{
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: '#fefce8',
              borderRadius: '12px',
              border: '2px solid #fbbf24'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>💪</span>
                <h4 style={{ margin: '0', color: '#92400e', fontSize: '15px' }}>
                  ¡Análisis de Robustez Incluido!
                </h4>
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#78350f' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  Probamos cada configuración bajo diferentes condiciones "difíciles":
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {noiseFactorNames.map((name, idx) => (
                    <span key={idx} style={{
                      padding: '6px 12px',
                      backgroundColor: theme.bgCard,
                      borderRadius: '16px',
                      border: '1px solid #fde68a',
                      fontSize: '12px'
                    }}>
                      {idx === 0 ? '🌡️' : idx === 1 ? '💧' : '📦'} {name || `Variable ${idx + 1}`}
                    </span>
                  ))}
                </div>
                <p style={{ margin: '0', padding: '10px', backgroundColor: '#fef9c3', borderRadius: '6px' }}>
                  🎯 <strong>La configuración ganadora</strong> es la que funciona bien
                  <strong> aunque las condiciones cambien</strong> - no solo en el laboratorio,
                  ¡sino en la vida real!
                </p>
              </div>
            </div>
          )}

          {/* SUPER DIDACTIC Interpretation Box */}
          <div style={{
            padding: '20px',
            backgroundColor: '#f0fdf4',
            borderRadius: '12px',
            border: '2px solid #86efac'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '28px' }}>🎓</span>
              <h4 style={{ margin: 0, color: '#166534', fontSize: '18px' }}>¿Cómo interpretar estos resultados?</h4>
            </div>

            {/* Step 1: What is Range */}
            <div style={{
              padding: '15px',
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              marginBottom: '15px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{
                  width: '28px', height: '28px', backgroundColor: '#3b82f6', color: 'white',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '600'
                }}>1</span>
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>¿Qué significa el "Range" (Rango)?</strong>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', lineHeight: '1.6', color: theme.text, paddingLeft: '36px' }}>
                El <strong>Range</strong> te dice <strong>qué tanto importa cada factor</strong>.
                Es la diferencia entre el mejor y peor nivel de ese factor.
              </p>
              <div style={{ display: 'flex', gap: '10px', paddingLeft: '36px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 12px', backgroundColor: '#dcfce7', borderRadius: '8px', fontSize: '12px' }}>
                  📈 <strong>Range GRANDE</strong> = ¡Este factor importa MUCHO! Pon atención a cuál nivel eliges.
                </div>
                <div style={{ padding: '8px 12px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '12px' }}>
                  📉 <strong>Range pequeño</strong> = Este factor casi no afecta. Puedes elegir el más barato o fácil.
                </div>
              </div>
            </div>

            {/* Step 2: Reading the graphs */}
            <div style={{
              padding: '15px',
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              marginBottom: '15px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{
                  width: '28px', height: '28px', backgroundColor: '#3b82f6', color: 'white',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '600'
                }}>2</span>
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>¿Cómo leer los dos gráficos?</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingLeft: '36px' }}>
                <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <strong style={{ color: '#166534', fontSize: '13px' }}>📊 Gráfico de MEDIAS</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: theme.text, lineHeight: '1.5' }}>
                    Muestra el <strong>resultado promedio</strong> de cada nivel.
                    {snType === 'smaller' && ' Como quieres MENOS, busca el punto más BAJO ↓'}
                    {snType === 'larger' && ' Como quieres MÁS, busca el punto más ALTO ↑'}
                    {snType === 'nominal' && ' Busca el punto más cercano a tu objetivo'}
                  </p>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                  <strong style={{ color: '#1e40af', fontSize: '13px' }}>🎯 Gráfico S/N</strong>
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: theme.text, lineHeight: '1.5' }}>
                    Muestra qué tan <strong>consistente/confiable</strong> es cada nivel.
                    <strong> Siempre busca el punto más ALTO ↑</strong> (menos variación = más confiable).
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3: Decision per factor */}
            <div style={{
              padding: '15px',
              backgroundColor: theme.bgCard,
              borderRadius: '10px',
              marginBottom: '15px',
              border: '1px solid #bbf7d0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  width: '28px', height: '28px', backgroundColor: '#3b82f6', color: 'white',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: '600'
                }}>3</span>
                <strong style={{ color: '#1e40af', fontSize: '14px' }}>🏆 Decisión para cada factor:</strong>
              </div>
              <div style={{ paddingLeft: '36px' }}>
                {(analysis.mainEffects || []).map((effect, idx) => {
                  const fName = factorNames[effect?.factor - 1] || `Factor ${effect?.factor}`;
                  const levels = [effect?.level1, effect?.level2, effect?.level3].filter(l => l != null);
                  const bestLevelIdx = levels.indexOf(Math.max(...levels));
                  const bestLevelNum = bestLevelIdx + 1;
                  const levelLabel = factorLevels[effect?.factor - 1]?.[bestLevelIdx] || `Nivel ${bestLevelNum}`;
                  const isImportant = effect?.range > (analysis.mainEffects?.[0]?.range * 0.5);

                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: idx === 0 ? '#dcfce7' : '#f9fafb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: idx === 0 ? '2px solid #86efac' : `1px solid ${theme.border}`
                    }}>
                      <span style={{
                        fontSize: '16px',
                        minWidth: '24px'
                      }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: theme.text }}>{fName}</strong>
                        <span style={{ color: theme.textMuted, fontSize: '12px', marginLeft: '8px' }}>
                          (Range: {effect?.range?.toFixed(2)})
                        </span>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Usar: {levelLabel}
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: isImportant ? '#fef3c7' : '#f3f4f6',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: isImportant ? '#92400e' : '#6b7280'
                      }}>
                        {isImportant ? '⚠️ Importante' : '💡 Flexible'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final recommendation */}
            <div style={{
              padding: '15px',
              backgroundColor: '#dcfce7',
              borderRadius: '10px',
              border: '2px solid #22c55e'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>✅</span>
                <div>
                  <strong style={{ color: '#166534', fontSize: '14px' }}>Resumen de la decisión:</strong>
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#166534', lineHeight: '1.6' }}>
                    {analysis.mainEffects?.[0] && (
                      <>
                        El factor que <strong>MÁS afecta</strong> tu resultado es <strong>"{factorNames[analysis.mainEffects[0]?.factor - 1]}"</strong>.
                        {' '}Asegúrate de usar el nivel correcto para este factor.
                        <br/><br/>
                      </>
                    )}
                    Los factores marcados como "Flexible" casi no afectan el resultado, así que puedes elegir
                    el nivel que sea <strong>más barato</strong>, <strong>más fácil</strong> o <strong>más disponible</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Soba Example Conclusion - ENHANCED */}
          {isUsingSobaExample && (
            <div style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#fdf4ff',
              borderRadius: '12px',
              border: '2px solid #e879f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '28px' }}>🍜</span>
                <h4 style={{ margin: 0, color: '#86198f', fontSize: '18px' }}>Interpretación del Ejemplo Soba</h4>
              </div>

              {/* Graph interpretation */}
              <div style={{
                padding: '15px',
                backgroundColor: theme.bgCard,
                borderRadius: '10px',
                marginBottom: '15px',
                border: '1px solid #f0abfc'
              }}>
                <strong style={{ color: '#86198f', fontSize: '14px' }}>📊 Lo que nos dicen los gráficos:</strong>
                <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: '1.7', color: theme.text }}>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>1. Temperatura de Secado</strong> (Range más alto ≈ 7.8):
                    <br/>
                    <span style={{ paddingLeft: '15px', display: 'block' }}>
                      → La línea es la MÁS inclinada de todas. Esto significa que cambiar la temperatura
                      hace una GRAN diferencia en cuántos fideos se rompen. <strong>70°C da el mejor S/N</strong> (punto más alto).
                    </span>
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>2. Tipo de Harina</strong> (segundo más importante):
                    <br/>
                    <span style={{ paddingLeft: '15px', display: 'block' }}>
                      → También tiene línea inclinada. <strong>Tipo C</strong> es claramente mejor que A o B.
                    </span>
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>3. Cantidad de Agua y Tiempo de Amasado</strong> (Range más bajo):
                    <br/>
                    <span style={{ paddingLeft: '15px', display: 'block' }}>
                      → Líneas más planas = menos importantes. Podríamos elegir el nivel más conveniente,
                      pero <strong>40% agua</strong> y <strong>5 min</strong> dan ligeramente mejores resultados.
                    </span>
                  </p>
                </div>
              </div>

              {/* Final recipe */}
              <div style={{
                padding: '15px',
                backgroundColor: '#fae8ff',
                borderRadius: '10px',
                border: '1px solid #e879f9'
              }}>
                <strong style={{ color: '#86198f', fontSize: '14px' }}>🏆 Receta Ganadora (basada en S/N más alto):</strong>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px' }}>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px' }}>🌾</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>Harina</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#86198f' }}>Tipo C</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px' }}>💧</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>Agua</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#86198f' }}>40%</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px' }}>⏱️</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>Amasado</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#86198f' }}>5 min</div>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px' }}>
                    <div style={{ fontSize: '20px' }}>🌡️</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>Secado</div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#86198f' }}>70°C</div>
                  </div>
                </div>
                <p style={{ margin: '15px 0 0 0', fontSize: '13px', color: '#86198f', lineHeight: '1.6', textAlign: 'center' }}>
                  🎉 <strong>Resultado:</strong> Solo <strong>3 fideos rotos</strong> por lote (vs 10+ con otras combinaciones).
                  <br/>
                  <span style={{ fontSize: '12px', color: '#a855f7' }}>
                    Con solo 9 experimentos encontramos la mejor receta de 81 combinaciones posibles (3⁴).
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* GAIN CHART - Current vs Optimal */}
          {(() => {
            const gainData = calculateGainData();
            if (!gainData) return null;

            return (
              <div style={{
                marginTop: '20px',
                padding: '20px',
                backgroundColor: '#eff6ff',
                borderRadius: '12px',
                border: '2px solid #93c5fd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '28px' }}>📈</span>
                  <div>
                    <h4 style={{ margin: 0, color: '#1e40af', fontSize: '18px' }}>Ganancia Esperada</h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#3b82f6' }}>¿Cuánto mejoraremos con la configuración óptima?</p>
                  </div>
                </div>

                {/* Gain Chart */}
                <div style={{ height: '250px', backgroundColor: theme.bgCard, borderRadius: '10px', padding: '15px', marginBottom: '15px' }}>
                  <canvas ref={gainChartRef}></canvas>
                </div>

                {/* Gain Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ fontSize: '11px', color: '#991b1b', marginBottom: '4px' }}>😟 Peor Corrida #{gainData.worstRunIdx}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626' }}>{gainData.worstRunSN?.toFixed(1)} dB</div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fefce8',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>📊 Promedio Actual</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#d97706' }}>{gainData.currentSN?.toFixed(1)} dB</div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{ fontSize: '11px', color: '#166534', marginBottom: '4px' }}>🌟 Mejor Corrida #{gainData.bestRunIdx}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#22c55e' }}>{gainData.bestRunSN?.toFixed(1)} dB</div>
                  </div>
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#eff6ff',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '2px solid #3b82f6'
                  }}>
                    <div style={{ fontSize: '11px', color: '#1e40af', marginBottom: '4px' }}>🎯 Óptimo Predicho</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{gainData.optimalSN?.toFixed(1)} dB</div>
                  </div>
                </div>

                {/* Gain Explanation */}
                <div style={{
                  marginTop: '15px',
                  padding: '12px 15px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '10px',
                  border: '1px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '28px' }}>🚀</span>
                  <div style={{ fontSize: '14px', color: '#166534' }}>
                    <strong>Ganancia esperada:</strong> +{gainData.gain?.toFixed(2)} dB
                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#15803d' }}>
                      Si usas la configuración óptima, esperamos mejorar de <strong>{gainData.currentSN?.toFixed(1)} dB</strong> (promedio actual)
                      a <strong>{gainData.optimalSN?.toFixed(1)} dB</strong>.
                      {gainData.gain > 0 && ' ¡Esto representa una mejora significativa!'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CONFIRMATION EXPERIMENT Section */}
          <div style={{
            marginTop: '20px',
            padding: '20px',
            backgroundColor: showConfirmation ? '#fdf4ff' : '#f8fafc',
            borderRadius: '12px',
            border: showConfirmation ? '2px solid #e879f9' : '2px dashed #d1d5db'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: showConfirmation ? '15px' : '0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>🔬</span>
                <div>
                  <h4 style={{ margin: 0, color: showConfirmation ? '#86198f' : '#374151', fontSize: '16px' }}>
                    Experimento de Confirmación
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: showConfirmation ? '#a855f7' : '#6b7280' }}>
                    Verifica que la configuración óptima realmente funciona
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowConfirmation(!showConfirmation);
                  if (!showConfirmation) {
                    setConfirmationResults(Array(replications).fill(''));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: showConfirmation ? '#e879f9' : '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {showConfirmation ? '✕ Cerrar' : '➕ Agregar Confirmación'}
              </button>
            </div>

            {showConfirmation && (
              <>
                {/* Optimal Configuration Reminder */}
                {(() => {
                  const gainData = calculateGainData();
                  if (!gainData) return null;

                  return (
                    <div style={{
                      padding: '15px',
                      backgroundColor: theme.bgCard,
                      borderRadius: '10px',
                      marginBottom: '15px',
                      border: '1px solid #f0abfc'
                    }}>
                      <strong style={{ color: '#86198f', fontSize: '13px' }}>
                        📋 Configuración óptima a probar:
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                        {gainData.bestLevels.map((bl, idx) => (
                          <div key={idx} style={{
                            padding: '8px 12px',
                            backgroundColor: '#fae8ff',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}>
                            <strong>{factorNames[bl.factor - 1] || `Factor ${bl.factor}`}:</strong> {bl.levelValue}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Input for confirmation results */}
                <div style={{
                  padding: '15px',
                  backgroundColor: theme.bgCard,
                  borderRadius: '10px',
                  marginBottom: '15px',
                  border: '1px solid #f0abfc'
                }}>
                  <strong style={{ color: '#86198f', fontSize: '13px', display: 'block', marginBottom: '10px' }}>
                    📝 Ingresa los resultados de tu experimento de confirmación:
                  </strong>
                  <p style={{ fontSize: '12px', color: theme.textMuted, marginBottom: '12px' }}>
                    Ejecuta {replications} réplicas con la configuración óptima y registra los resultados.
                  </p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {Array(replications).fill().map((_, idx) => (
                      <div key={idx}>
                        <label style={{ fontSize: '11px', color: '#86198f', fontWeight: '600' }}>Réplica {idx + 1}</label>
                        <input
                          type="number"
                          value={confirmationResults[idx] || ''}
                          onChange={(e) => {
                            const newResults = [...confirmationResults];
                            newResults[idx] = e.target.value;
                            setConfirmationResults(newResults);
                            setTimeout(() => renderGainChart(), 100);
                          }}
                          style={{
                            display: 'block',
                            width: '80px',
                            padding: '8px',
                            border: '1px solid #e9d5ff',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textAlign: 'center',
                            marginTop: '4px'
                          }}
                          placeholder="0.00"
                          step="any"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirmation Results */}
                {(() => {
                  const confirmSN = calculateConfirmationSN();
                  const gainData = calculateGainData();
                  if (!confirmSN || !gainData) return null;

                  const isWithinRange = confirmSN.sn >= gainData.currentSN;
                  const isNearOptimal = Math.abs(confirmSN.sn - gainData.optimalSN) <= Math.abs(gainData.gain * 0.3);

                  return (
                    <div style={{
                      padding: '15px',
                      backgroundColor: isNearOptimal ? '#dcfce7' : isWithinRange ? '#fef3c7' : '#fef2f2',
                      borderRadius: '10px',
                      border: `2px solid ${isNearOptimal ? '#22c55e' : isWithinRange ? '#f59e0b' : '#ef4444'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '24px' }}>
                          {isNearOptimal ? '🎉' : isWithinRange ? '👍' : '🤔'}
                        </span>
                        <div>
                          <strong style={{ color: isNearOptimal ? '#166534' : isWithinRange ? '#92400e' : '#991b1b', fontSize: '15px' }}>
                            {isNearOptimal ? '¡Confirmación Exitosa!' : isWithinRange ? 'Mejora Confirmada' : 'Revisar Configuración'}
                          </strong>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: theme.textMuted }}>S/N Confirmación</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#8b5cf6' }}>{confirmSN.sn.toFixed(2)} dB</div>
                        </div>
                        <div style={{ padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: theme.textMuted }}>S/N Predicho</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#3b82f6' }}>{gainData.optimalSN.toFixed(2)} dB</div>
                        </div>
                        <div style={{ padding: '10px', backgroundColor: theme.bgCard, borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: theme.textMuted }}>Diferencia</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: isNearOptimal ? '#22c55e' : '#f59e0b' }}>
                            {(confirmSN.sn - gainData.optimalSN).toFixed(2)} dB
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: 0, fontSize: '12px', color: isNearOptimal ? '#166534' : isWithinRange ? '#92400e' : '#991b1b', lineHeight: '1.5' }}>
                        {isNearOptimal && (
                          <>✅ El resultado de confirmación ({confirmSN.sn.toFixed(2)} dB) está muy cerca del predicho ({gainData.optimalSN.toFixed(2)} dB).
                          <br/>¡La configuración óptima está <strong>verificada y lista para producción</strong>!</>
                        )}
                        {isWithinRange && !isNearOptimal && (
                          <>✅ El resultado mejora respecto al promedio actual ({gainData.currentSN.toFixed(2)} dB), pero no alcanza el óptimo predicho.
                          <br/>Posibles causas: interacciones entre factores, variación de materiales, o error experimental.</>
                        )}
                        {!isWithinRange && (
                          <>⚠️ El resultado está por debajo del promedio actual. Verifica que la configuración se aplicó correctamente
                          y que no hay factores externos afectando el experimento.</>
                        )}
                      </p>
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Save Button */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            backgroundColor: theme.bg,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '13px', color: theme.textMuted }}>
              💾 Guarda este análisis para consultarlo después
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {savedMessage && (
                <span style={{
                  color: savedMessage.includes('Error') ? '#dc2626' : '#059669',
                  fontSize: '13px',
                  fontWeight: '500'
                }}>
                  {savedMessage}
                </span>
              )}
              <button
                onClick={saveAnalysis}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSaving ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {isSaving ? 'Guardando...' : '💾 Guardar Análisis'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.textDim }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
          <div>Ejecuta el análisis para ver los resultados</div>
        </div>
      )}
    </div>
  );

  // ============ MAIN RENDER ============

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Stepper Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '15px 20px',
        backgroundColor: theme.bg,
        borderBottom: `1px solid ${theme.border}`,
        marginBottom: '20px'
      }}>
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: step.id <= currentStep ? 'pointer' : 'default',
              opacity: step.id > currentStep ? 0.4 : 1
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: currentStep === step.id ? '#3b82f6' : step.id < currentStep ? '#22c55e' : '#e5e7eb',
              color: currentStep === step.id || step.id < currentStep ? 'white' : '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}>
              {step.id < currentStep ? '✓' : step.id}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', color: theme.textMuted }}>{step.icon}</span>
              <span style={{
                fontSize: '13px',
                fontWeight: currentStep === step.id ? '600' : '400',
                color: currentStep === step.id ? '#1e40af' : theme.text
              }}>
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div style={{
                width: '40px',
                height: '2px',
                backgroundColor: step.id < currentStep ? '#22c55e' : '#e5e7eb',
                marginLeft: '10px'
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px' }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Navigation Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '15px 20px',
        borderTop: `1px solid ${theme.border}`,
        backgroundColor: theme.bg,
        marginTop: '20px'
      }}>
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          style={{
            ...btnStyle,
            backgroundColor: currentStep === 1 ? theme.bgPanel : theme.bgCard,
            color: currentStep === 1 ? theme.textDim : theme.textMuted,
            border: `1px solid ${theme.border}`,
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
          }}
        >
          ← Anterior
        </button>

        <div style={{ fontSize: '13px', color: theme.textMuted, alignSelf: 'center' }}>
          Paso {currentStep} de {STEPS.length}
        </div>

        {currentStep < 5 ? (
          <button
            onClick={nextStep}
            disabled={!canProceed() || isLoading}
            style={{
              ...btnStyle,
              backgroundColor: canProceed() ? '#3b82f6' : '#e5e7eb',
              color: canProceed() ? 'white' : '#9ca3af',
              cursor: canProceed() && !isLoading ? 'pointer' : 'not-allowed'
            }}
          >
            {isLoading ? 'Analizando...' : currentStep === 4 ? 'Analizar →' : 'Siguiente →'}
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentStep(1);
              setAnalysis(null);
              setIsUsingSobaExample(false);
              setShowExampleButton(true);
              setUseNoiseFactors(false);
              setNoiseFactorCount(2);
              setNoiseFactorNames(['', '']);
              setNoiseFactorLevels([['', ''], ['', '']]);
              setNoiseConditions([]);
              if (arrayData) {
                setResults(Array(arrayData.runs).fill(null).map(() => Array(replications).fill('')));
              }
            }}
            style={{ ...btnStyle, backgroundColor: '#22c55e', color: 'white' }}
          >
            🔄 Nuevo Estudio
          </button>
        )}
      </div>
    </div>
  );
};

export default TaguchiTab;
