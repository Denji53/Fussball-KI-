import { PoseLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/+esm";

const startButton = document.getElementById('startButton');
const videoElement = document.getElementById('cameraStream');
const container = document.getElementById('container');
const statusBox = document.getElementById('statusBox');
//const slider = document.getElementById("thresholdSlider");
//const sliderValueText = document.getElementById("thresholdValue");

let poseLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

// Button zu Beginn deaktivieren, bis die KI geladen ist
startButton.disabled = true;
startButton.innerText = "Lade Pose-KI...";

// 1. MediaPipe Pose Landmarker initialisieren
async function createPoseLandmarker() {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );

        poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
                delegate: "GPU"
            },
            runningMode: runningMode,
            numPoses: 1
        });

        startButton.disabled = false;
        startButton.innerText = "Hi, wollen wir anfangen?";
        statusBox.innerText = "Pose-KI bereit!";
        statusBox.style.color = "blue";
    } catch (error) {
        console.error("Fehler beim Laden der Pose-KI:", error);
        statusBox.innerText = "Fehler beim Laden der KI";
        statusBox.style.color = "red";
    }
}

createPoseLandmarker();

// 2. Button-Klick: Kamera starten
startButton.addEventListener('click', async () => {
    if (!poseLandmarker) return;

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

// 3. Erkennungs-Schleife für den Körper
let lastVideoTime = -1;
async function predictWebcam() {
    if (!webcamRunning) return;

    let startTimeMs = performance.now();

    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;

        const results = poseLandmarker.detectForVideo(videoElement, startTimeMs);

        // Prüfen, ob Körper-Landmarks (Skelettpunkte) gefunden wurden
        if (results.landmarks && results.landmarks.length > 0) {
            // Bei MediaPipe Pose sind Punkt 11 und 12 die linke und rechte Schulter
            //const threshold = parseFloat(slider.value);
            //sliderValueText.innerText = threshold;
            const landmarks = results.landmarks[0];
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            const nose = landmarks[0];
            const midSchulter = (rightShoulder.x + leftShoulder.x) * 0.5;
            let threshold = 0.1;
            const activePoint = nose || rightEar || leftEar;

            if (activePoint) {
                if (nose.x && nose.x > midSchulter + threshold) {
                    statusBox.innerText = "rechts";

                }
                else if (nose.x && nose.x < midSchulter - threshold) {
                    statusBox.innerText = "links";
                }
                else {
                    statusBox.innerText = "mitti";

                }
                statusBox.style.color = "green";
            }
            else {
                statusBox.innerText = "Kein Körper im Bild! ❌";
                statusBox.style.color = "red";
            }

        }

        if (webcamRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
    }
}
