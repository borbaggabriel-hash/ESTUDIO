const SAMPLE_RATE = 48000;
const BIT_DEPTH = 24;
const NUM_CHANNELS = 1;

export function encodeWav(samples: Float32Array): ArrayBuffer {
  const bytesPerSample = BIT_DEPTH / 8;
  const dataLength = samples.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * NUM_CHANNELS * bytesPerSample, true);
  view.setUint16(32, NUM_CHANNELS * bytesPerSample, true);
  view.setUint16(34, BIT_DEPTH, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  let offset = headerLength;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intVal = clamped < 0
      ? Math.round(clamped * 0x800000)
      : Math.round(clamped * 0x7fffff);

    view.setUint8(offset, intVal & 0xff);
    view.setUint8(offset + 1, (intVal >> 8) & 0xff);
    view.setUint8(offset + 2, (intVal >> 16) & 0xff);
    offset += 3;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function wavToBlob(wavBuffer: ArrayBuffer): Blob {
  return new Blob([wavBuffer], { type: "audio/wav" });
}

export function getDurationSeconds(samples: Float32Array): number {
  return samples.length / SAMPLE_RATE;
}
