class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      // Collect audio data from the first channel
      const audioData = input[0];
      this.buffer.push(...audioData);

      // When we have enough data, send it to the main thread
      if (this.buffer.length >= 4096) {
        this.port.postMessage({
          type: 'audio-data',
          data: this.buffer.slice(0, 4096)
        });
        this.buffer = this.buffer.slice(4096);
      }
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor); 