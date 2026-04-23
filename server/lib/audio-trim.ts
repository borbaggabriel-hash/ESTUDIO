export function trimWavBuffer(buffer: Buffer, startSeconds: number, endSeconds: number): Buffer {
  // Validate RIFF/WAVE header
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("Invalid WAV file");
  }

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  // Dynamically scan RIFF chunks to find fmt and data — handles extra chunks
  // (LIST, INFO, JUNK, etc.) that are common in browser MediaRecorder output.
  let fmtOffset = -1;
  let dataOffset = -1;
  let dataSize = -1;

  let pos = 12; // start after "RIFFxxxxWAVE"
  while (pos + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", pos, pos + 4);
    const chunkSize = view.getUint32(pos + 4, true);

    if (chunkId === "fmt ") {
      fmtOffset = pos;
    } else if (chunkId === "data") {
      dataOffset = pos + 8; // byte offset of actual audio data
      dataSize = chunkSize;
      break;
    }

    // RIFF chunks are word-aligned (padded to even size)
    pos += 8 + chunkSize + (chunkSize % 2);
  }

  if (fmtOffset === -1) throw new Error("WAV fmt chunk not found");
  if (dataOffset === -1) throw new Error("WAV data chunk not found");

  // Read fmt fields from their actual positions
  const numChannels  = view.getUint16(fmtOffset + 10, true);
  const sampleRate   = view.getUint32(fmtOffset + 12, true);
  const byteRate     = view.getUint32(fmtOffset + 16, true);
  const blockAlign   = view.getUint16(fmtOffset + 20, true);
  const bitsPerSample = view.getUint16(fmtOffset + 22, true);

  const totalSamples = dataSize / blockAlign;
  const startSample  = Math.floor(startSeconds * sampleRate);
  const endSample    = Math.min(Math.ceil(endSeconds * sampleRate), totalSamples);

  if (startSample < 0 || endSample <= startSample) {
    throw new Error(`Invalid trim range: start=${startSeconds}s end=${endSeconds}s totalSamples=${totalSamples}`);
  }

  const samplesToKeep = endSample - startSample;
  const newDataLength = samplesToKeep * blockAlign;
  const newFileSize   = 44 + newDataLength; // canonical: RIFF(12) + fmt(24) + data header(8) + data

  const newBuffer = Buffer.alloc(newFileSize);
  const nv = new DataView(newBuffer.buffer);

  // RIFF chunk
  newBuffer.write("RIFF", 0);
  nv.setUint32(4, newFileSize - 8, true);
  newBuffer.write("WAVE", 8);

  // fmt chunk (PCM, 16-byte body)
  newBuffer.write("fmt ", 12);
  nv.setUint32(16, 16, true);
  nv.setUint16(20, 1, true); // PCM
  nv.setUint16(22, numChannels, true);
  nv.setUint32(24, sampleRate, true);
  nv.setUint32(28, byteRate, true);
  nv.setUint16(32, blockAlign, true);
  nv.setUint16(34, bitsPerSample, true);

  // data chunk
  newBuffer.write("data", 36);
  nv.setUint32(40, newDataLength, true);

  // Copy trimmed audio samples
  const srcStart = dataOffset + startSample * blockAlign;
  buffer.copy(newBuffer, 44, srcStart, srcStart + newDataLength);

  return newBuffer;
}
