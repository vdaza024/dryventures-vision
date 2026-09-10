let model = null;
let video;
let canvas;
let ctx;

let previousPerson = null;
let cameraStarted = false;


// ==========================================
// INICIAR LA APLICACIÓN
// ==========================================

window.addEventListener("DOMContentLoaded", () => {

  video = document.getElementById("webcam");
  canvas = document.getElementById("canvas");

  if (!video || !canvas) {
    console.error("No se encontraron los elementos de vídeo o canvas.");
    return;
  }

  ctx = canvas.getContext("2d");

  loadModel();

});


// ==========================================
// CARGAR MODELO DE IA
// ==========================================

async function loadModel() {

  const status = document.getElementById("status");
  const button = document.getElementById("webcamButton");

  status.textContent = "Cargando modelo de visión artificial...";

  try {

    model = await cocoSsd.load();

    status.textContent =
      "Modelo listo. Puedes activar la cámara.";

    button.disabled = false;

  } catch (error) {

    status.textContent =
      "No se pudo cargar el modelo de IA.";

    console.error(error);

  }

}


// ==========================================
// ACTIVAR CÁMARA
// ==========================================

document.addEventListener("click", async (event) => {

  if (event.target.id !== "webcamButton") {
    return;
  }

  if (cameraStarted) {
    return;
  }

  const button = document.getElementById("webcamButton");
  const stopButton = document.getElementById("stopButton");
  const status = document.getElementById("status");

  try {

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

    video.srcObject = stream;

    cameraStarted = true;

    button.disabled = true;
    button.textContent = "Cámara activa";

    stopButton.disabled = false;

    status.textContent =
      "Analizando imagen en tiempo real...";

    video.addEventListener(
      "loadeddata",
      startDetection,
      { once: true }
    );

  } catch (error) {

    status.textContent =
      "No fue posible acceder a la cámara.";

    console.error(error);

  }

});


// ==========================================
// DETENER CÁMARA
// ==========================================

document.addEventListener("click", (event) => {

  if (event.target.id !== "stopButton") {
    return;
  }

  if (video.srcObject) {

    const tracks =
      video.srcObject.getTracks();

    tracks.forEach(track => track.stop());

    video.srcObject = null;
  }

  cameraStarted = false;
  previousPerson = null;

  const button =
    document.getElementById("webcamButton");

  const stopButton =
    document.getElementById("stopButton");

  const status =
    document.getElementById("status");

  button.disabled = false;
  button.textContent = "Activar cámara";

  stopButton.disabled = true;

  status.textContent =
    "Cámara detenida.";

  document.getElementById("personCount").textContent = "0";

  document.getElementById("movementStatus").textContent =
    "Esperando...";

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

});


// ==========================================
// INICIAR DETECCIÓN
// ==========================================

function startDetection() {

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  detectObjects();

}


// ==========================================
// DETECTAR PERSONAS
// ==========================================

async function detectObjects() {

  if (!model || !video || !cameraStarted) {
    return;
  }

  const predictions =
    await model.detect(video, 20, 0.5);


  // Limpiar canvas

  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // Buscar únicamente personas

  const people = predictions.filter(
    prediction =>
      prediction.class === "person"
  );


  // Mostrar número de personas

  const personCount =
    document.getElementById("personCount");

  personCount.textContent =
    people.length;


  // ========================================
  // DIBUJAR PERSONAS
  // ========================================

  people.forEach(person => {

    const [x, y, width, height] =
      person.bbox;

    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 3;

    ctx.strokeRect(
      x,
      y,
      width,
      height
    );

    ctx.fillStyle = "#00ff00";
    ctx.font = "16px Arial";

    ctx.fillText(
      "Persona " +
      Math.round(person.score * 100) +
      "%",
      x,
      Math.max(y - 8, 16)
    );

  });


  // ========================================
  // ANALIZAR MOVIMIENTO
  // ========================================

  const movementStatus =
    document.getElementById("movementStatus");


  if (people.length === 1) {

    const person = people[0];

    const [x, y, width, height] =
      person.bbox;


    // Centro de la persona

    const centerX =
      x + width / 2;

    const centerY =
      y + height / 2;


    // Comparar con posición anterior

    if (previousPerson !== null) {

      const distance =
        Math.sqrt(
          Math.pow(
            centerX - previousPerson.x,
            2
          ) +
          Math.pow(
            centerY - previousPerson.y,
            2
          )
        );


      if (distance > 8) {

        movementStatus.textContent =
          "En movimiento";

      } else {

        movementStatus.textContent =
          "Quieto";

      }

    } else {

      movementStatus.textContent =
        "Analizando...";

    }


    previousPerson = {
      x: centerX,
      y: centerY
    };


  } else if (people.length === 0) {

    movementStatus.textContent =
      "Sin personas";

    previousPerson = null;


  } else {

    movementStatus.textContent =
      "Varias personas";

    previousPerson = null;

  }


  // Continuar analizando

  requestAnimationFrame(
    detectObjects
  );

}
