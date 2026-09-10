
document.addEventListener("DOMContentLoaded", async () => {

  const video = document.getElementById("webcam");
  const canvas = document.getElementById("canvas");
  const webcamButton = document.getElementById("webcamButton");
  const stopButton = document.getElementById("stopButton");
  const status = document.getElementById("status");

  const ctx = canvas.getContext("2d");

  let model = null;
  let stream = null;
  let detecting = false;
  let previousCenter = null;

  // ==========================
  // CARGAR MODELO
  // ==========================

  try {

    status.textContent = "Cargando modelo de IA...";

    model = await cocoSsd.load();

    status.textContent = "Modelo cargado. Puedes activar la cámara.";

    webcamButton.disabled = false;

    console.log("Modelo COCO-SSD cargado correctamente.");

  } catch (error) {

    console.error("Error cargando el modelo:", error);

    status.textContent = "Error al cargar el modelo.";

  }


  // ==========================
  // ACTIVAR CÁMARA
  // ==========================

  webcamButton.addEventListener("click", async () => {

    try {

      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      video.srcObject = stream;

      await video.play();

      // Esperar a que el video tenga dimensiones
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      } else {

        video.addEventListener("loadedmetadata", () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }, { once: true });

      }

      webcamButton.disabled = true;
      stopButton.disabled = false;

      detecting = true;
      previousCenter = null;

      status.textContent = "Cámara activa. Analizando...";

      console.log("Cámara activada.");

      detectObjects();

    } catch (error) {

      console.error("Error accediendo a la cámara:", error);

      status.textContent = "No se pudo acceder a la cámara.";

    }

  });


  // ==========================
  // DETENER CÁMARA
  // ==========================

  stopButton.addEventListener("click", () => {

    detecting = false;

    if (stream) {

      stream.getTracks().forEach(track => track.stop());

      stream = null;
    }

    video.srcObject = null;

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    webcamButton.disabled = false;
    stopButton.disabled = true;

    previousCenter = null;

    status.textContent = "Cámara detenida.";

    console.log("Cámara detenida.");

  });


  // ==========================
  // DETECCIÓN DE PERSONAS
  // ==========================

  async function detectObjects() {

    if (!detecting || !model) {
      return;
    }

    try {

      const predictions = await model.detect(
        video,
        20,
        0.5
      );

      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );


      // Filtrar solamente personas
      const people = predictions.filter(
        prediction =>
          prediction.class === "person" &&
          prediction.score >= 0.5
      );


      // ==========================
      // DIBUJAR PERSONAS
      // ==========================

      people.forEach(person => {

        const [
          x,
          y,
          width,
          height
        ] = person.bbox;


        // Recuadro
        ctx.strokeStyle = "#00a651";
        ctx.lineWidth = 4;

        ctx.strokeRect(
          x,
          y,
          width,
          height
        );


        // Texto de confianza
        ctx.fillStyle = "#00a651";
        ctx.font = "18px Arial";

        ctx.fillText(
          `Persona ${(person.score * 100).toFixed(0)}%`,
          x,
          Math.max(20, y - 8)
        );

      });


      // ==========================
      // ANÁLISIS DE MOVIMIENTO
      // ==========================

      if (people.length === 0) {

        status.textContent =
          "Sin personas detectadas.";

        previousCenter = null;

      }

      else if (people.length > 1) {

        status.textContent =
          `${people.length} personas detectadas.`;

        previousCenter = null;

      }

      else {

        const person = people[0];

        const [
          x,
          y,
          width,
          height
        ] = person.bbox;


        const centerX =
          x + width / 2;

        const centerY =
          y + height / 2;


        if (previousCenter) {

          const distance = Math.sqrt(

            Math.pow(
              centerX - previousCenter.x,
              2
            )

            +

            Math.pow(
              centerY - previousCenter.y,
              2
            )

          );


          if (distance > 8) {

            status.textContent =
              "1 persona detectada — EN MOVIMIENTO";

          } else {

            status.textContent =
              "1 persona detectada — QUIETA";

          }

        }

        else {

          status.textContent =
            "1 persona detectada — analizando movimiento...";

        }


        previousCenter = {

          x: centerX,
          y: centerY

        };

      }


    } catch (error) {

      console.error(
        "Error durante la detección:",
        error
      );

    }


    // Continuar analizando
    if (detecting) {

      requestAnimationFrame(
        detectObjects
      );

    }

  }

});
