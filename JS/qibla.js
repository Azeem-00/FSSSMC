const canvas = document.getElementById("compass");
const ctx = canvas.getContext("2d");
const qiblaText = document.getElementById("qiblaText");

const center = canvas.width / 2;
const radius = canvas.width / 2 - 10;

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

// State
let userLat = 0;
let userLon = 0;
let currentAngle = 0;
let targetAngle = 0;
let dynamicMode = false;

// -----------------
// Get user location
// -----------------
navigator.geolocation.getCurrentPosition(
  (pos) => {
    userLat = pos.coords.latitude;
    userLon = pos.coords.longitude;

    targetAngle = calculateQibla(userLat, userLon);
    enableCompassIfAvailable();
    startDrawing();
  },
  () => {
    // fallback (Nigeria)
    userLat = 9.082;
    userLon = 8.6753;

    targetAngle = calculateQibla(userLat, userLon);
    startDrawing();
  },
);

// -----------------
// Enable phone compass
// -----------------
function enableCompassIfAvailable() {
  if ("DeviceOrientationEvent" in window) {
    dynamicMode = true;

    // iOS 13+ requires permission
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const btn = document.createElement("button");
      btn.innerText = "Enable Compass";
      btn.style.position = "absolute";
      btn.style.top = "10px";
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {
        DeviceOrientationEvent.requestPermission().then((permission) => {
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, {
              capture: true,
              passive: true,
            });
            btn.remove();
          }
        });
      });
    } else {
      // Android and other devices
      window.addEventListener("deviceorientationabsolute", handleOrientation, {
        capture: true,
        passive: true,
      });
      window.addEventListener("deviceorientation", handleOrientation, {
        capture: true,
        passive: true,
      });
    }
  }
}

// -----------------
// Handle device rotation
// -----------------
function handleOrientation(event) {
  let heading;

  // iOS
  if (event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading; // 0 = north
  }
  // Android & others with absolute orientation
  else if (event.absolute && event.alpha !== null) {
    heading = 360 - event.alpha;
  }
  // Fallback: ignore if no heading
  else if (event.alpha !== null) {
    heading = 360 - event.alpha; // may be approximate
  } else {
    return;
  }

  // Update target angle (Qibla relative to north)
  targetAngle = (calculateQibla(userLat, userLon) - heading + 360) % 360;
}

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
// Convert to direction text
// -----------------
function getDirection(deg) {
  if (deg >= 337.5 || deg < 22.5) return "North";
  if (deg < 67.5) return "North-East";
  if (deg < 112.5) return "East";
  if (deg < 157.5) return "South-East";
  if (deg < 202.5) return "South";
  if (deg < 247.5) return "South-West";
  if (deg < 292.5) return "West";
  return "North-West";
}

// -----------------
// Drawing loop
// -----------------
function startDrawing() {
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //// outer circle
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fffb";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#3cb371";
    ctx.stroke();

    //// tick marks
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
      ctx.strokeStyle = "#3cb371";
      ctx.stroke();
    }

    //// Direction letters
    ctx.fillStyle = "#2e8b57";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const d = radius - 20;
    ctx.fillText("N", center, center - d);
    ctx.fillText("S", center, center + d);
    ctx.fillText("E", center + d, center);
    ctx.fillText("W", center - d, center);

    //// rotate needle
    ctx.save();
    ctx.translate(center, center);

    let angleRad;
    if (dynamicMode) {
      let diff = targetAngle - currentAngle;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      currentAngle += diff * 0.1;
      angleRad = (currentAngle * Math.PI) / 180;
    } else {
      angleRad = (targetAngle * Math.PI) / 180;
    }

    ctx.rotate(angleRad);

    //// needle
    ctx.beginPath();
    ctx.moveTo(0, -radius + 25);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = "#3cb371";
    ctx.fill();

    //// Kaaba marker
    ctx.fillStyle = "#111";
    ctx.fillRect(-6, -radius + 10, 12, 12);
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(-6, -radius + 10, 12, 3);

    ctx.restore();

    //// center dot
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#2e8b57";
    ctx.fill();

    //// text
    qiblaText.innerText = `Qibla: ${targetAngle.toFixed(1)}° ${getDirection(targetAngle)}`;

    requestAnimationFrame(draw);
  }

  draw();
}
