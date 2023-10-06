document.addEventListener("DOMContentLoaded", function() {

    updateMessageAndButtonState();

    let mediaRecorder;
    let audioChunks = [];
    const recordButton = document.getElementById("recordButton");
    const timeLabel = document.getElementById('timeLabel');
    let recordingTimeout;

    recordButton.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            clearTimeout(recordingTimeout);
            clearInterval(countdownInterval);
            mediaRecorder.stop();
            recordButton.textContent = "Please Wait";
            recordButton.disabled = true;
        } else {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = event => {
                        audioChunks.push(event.data);
                    };
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                        sendData(audioBlob);
                    };
                    mediaRecorder.start();
                    recordButton.textContent = "Stop Recording";
                    startCountdown(2 * 60);
                });
        }
    });

    function displayTranscript(transcript, audioBlob, isError=false) {
        const transcriptsDiv = document.getElementById("transcripts");
        const transcriptDiv = document.createElement("div");
        transcriptDiv.className = "transcript";

        const transcriptText = document.createElement("p");
        transcriptText.textContent = transcript;
        if (isError) {
            transcriptText.style.color = "red";
        }
        transcriptDiv.appendChild(transcriptText);

        if (!isError) {
            const toolbar = document.createElement("div");
            toolbar.className = "toolbar";
            
            const playButton = document.createElement("button");
            playButton.innerHTML = "&#x1F50A;";
            playButton.title = "Play";
            playButton.disabled = true;
            playButton.addEventListener("click", () => playAudio(audioBlob, playButton));
            toolbar.appendChild(playButton);
            
            const deleteButton = document.createElement("button");
            deleteButton.innerHTML = "&#x1F5D1;";
            deleteButton.title = "Delete";
            deleteButton.addEventListener("click", () => deleteTranscript(transcriptDiv));
            toolbar.appendChild(deleteButton);
            
            const copyButton = document.createElement("button");
            copyButton.innerHTML = "&#x1F4CB;";
            copyButton.title = "Copy";
            copyButton.addEventListener("click", () => copyToClipboard(transcript));
            toolbar.appendChild(copyButton);
            
            transcriptDiv.appendChild(toolbar);

            updateMessageAndButtonState();
        }
        
        transcriptsDiv.appendChild(transcriptDiv);
        // Scroll to the bottom
        transcriptsDiv.scrollTop = transcriptsDiv.scrollHeight;
       // Hide the placeholder
       document.getElementById("placeholder").style.display = "none";
    }

    function deleteTranscript(transcriptDiv) {
        transcriptDiv.remove();
    }

    function copyToClipboard(text) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
    }

    function playAudio(audioBlob, playButton) {
        disableAllButtons(true);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        audio.addEventListener("ended", () => {
            disableAllButtons(false);
        });
    }

    function disableAllButtons(disable) {
        document.querySelectorAll("button").forEach(button => {
            button.disabled = disable;
        });
    }

    function sendData(data) {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/upload", true);
        xhr.onload = () => {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status >= 400) {
                displayTranscript(response.error, null, true);
            } else {
                displayTranscript(response.transcript, data);
            }
            recordButton.textContent = "Start Recording";
            recordButton.disabled = false;
            timeLabel.textContent = "Time Limit: 2 minutes";
            // Enable all speaker buttons
            document.querySelectorAll(".transcript button").forEach(button => {
                button.disabled = false;
            });
        };
        const formData = new FormData();
        formData.append("audio", data);
        xhr.send(formData);
    }

    function startCountdown(seconds) {
        recordingTimeout = setTimeout(() => {
            console.log('setTimeout callback running');
            if (mediaRecorder && mediaRecorder.state === "recording") {
                mediaRecorder.stop();
                recordButton.textContent = "Please Wait";
                recordButton.disabled = true;
            }
        }, seconds * 1000);

        let remainingTime = seconds;
        countdownInterval = setInterval(() => {
            remainingTime--;
            if (remainingTime <= 0) {
                clearInterval(countdownInterval);
            } else {
                timeLabel.textContent = `Time Left: ${formatTime(remainingTime)}`;
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
        } else {
            return `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
        }
    }

    function updateMessageAndButtonState() {
        const remainingElement = document.getElementById('remaining');
        const messageElement = document.getElementById('message');
        const recordButton = document.getElementById('recordButton');
        
        // Get the request count from the cookie
        const requestCount = getCookie('request_count') || 0;
        const remaining = 50 - requestCount;

        // Update the message
        remainingElement.textContent = remaining;

        // If the remaining count is 0, update the message and disable the button
        if (remaining <= 0) {
            messageElement.textContent = 'You have reached your allowed maximum of 50 translations.';
            recordButton.disabled = true;
        }
    }

    function getCookie(name) {
        const value = "; " + document.cookie;
        const parts = value.split("; " + name + "=");
        if (parts.length === 2) return parts.pop().split(";").shift();
    }
});