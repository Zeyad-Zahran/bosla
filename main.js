const btn = document.getElementById("start");
const volumeEl = document.getElementById("volume");
const pitchEl = document.getElementById("pitch");
const freqEl = document.getElementById("freq");
const meydaEl = document.getElementById("meyda");

btn.onclick = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const timeArray = new Float32Array(analyser.fftSize);

  source.connect(analyser);

  // =============== 1) حساب الصوت (Volume) ============
  function getVolume() {
    analyser.getFloatTimeDomainData(timeArray);
    let sum = 0;
    for (let i = 0; i < timeArray.length; i++) sum += timeArray[i] * timeArray[i];
    return Math.sqrt(sum / timeArray.length);
  }

  // =============== 2) حساب Pitch (YIN Algorithm بسيط) ============
  function detectPitch() {
    analyser.getFloatTimeDomainData(timeArray);
    let best = -1, bestDiff = 1e6;

    for (let lag = 20; lag < 1000; lag++) {
      let diff = 0;
      for (let i = 0; i < timeArray.length - lag; i++) {
        diff += Math.abs(timeArray[i] - timeArray[i + lag]);
      }
      if (diff < bestDiff) {
        bestDiff = diff;
        best = lag;
      }
    }

    return audioCtx.sampleRate / best;
  }

  // =============== 3) Meyda Features ===============
  const meydaAnalyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioCtx,
    source,
    bufferSize: 512,
    featureExtractors: [
      "rms",
      "zcr",
      "spectralCentroid",
      "spectralFlatness",
      "spectralSlope",
      "loudness",
      "mfcc"
    ]
  });

  // =============== 4) Loop (تحليل Live) ===============
  function loop() {
    // Volume
    const volume = getVolume();
    volumeEl.textContent = volume.toFixed(4);

    // Pitch
    const pitch = detectPitch();
    pitchEl.textContent = pitch.toFixed(2);

    // Frequencies
    analyser.getByteFrequencyData(dataArray);
    freqEl.textContent = JSON.stringify(Array.from(dataArray.slice(0, 50)));

    // Meyda Features
    const f = meydaAnalyzer.get();
    if (f) meydaEl.textContent = JSON.stringify(f, null, 2);

    requestAnimationFrame(loop);
  }

  loop();
};
