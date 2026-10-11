import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

const startButton = document.getElementById('startButton');
const videoElement = document.getElementById('cameraStream');
const container = document.getElementById('container');
const statusBox = document.getElementById('statusBox');

let faceLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

// 1. MediaPipe Face Landmarker initialisieren
async function createFaceLandmarker() {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFacialTransformationMatrixes: true, // Liefert die Rotationsmatrix[span_3](start_span)[span_3](end_span)[span_4](start_span)[span_4](end_span)
            runningMode: runningMode,
            numFaces: 1
        });
        
        startButton.disabled = false;
        startButton.innerText = "Hi, wollen wir anfangen?";
        statusBox.innerText = "KI bereit!";
        statusBox.style.color = "blue";
    } catch (error) {
        console.error("Fehler beim Laden des KI-Modells:", error);
        statusBox.innerText = "Fehler beim Laden der KI";
        statusBox.style.color = "red";
    }
}

createFaceLandmarker();

startButton.addEventListener('click', async () => {
    if (!faceLandmarker) return;

    try {
        const constraints = { video: { facingMode: 'user' } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        videoElement.srcObject = stream;
        container.style.display = 'block';
        startButton.style.display = 'none';
        webcamRunning = true;

        videoElement.addEventListener('loadeddata', predictWebcam);
    } catch (error) {
        console.error("Kamera-Fehler:", error);
    }
});

// Hilfsfunktion: Berechnet den Yaw-Winkel aus der Rotationsmatrix
function getYawFromMatrix(matrix) {
    // Die Matrix ist ein Array mit 16 Werten (4x4 Transformation)
    // Yaw (Drehung um die Y-Achse) lässt sich aus bestimmten Indizes ableiten
    const m00 = matrix[0];
    const m20 = matrix[8];
    
    // Mathematische Annäherung für den Gierwinkel (Yaw) in Radiant, umgerechnet in Grad
    let yaw = Math.atan2(-m20, m00) * (180 / Math.PI);
    return Math.round(yaw);
}

// 2. Erkennungs-Schleife mit Yaw-Auslese
let lastVideoTime = -1;
async function predictWebcam() {
    if (!webcamRunning) return;

    let startTimeMs = performance.now();
    
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        
        const results = faceLandmarker.detectForVideo(videoElement, startTimeMs);

        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            // Wir holen uns die Rotationsmatrix des ersten erkannten Gesichts
            const matrix = results.facialTransformationMatrixes[0].data;
            const yaw = getYawFromMatrix(matrix);

            // Zeige den Yaw-Wert live auf dem Bildschirm an
            statusBox.innerText = `Yaw (Drehung): ${yaw}°`;
            
            // Kleine visuelle Hilfe: Farbwechsel je nach Richtung
            if (yaw > 25) {
                statusBox.style.color = "orange"; // Nach links gedreht
            } else if (yaw < -25) {
                statusBox.style.color = "purple"; // Nach rechts gedreht
            } else {
                statusBox.style.color = "green";  // Schaut nach vorne
            }

        } else {
            statusBox.innerText = "Kein Gesicht im Bild! ❌";
            statusBox.style.color = "red";
        }
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}
