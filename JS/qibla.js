const canvas = document.getElementById("compass");
const ctx = canvas.getContext("2d");
const qiblaText = document.getElementById("qiblaText");

const center = canvas.width / 2;
const radius = canvas.width / 2 - 10;

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

let userLat = 0;
let userLon = 0;
let currentAngle = 0;
let displayAngle = 0;

// -----------------
// Get location
// -----------------
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      currentAngle = calculateQibla(userLat, userLon); // set initial
    },
    () => {
      // fallback to Nigeria
      userLat = 9.082;
      userLon = 8.6753;
      currentAngle = calculateQibla(userLat, userLon);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
  );
}

// -----------------
// Enable compass on mobile
// -----------------
function enableCompass() {
  if ("DeviceOrientationEvent" in window) {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      // iOS 13+
      const btn = document.createElement("button");
      btn.innerText = "Enable Compass";
      btn.style.fontSize = "18px";
      btn.style.padding = "10px 20px";
      btn.style.marginTop = "20px";
      document.body.appendChild(btn);

      btn.addEventListener("click", () => {
        DeviceOrientationEvent.requestPermission().then((perm) => {
          if (perm === "granted") {
            window.addEventListener(
              "deviceorientation",
              handleOrientation,
              true,
            );
            btn.remove();
          } else {
            alert("Compass permission denied.");
          }
        });
      });
    } else {
      // Android & others
      window.addEventListener(
        "deviceorientationabsolute",
        handleOrientation,
        true,
      );
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  } else {
    alert("Device orientation not supported.");
  }
}

// -----------------
// Handle orientation
// -----------------
function handleOrientation(event) {
  let heading = null;

  if (event.webkitCompassHeading !== undefined) {
    heading = event.webkitCompassHeading; // iOS
  } else if (event.absolute && event.alpha !== null) {
    heading = 360 - event.alpha; // Android absolute
  } else if (event.alpha !== null) {
    heading = 360 - event.alpha; // fallback
  }

  if (heading !== null) {
    currentAngle = (calculateQibla(userLat, userLon) - heading + 360) % 360;
  }
}

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

  // Outer circle
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#f8fffb";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#3cb371";
  ctx.stroke();

  // Tick marks
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

  // Direction letters
  ctx.fillStyle = "#2e8b57";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const d = radius - 20;
  ctx.fillText("N", center, center - d);
  ctx.fillText("S", center, center + d);
  ctx.fillText("E", center + d, center);
  ctx.fillText("W", center - d, center);

  // Smooth rotation
  let diff = currentAngle - displayAngle;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  displayAngle += diff * 0.1;

  // Needle
  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((displayAngle * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, -radius + 25);
  ctx.lineTo(6, 0);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fillStyle = "#3cb371";
  ctx.fill();

  // Kaaba marker
  ctx.fillStyle = "#111";
  ctx.fillRect(-6, -radius + 10, 12, 12);
  ctx.fillStyle = "#ffd700";
  ctx.fillRect(-6, -radius + 10, 12, 3);

  ctx.restore();

  // Center dot
  ctx.beginPath();
  ctx.arc(center, center, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#2e8b57";
  ctx.fill();

  // Text
  qiblaText.innerText = `Qibla: ${displayAngle.toFixed(1)}°`;

  requestAnimationFrame(draw);
}

// -----------------
// Start
// -----------------
enableCompass();
draw();
