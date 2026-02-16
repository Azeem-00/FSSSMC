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
      userLat = 9.082;
      userLon = 8.6753;
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
  );
}

// -----------------
// Device orientation fallback
// -----------------
function enableOrientationFallback() {
  if ("DeviceOrientationEvent" in window) {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const btn = document.createElement("button");
      btn.innerText = "Enable Compass";
      btn.style.fontSize = "18px";
      btn.style.padding = "10px 20px";
      btn.style.marginTop = "20px";
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {
        DeviceOrientationEvent.requestPermission().then((perm) => {
          if (perm === "granted") {
            window.addEventListener("deviceorientation", (e) => {
              if (e.alpha !== null) {
                deviceHeading = (360 - e.alpha) % 360;
              }
            });
            btn.remove();
          }
        });
      });
    } else {
      window.addEventListener("deviceorientationabsolute", (e) => {
        if (e.alpha !== null) deviceHeading = (360 - e.alpha) % 360;
      });
      window.addEventListener("deviceorientation", (e) => {
        if (e.alpha !== null) deviceHeading = (360 - e.alpha) % 360;
      });
    }
  }
}

enableOrientationFallback();

// -----------------
// Calculate Qibla
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
// Draw compass
// -----------------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Circle
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#228B22";
  ctx.stroke();

  // Ticks
  for (let i = 0; i < 360; i += 15) {
    const angle = (i * Math.PI) / 180;
    const len = i % 45 === 0 ? 10 : 5;
    const x1 = center + Math.cos(angle) * (radius - len);
    const y1 = center + Math.sin(angle) * (radius - len);
    const x2 = center + Math.cos(angle) * radius;
    const y2 = center + Math.sin(angle) * radius;
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
  ctx.fillText("N", center, center - d);
  ctx.fillText("S", center, center + d);
  ctx.fillText("E", center + d, center);
  ctx.fillText("W", center - d, center);

  // Qibla angle relative to device
  const qiblaAngle = calculateQibla(userLat, userLon);
  const target = (qiblaAngle - deviceHeading + 360) % 360;

  // Smooth animation
  let diff = target - displayAngle;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  displayAngle += diff * 0.1;

  // Needle
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((displayAngle * Math.PI) / 180);

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

  // Styled Qibla text only
  qiblaText.innerText = `Qibla: ${qiblaAngle.toFixed(1)}°`;

  requestAnimationFrame(draw);
}

// -----------------
// Start
// -----------------
draw();
