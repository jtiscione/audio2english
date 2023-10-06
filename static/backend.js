document.addEventListener("DOMContentLoaded", function() {
    fetchTranscripts();
});

function fetchTranscripts() {
    // Fetch the list of transcripts and audio file names from the server
    // and display them in the transcripts div.
    // Implement the fetch logic here.
    fetch('/get_transcripts')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        const transcriptsDiv = document.getElementById('transcripts');
        data.forEach(transcript => {
            displayTranscript(transcriptsDiv, transcript.filename, transcript.text, transcript.client_id);
        });
    })
    .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
    });
}


function displayTranscript(transcriptsDiv, filename, text, client_id) {

    const transcriptDiv = document.createElement('div');
    transcriptDiv.className = 'transcript';

    const clientIdText = document.createElement('p');
    clientIdText.innerHTML = `<strong><em>${client_id}</em></strong>`;
    transcriptDiv.appendChild(clientIdText);

    const transcriptText = document.createElement('p');
    transcriptText.textContent = text;
    transcriptDiv.appendChild(transcriptText);

    const toolbar = document.createElement('div');
    toolbar.className = 'toolbar';

    const playButton = document.createElement('button');
    playButton.innerHTML = '&#x1F50A;';
    playButton.title = 'Play';
    playButton.addEventListener('click', () => playAudio(filename));
    toolbar.appendChild(playButton);

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#x1F5D1;';
    deleteButton.title = 'Delete';
    deleteButton.addEventListener('click', () => {
        deleteTranscript(filename, transcriptDiv);
    });
    toolbar.appendChild(deleteButton);

    const copyButton = document.createElement('button');
    copyButton.innerHTML = '&#x1F4CB;';
    copyButton.title = 'Copy';
    copyButton.addEventListener('click', () => copyToClipboard(text));
    toolbar.appendChild(copyButton);

    transcriptDiv.appendChild(toolbar);
    transcriptsDiv.appendChild(transcriptDiv);
}


function playAudio(filename) {
    // Implement the logic to fetch and play the audio file here.
    const audio = new Audio(`/get_audio/${filename}.wav`);
    audio.play()
        .catch(error => {
            console.error('Error playing audio:', error);
            alert('Error playing audio. Please try again later.');
        });
}

function deleteTranscript(filename, transcriptDiv) {
    // Implement the logic to delete the transcript and audio file here.
    fetch(`/delete_transcript/${filename}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.statusText);
        }
        // Remove the transcriptDiv from the DOM
        transcriptDiv.remove();
    })
    .catch(error => {
        console.error('There has been a problem with your fetch operation:', error);
        alert('Error deleting transcript. Please try again later.');
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => console.error(err));
}
