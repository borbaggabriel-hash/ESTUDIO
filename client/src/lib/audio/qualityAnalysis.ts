export interface QualityMetrics {
  score: number;
  clipping: boolean;
  loudness: number;
  noiseFloor: number;
  timingScore: number;
}

export function analyzeTakeQuality(samples: Float32Array, targetDuration?: number): QualityMetrics {
  if (samples.length === 0) {
    return { score: 0, clipping: false, loudness: 0, noiseFloor: 0, timingScore: 0 };
  }

  // 1. Clipping detection
  let clippingCount = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) >= 0.99) {
      clippingCount++;
    }
  }
  const hasClipping = clippingCount > 0;

  // 2. Loudness (RMS)
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sumSq / samples.length);
  // Normalize loudness score (ideal RMS around 0.15 - 0.2 for voice)
  const loudnessScore = Math.max(0, 1 - Math.abs(rms - 0.18) * 4);

  // 3. Noise Floor (estimate from quietest 100ms window)
  const windowSize = 4800; // 100ms at 48kHz
  let minWindowRms = Infinity;
  for (let i = 0; i < samples.length - windowSize; i += windowSize) {
    let windowSumSq = 0;
    for (let j = 0; j < windowSize; j++) {
      const s = samples[i + j];
      windowSumSq += s * s;
    }
    const windowRms = Math.sqrt(windowSumSq / windowSize);
    if (windowRms < minWindowRms) minWindowRms = windowRms;
  }
  // Noise floor score: lower is better. -60dB is ~0.001.
  const noiseScore = Math.max(0, 1 - minWindowRms * 50);

  // 4. Timing Score
  let timingScore = 1.0;
  if (targetDuration && targetDuration > 0) {
    const duration = samples.length / 48000;
    const diff = Math.abs(duration - targetDuration);
    timingScore = Math.max(0, 1 - diff / targetDuration);
  }

  // 5. Overall Score (0-100)
  let baseScore = (loudnessScore * 0.4 + noiseScore * 0.3 + timingScore * 0.3) * 100;
  if (hasClipping) baseScore *= 0.7; // Heavy penalty for clipping

  return {
    score: Math.round(Math.max(0, Math.min(100, baseScore))),
    clipping: hasClipping,
    loudness: rms,
    noiseFloor: minWindowRms,
    timingScore
  };
}
