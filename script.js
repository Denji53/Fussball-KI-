const startButton = document.getElementById('startButton');
const videoElement = document.getElementById('cameraStream');
const container = document.getElementById('container');
const statusBox = document.getElementById('statusBox');

let faceLandmarker = undefined;
let runningMode = "VIDEO";
let webcamRunning = false;

// 1. MediaPipe Face Landmarker beim Start initialisieren (laden)
async function createFaceLandmarker() {
    const { FaceLandmarker, FilesetResolver } = vision;
    
    // Die Basis-Dateien für das Modell von Google laden
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFacialTransformationMatrixes: true, // WICHTIG: Holt uns die Rotationsmatrix[span_3](start_span)[span_3](end_span)[span_4](start_span)[span_4](end_span)!
        runningMode: runningMode,
        numFaces: 1
    });
    
    statusBox.innerText = "KI bereit! Klicke auf Start.";
}

createFaceLandmarker();

// 2. Button-Klick: Kamera starten und KI-Schleife aktivieren
startButton.addEventListener('click', async () => {
    if (!faceLandmarker) {
        alert("Das KI-Modell lädt noch einen Moment. Bitte kurz gedulden!");
        return;
    }

    try {
        const constraints = { video: { facingMode: 'user' } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        videoElement.srcObject = stream;
        container.style.display = 'block';
        startButton.style.display = 'none';
        webcamRunning = true;

        // Sobald das Video läuft, starten wir die Erkennungs-Schleife
        videoElement.addEventListener('loadeddata', predictWebcam);

    } catch (error) {
        console.error("Kamera-Fehler:", error);
        alert("Kamerazugriff verweigert oder nicht unterstützt.");
    }
});

// 3. Die Endlos-Schleife, die jeden Frame (Bild) analysiert
let lastVideoTime = -1;
async function predictWebcam() {
    if (!webcamRunning) return;

    let startTimeMs = performance.now();
    
    // Prüfen, ob ein neues Videobild da ist
    if (videoElement.currentTime !== lastVideoTime) {
        lastVideoTime = videoElement.currentTime;
        
        // Das Bild an den Face Landmarker übergeben
        const results = faceLandmarker.detectForVideo(videoElement, startTimeMs);

        // Prüfen, ob ein Gesicht erkannt wurde
        if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
            // Wir haben ein Gesicht! Die Rotationsmatrix ist da.
            // (In Station 8 wandeln wir das in konkrete Yaw-Werte um, hier siehst du schon, dass es klappt)
            statusBox.innerText = "Gesicht erkannt! ✅";
            statusBox.style.color = "green";
        } else {
            statusBox.innerText = "Kein Gesicht im Bild! ❌";
            statusBox.style.color = "red";
        }
    }

    // Schleife für das nächste Bild wiederholen
    if (webcamRunning) {
        window.requestAnimationFrame(predictWebcam);
    }
}
