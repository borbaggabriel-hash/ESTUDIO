/**
 * High-fidelity pass-through AudioWorkletProcessor.
 * Captures raw 32-bit float samples from the microphone without any processing.
 * Used when voiceCaptureMode === "high-fidelity".
 */
class RawCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // Post a copy of the raw samples to the main thread
      this.port.postMessage({ samples: input[0].slice() });
    }
    return true; // keep processor alive
  }
}

registerProcessor("raw-capture-processor", RawCaptureProcessor);
