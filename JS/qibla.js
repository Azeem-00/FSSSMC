// ============================================================
// FSSSMC Qibla Compass — Rotates on mobile, needle-only on desktop
// ============================================================

const canvas = document.getElementById("compass");
const ctx = canvas.getContext("2d");
const qiblaText = document.getElementById("qiblaText");

const center = canvas.width / 2;
const radius = canvas.width / 2 - 10;

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

let userLat = 0;
let userLon = 0;
let deviceHeading = 0;
let displayAngle = 0;

let isMobile = /Mobi|Android/i.test(navigator.userAgent);

// -----------------
// Get location
// -----------------
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
    },
    () => {
      // fallback: center of Nigeria
      userLat = 9.082;
      userLon = 8.6753;
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
  );
}

// -----------------
// Device orientation
// -----------------
function enableOrientation() {
  if ("DeviceOrientationEvent" in window && isMobile) {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS
      const btn = document.createElement("button");
      btn.innerText = "Enable Compass";
      btn.style.fontSize = "16px";
      btn.style.padding = "10px 20px";
      btn.style.marginTop = "20px";
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {
        DeviceOrientationEvent.requestPermission().then((perm) => {
          if (perm === "granted") {
            window.addEventListener("deviceorientation", (e) => {
              if (e.alpha !== null) deviceHeading = (360 - e.alpha) % 360;
            });
            btn.remove();
          }
        });
      });
    } else {
      // Android / other
      window.addEventListener("deviceorientationabsolute", (e) => {
        if (e.alpha !== null) deviceHeading = (360 - e.alpha) % 360;
      });
      window.addEventListener("deviceorientation", (e) => {
        if (e.alpha !== null) deviceHeading = (360 - e.alpha) % 360;
      });
    }
  }
}

enableOrientation();

// -----------------
// Calculate Qibla angle
// -----------------
function calculateQibla(lat, lon) {
  const φK = (KAABA_LAT * Math.PI) / 180;
  const λK = (KAABA_LON * Math.PI) / 180;
  const φ = (lat * Math.PI) / 180;
  const λ = (lon * Math.PI) / 180;

  const y = Math.sin(λK - λ);
  const x = Math.cos(φ) * Math.tan(φK) - Math.sin(φ) * Math.cos(λK - λ);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// -----------------
// Compass direction
// -----------------
function getCompassDirection(angle) {
  const directions = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  const index = Math.round(angle / 45) % 8;
  return directions[index];
}

// -----------------
// Draw compass
// -----------------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const qiblaAngle = calculateQibla(userLat, userLon);

  let targetAngle;
  if (isMobile) {
    // Mobile: rotate entire compass dial
    targetAngle = deviceHeading;
  } else {
    // Desktop: compass stays static, rotate only needle
    targetAngle = 0;
  }

  // Smooth rotation
  let diff = targetAngle - displayAngle;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  displayAngle += diff * 0.1;

  // -----------------
  // Draw circle
  // -----------------
  ctx.save();
  ctx.translate(center, center);

  if (isMobile) {
    ctx.rotate((displayAngle * Math.PI) / 180); // rotate entire dial
  }

  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#228B22";
  ctx.stroke();

  // Ticks
  for (let i = 0; i < 360; i += 15) {
    const angle = (i * Math.PI) / 180;
    const len = i % 45 === 0 ? 10 : 5;
    const x1 = Math.cos(angle) * (radius - len);
    const y1 = Math.sin(angle) * (radius - len);
    const x2 = Math.cos(angle) * radius;
    const y2 = Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = i % 45 === 0 ? 2 : 1;
    ctx.strokeStyle = "#228B22";
    ctx.stroke();
  }

  // Compass letters
  ctx.fillStyle = "#006400";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const d = radius - 20;
  ctx.fillText("N", 0, -d);
  ctx.fillText("S", 0, d);
  ctx.fillText("E", d, 0);
  ctx.fillText("W", -d, 0);

  ctx.restore();

  // -----------------
  // Draw needle
  // -----------------
  ctx.save();
  ctx.translate(center, center);

  // On mobile, needle points relative to rotated dial
  // On desktop, needle points relative to static compass
  const needleAngle = isMobile
    ? ((qiblaAngle - deviceHeading + 360) % 360) * (Math.PI / 180)
    : (qiblaAngle * Math.PI) / 180;

  ctx.rotate(needleAngle);

  // Needle
  ctx.beginPath();
  ctx.moveTo(0, -radius + 25);
  ctx.lineTo(7, 0);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fillStyle = "#228B22";
  ctx.fill();

  // Kaaba marker
  ctx.fillStyle = "#000";
  ctx.fillRect(-7, -radius + 10, 14, 14);
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(-7, -radius + 10, 14, 4);

  ctx.restore();

  // -----------------
  // Display Qibla text
  // -----------------
  const direction = getCompassDirection(qiblaAngle);
  qiblaText.innerText = `Qibla: ${qiblaAngle.toFixed(1)}° (${direction})`;

  requestAnimationFrame(draw);
}

// -----------------
// Start
// -----------------
draw();
