const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxXYNoN4eAqtGYPEeWqniiPY8YwtOsaNYw1FIHCI4yIpsuC64C12vq80w48sU011z3w/exec";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusBox = document.getElementById("status");
const resultBox = document.getElementById("resultBox");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const manualQr = document.getElementById("manualQr");
const manualVerifyBtn = document.getElementById("manualVerifyBtn");

let stream = null;
let scanLoop = null;

function setStatus(msg) {
  statusBox.textContent = msg;
}

function setResult(obj) {
  resultBox.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

async function startScanner() {
  try {
    setStatus("Starting camera...");

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus("Scanner active");

    scanLoop = requestAnimationFrame(scanFrame);
  } catch (err) {
    console.error(err);
    setStatus("Camera error: " + (err.message || String(err)));
  }
}

function stopScanner() {
  if (scanLoop) cancelAnimationFrame(scanLoop);
  scanLoop = null;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.srcObject = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Camera stopped");
}

async function scanFrame() {
  if (!video.videoWidth || !video.videoHeight) {
    scanLoop = requestAnimationFrame(scanFrame);
    return;
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);

  if (code && code.data) {
    setStatus("QR detected");
    stopScanner();
    await verifyQr(code.data);
    return;
  }

  scanLoop = requestAnimationFrame(scanFrame);
}

async function verifyQr(qrValue) {
  setStatus("Verifying QR...");

  try {
    const url = `${WEB_APP_URL}?action=verifyAttendance&qr=${encodeURIComponent(qrValue)}`;
    const res = await fetch(url);
    const data = await res.json();

    setResult(data);

    if (data.success) {
      setStatus("Attendance marked successfully");
    } else {
      setStatus("Verification failed");
    }
  } catch (err) {
    console.error(err);
    setStatus("Verification error: " + (err.message || String(err)));
  }
}

startBtn.addEventListener("click", startScanner);
stopBtn.addEventListener("click", stopScanner);

manualVerifyBtn.addEventListener("click", async () => {
  const value = manualQr.value.trim();
  if (!value) {
    setStatus("Enter QR value first");
    return;
  }
  await verifyQr(value);
});
