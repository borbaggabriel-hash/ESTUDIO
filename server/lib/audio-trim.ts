export function trimWavBuffer(buffer: Buffer, startSeconds: number, endSeconds: number): Buffer {
  // Parse WAV header
  const view = new DataView(buffer.buffer);
  
  // Check RIFF header
  if (view.getUint32(0, false) !== 0x52494646 || view.getUint32(8, false) !== 0x57415645) {
    throw new Error("Invalid WAV file");
  }
  
  const numChannels = view.getUint16(22, true);
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const byteRate = view.getUint32(28, true);
  const blockAlign = view.getUint16(32, true);
  
  const dataChunkOffset = 44; // Standard WAV header size
  const totalSamples = (buffer.length - dataChunkOffset) / blockAlign;
  
  const startSample = Math.floor(startSeconds * sampleRate);
  const endSample = Math.floor(endSeconds * sampleRate);
  
  if (startSample < 0 || endSample > totalSamples || startSample >= endSample) {
    throw new Error("Invalid trim range");
  }
  
  const samplesToKeep = endSample - startSample;
  const newDataLength = samplesToKeep * blockAlign;
  const newFileSize = 36 + 8 + newDataLength; // RIFF + fmt + data chunk headers + data
  
  const newBuffer = Buffer.alloc(newFileSize);
  const newView = new DataView(newBuffer.buffer);
  
  // Copy RIFF header
  newBuffer.write("RIFF", 0);
  newView.setUint32(4, newFileSize - 8, true);
  newBuffer.write("WAVE", 8);
  
  // Copy fmt chunk
  newBuffer.write("fmt ", 12);
  newView.setUint32(16, 16, true); // fmt chunk size
  newView.setUint16(20, 1, true); // PCM format
  newView.setUint16(22, numChannels, true);
  newView.setUint32(24, sampleRate, true);
  newView.setUint32(28, byteRate, true);
  newView.setUint16(32, blockAlign, true);
  newView.setUint16(34, bitsPerSample, true);
  
  // Copy data chunk header
  newBuffer.write("data", 36);
  newView.setUint32(40, newDataLength, true);
  
  // Copy trimmed audio data
  const startByte = dataChunkOffset + (startSample * blockAlign);
  buffer.copy(newBuffer, 44, startByte, startByte + newDataLength);
  
  return newBuffer;
}
