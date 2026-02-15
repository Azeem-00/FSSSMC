// ==========================
// MOSQUE-STYLE QIBLA COMPASS
// ==========================
const canvas = document.getElementById("compass");
const ctx = canvas.getContext("2d");

// Make canvas large for mosque TV display
canvas.width = 400;
canvas.height = 400;
const center = canvas.width / 2;
let currentAngle = 0;
let targetAngle = 0;

// Kaaba coordinates
const kaabaLat = 21.4225;
const kaabaLon = 39.8262;

// Get user location
navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  targetAngle = calculateQibla(lat, lon);
  document.getElementById("qiblaText").innerText = "Facing Qibla";
  animateNeedle();
});

// Calculate Qibla bearing in degrees
function calculateQibla(lat, lon) {
  const phiK = (kaabaLat * Math.PI) / 180;
  const lambdaK = (kaabaLon * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;

  const y = Math.sin(lambdaK - lambda);
  const x =
    Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Animate needle with glowing tip and halo
function animateNeedle() {
  let haloAngle = 0;

  function draw() {
    // Smooth needle rotation
    let diff = targetAngle - currentAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    currentAngle += diff * 0.05;

    // Update halo rotation
    haloAngle += 0.005;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ===============================
    // Draw static compass background
    // ===============================
    ctx.beginPath();
    ctx.arc(center, center, 180, 0, 2 * Math.PI);
    ctx.fillStyle = "#eef4f1";
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#3cb371";
    ctx.stroke();

    // Tick marks
    for (let i = 0; i < 360; i += 15) {
      const angle = (i * Math.PI) / 180;
      const x1 = center + Math.cos(angle) * 170;
      const y1 = center + Math.sin(angle) * 170;
      const x2 = center + Math.cos(angle) * 180;
      const y2 = center + Math.sin(angle) * 180;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "#2e8b57";
      ctx.lineWidth = i % 45 === 0 ? 3 : 1.5;
      ctx.stroke();
    }

    // ===============================
    // Rotating subtle halo animation
    // ===============================
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(haloAngle);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 150);
    gradient.addColorStop(0, "rgba(60,179,113,0.05)");
    gradient.addColorStop(1, "rgba(60,179,113,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();

    // ===============================
    // Needle pointing to Qibla
    // ===============================
    const angle = (currentAngle * Math.PI) / 180;
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -140);
    ctx.lineTo(10, 0);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fillStyle = "#3cb371";
    ctx.fill();

    // Glowing needle tip
    const gradientTip = ctx.createRadialGradient(0, -140, 0, 0, -140, 15);
    gradientTip.addColorStop(0, "rgba(60,179,113,1)");
    gradientTip.addColorStop(1, "rgba(60,179,113,0)");
    ctx.beginPath();
    ctx.arc(0, -140, 15, 0, 2 * Math.PI);
    ctx.fillStyle = gradientTip;
    ctx.fill();

    ctx.restore();

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#2e8b57";
    ctx.fill();

    requestAnimationFrame(draw);
  }
  draw();
}
