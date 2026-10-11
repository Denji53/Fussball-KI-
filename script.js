const startButton = document.getElementById('startButton');
const videoElement = document.getElementById('cameraStream');
const container = document.getElementById('container');
const statusBox = document.getElementById('statusBox');

let faceLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

// Button zu Beginn deaktivieren, bis die KI geladen ist
startButton.disabled = true;
startButton.innerText = "Lade KI-Modell...";

// 1. MediaPipe Face Landmarker initialisieren
async function createFaceLandmarker() {
    try {
        const { FaceLandmarker, FilesetResolver } = vision;
        
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm"
        );
        
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFacialTransformationMatrixes: true,
            runningMode: runningMode,
            numFaces: 1
        });
        
        // Wenn alles geladen ist, aktivieren wir den Button wieder
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

// 2. Button-Klick: Kamera starten
startButton.addEventListener('click', async () => {
    if (!faceLandmarker) {
        alert("Das KI-Modell ist noch nicht bereit.");
        return;
    }

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
        alert("Kamerazugriff verweigert oder nicht unterstützt.");
    }
});

// 3. Erkennungs-Schleife
let lastVideoTime = -1;
async function predictWebcam() {
    if (!webcamRunning) return;

    let startTimeMs = performance.now();
    
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        
        const results = faceLandmarker.detectForVideo(videoElement, startTimeMs);

        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            statusBox.innerText = "Gesicht erkannt! ✅";
            statusBox.style.color = "green";
        } else {
            statusBox.innerText = "Kein Gesicht im Bild! ❌";
            statusBox.style.color = "red";
        }
    }

    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}
