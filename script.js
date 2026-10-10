// Wir holen uns die Elemente anhand ihrer IDs aus dem HTML
const startButton = document.getElementById('startButton');
const videoElement = document.getElementById('cameraStream');

// Wir lauschen auf einen Klick auf den Start-Button
startButton.addEventListener('click', async () => {
    try {
        // Einstellungen für die Kamera: 'user' steht für die Frontkamera (Selfie-Kamera)
        const constraints = {
            video: { facingMode: 'user' }
        };

        // navigator.mediaDevices.getUserMedia fragt beim Browser/iPhone nach der Kamera-Erlaubnis
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Wenn der Nutzer "Erlauben" drückt, übergeben wir den Kamerastream an das <video>-Element
        videoElement.srcObject = stream;
        
        // Jetzt schalten wir das Video sichtbar undblenden den Start-Button aus
        videoElement.style.display = 'block';
        startButton.style.display = 'none';

    } catch (error) {
        // Falls der Nutzer ablehnt oder ein Fehler auftritt, landen wir hier
        console.error("Fehler beim Zugriff auf die Kamera:", error);
        alert("Kamerazugriff wurde verweigert oder nicht unterstützt.");
    }
});
