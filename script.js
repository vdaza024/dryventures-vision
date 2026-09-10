document.addEventListener("DOMContentLoaded", async () => {

    const video = document.getElementById("webcam");
    const canvas = document.getElementById("canvas");
    const webcamButton = document.getElementById("webcamButton");
    const stopButton = document.getElementById("stopButton");
    const status = document.getElementById("status");

    // Verificar que los elementos existan
    if (!video || !canvas) {
        console.error("No se encontraron los elementos de vídeo o canvas.");
        return;
    }

    const ctx = canvas.getContext("2d");

    let model = null;
    let stream = null;
    let detecting = false;
    let previousCenter = null;

    // Cargar modelo
    try {

        status.textContent = "Cargando modelo de IA...";

        model = await cocoSsd.load();

        status.textContent = "Modelo cargado. Puedes activar la cámara.";

        webcamButton.disabled = false;

    } catch (error) {

        console.error("Error cargando el modelo:", error);

        status.textContent = "Error al cargar el modelo de IA.";

    }


    // ACTIVAR CÁMARA
    webcamButton.addEventListener("click", async () => {

        try {

            stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            video.srcObject = stream;

            await video.play();

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            webcamButton.disabled = true;
            stopButton.disabled = false;

            detecting = true;

            status.textContent = "Cámara activa. Analizando...";

            detectFrame();

        } catch (error) {

            console.error("Error accediendo a la cámara:", error);

            status.textContent = "No se pudo acceder a la cámara.";

        }

    });


    // DETENER CÁMARA
    stopButton.addEventListener("click", () => {

        detecting = false;

        if (stream) {

            stream.getTracks().forEach(track => track.stop());

            stream = null;
        }

        video.srcObject = null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        webcamButton.disabled = false;
        stopButton.disabled = true;

        status.textContent = "Cámara detenida.";

        previousCenter = null;

    });


    // DETECCIÓN
    async function detectFrame() {

        if (!detecting || !model) {
            return;
        }

        const predictions = await model.detect(video);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const people = predictions.filter(
            prediction =>
                prediction.class === "person" &&
                prediction.score > 0.5
        );


        // Dibujar personas detectadas
        people.forEach(person => {

            const [x, y, width, height] = person.bbox;

            ctx.strokeStyle = "#00a651";
            ctx.lineWidth = 3;

            ctx.strokeRect(x, y, width, height);

            ctx.font = "16px Arial";
            ctx.fillStyle = "#00a651";

            ctx.fillText(
                `Persona ${(person.score * 100).toFixed(0)}%`,
                x,
                y > 20 ? y - 5 : y + 20
            );

        });


        // Mostrar cantidad
        if (people.length === 0) {

            status.textContent = "Sin personas detectadas.";

            previousCenter = null;

        } else if (people.length > 1) {

            status.textContent =
                `${people.length} personas detectadas.`;

            previousCenter = null;

        } else {

            const person = people[0];

            const [x, y, width, height] = person.bbox;

            const centerX = x + width / 2;
            const centerY = y + height / 2;

            if (previousCenter) {

                const distance = Math.sqrt(
                    Math.pow(centerX - previousCenter.x, 2) +
                    Math.pow(centerY - previousCenter.y, 2)
                );

                if (distance > 8) {

                    status.textContent =
                        "1 persona detectada — EN MOVIMIENTO";

                } else {

                    status.textContent =
                        "1 persona detectada — QUIETA";
                }

            } else {

                status.textContent =
                    "1 persona detectada — analizando movimiento...";
            }

            previousCenter = {
                x: centerX,
                y: centerY
            };
        }


        requestAnimationFrame(detectFrame);
    }

});
