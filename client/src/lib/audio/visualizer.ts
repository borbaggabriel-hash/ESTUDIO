export interface DrawOscilloscopeOpts {
  ctx: CanvasRenderingContext2D;
  timeDomainData: Uint8Array;
  width: number;
  height: number;
  color?: string;
}

export interface DrawStaticWaveformOpts {
  ctx: CanvasRenderingContext2D;
  samples: Float32Array;
  width: number;
  height: number;
  playheadPosition?: number;
  color?: string;
  playedColor?: string;
}

export interface DrawVuMeterOpts {
  ctx: CanvasRenderingContext2D;
  level: number;
  peak: number;
  width: number;
  height: number;
}

export function computeRMS(timeDomainData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    const v = (timeDomainData[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / timeDomainData.length);
}

export function rmsToMeterLevel(rms: number): number {
  if (rms <= 0.0001) return 0;
  const db = 20 * Math.log10(rms);
  const minDb = -60;
  const maxDb = 0;
  return Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
}

export function drawOscilloscope({
  ctx,
  timeDomainData,
  width,
  height,
  color = "#22c55e",
}: DrawOscilloscopeOpts): void {
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 6;
  ctx.shadowColor = color;
  ctx.lineJoin = "round";

  ctx.beginPath();
  const sliceWidth = width / timeDomainData.length;
  let x = 0;

  for (let i = 0; i < timeDomainData.length; i++) {
    const v = timeDomainData[i] / 128.0;
    const y = (v * height) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

export function drawStaticWaveform({
  ctx,
  samples,
  width,
  height,
  playheadPosition = -1,
  color = "#22c55e",
  playedColor = "#3b82f6",
}: DrawStaticWaveformOpts): void {
  ctx.clearRect(0, 0, width, height);

  if (samples.length === 0) return;

  const mid = height / 2;
  const buckets = width;
  const samplesPerBucket = Math.max(1, Math.floor(samples.length / buckets));

  for (let b = 0; b < buckets; b++) {
    const start = b * samplesPerBucket;
    let max = 0;
    let min = 0;

    for (let j = 0; j < samplesPerBucket && start + j < samples.length; j++) {
      const s = samples[start + j];
      if (s > max) max = s;
      if (s < min) min = s;
    }

    const isPlayed = playheadPosition >= 0 && b / buckets <= playheadPosition;
    ctx.fillStyle = isPlayed ? playedColor : color;

    const top = mid - max * mid;
    const bottom = mid - min * mid;
    ctx.fillRect(b, top, 1, Math.max(1, bottom - top));
  }

  if (playheadPosition >= 0 && playheadPosition <= 1) {
    const x = Math.round(playheadPosition * width);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(x, 0, 2, height);
  }
}

export function drawVuMeter({
  ctx,
  level,
  peak,
  width,
  height,
}: DrawVuMeterOpts): void {
  ctx.clearRect(0, 0, width, height);

  const greenEnd = 0.8;
  const yellowEnd = 0.9;

  const totalBars = 24;
  const barH = Math.floor((height - totalBars) / totalBars);
  const barGap = 1;

  for (let i = 0; i < totalBars; i++) {
    const barFraction = (i + 1) / totalBars;
    const y = height - i * (barH + barGap) - barH;

    const active = barFraction <= level;

    let baseColor: string;
    if (barFraction > yellowEnd) {
      baseColor = active ? "#ef4444" : "#3f1212";
    } else if (barFraction > greenEnd) {
      baseColor = active ? "#eab308" : "#2d2506";
    } else {
      baseColor = active ? "#22c55e" : "#0a2414";
    }

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, y, width, barH);
  }

  const peakBar = Math.round(peak * totalBars);
  if (peakBar > 0 && peakBar <= totalBars) {
    const py =
      height - (peakBar - 1) * (barH + barGap) - barH;
    ctx.fillStyle =
      peak > yellowEnd
        ? "#ef4444"
        : peak > greenEnd
          ? "#eab308"
          : "#22c55e";
    ctx.fillRect(0, py, width, 2);
  }

  const dbLabels = [
    { label: "0", fraction: 1.0 },
    { label: "-6", fraction: 0.9 },
    { label: "-12", fraction: 0.8 },
  ];
  ctx.fillStyle = "#52525b";
  ctx.font = "8px monospace";
  ctx.textAlign = "center";

  for (const { label, fraction } of dbLabels) {
    const y =
      height -
      Math.round(fraction * totalBars) * (barH + barGap) +
      barH / 2;
    ctx.fillText(label, width / 2, y);
  }
}
