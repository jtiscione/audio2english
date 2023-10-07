#!/usr/local/bin/python
from dotenv import load_dotenv
import openai
from flask import Flask, render_template, request, jsonify, send_from_directory, make_response
from pydub import AudioSegment
import os, sys, glob
from datetime import datetime
import random
import string

# docker build -t flask-ai-container .
# docker run -p 8000:8000 --env-file .env flask-ai-container
load_dotenv() # An alternative would be setting openai.api_key

app = Flask(__name__)
# app.config['EXPLAIN_TEMPLATE_LOADING'] = True

@app.route('/')
def index():
    # Check if client_id cookie is set
    client_id = request.cookies.get('client_id')
    
    # If not, generate a new client_id
    if client_id is None:
        client_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    
    # Render the HTML page and set/update the client_id cookie
    response = make_response(render_template('index.html'))
    response.set_cookie('client_id', client_id)
    return response

@app.route("/backend")
def backend():
    return render_template("backend.html")

@app.route('/upload', methods=['POST'])
def upload():
    request_count = int(request.cookies.get("request_count", 0))
    if request_count < 50:
        try:
            # Ensure data directory exists
            if not os.path.exists('data'):
                os.makedirs('data')
            audio_file = request.files['audio']
            timestamp = datetime.now().strftime("%Y_%m_%d_%H_%M_%S")
            audio_path_wav = os.path.join('data', f"audio_{timestamp}.wav")
            audio_file.save(audio_path_wav)

            # Transcribe the audio file
            with open(audio_path_wav, "rb") as audio_file:
                transcript_response = openai.Audio.translate("whisper-1", audio_file)
                transcript_text = transcript_response.get("text", "")

            transcript_path_txt = os.path.join('data', f"audio_{timestamp}.txt")
            with open(transcript_path_txt, "w") as transcript_file:
                transcript_file.write(transcript_text)
            
            # Upload the cookie value
            client_id_path_cookie = os.path.join('data', f"audio_{timestamp}.cookie")

            # Get the client_id from the cookie
            client_id = request.cookies.get('client_id', 'unknown')
            with open(client_id_path_cookie, 'w', encoding='utf-8') as file:
                file.write(client_id)

            response = make_response(jsonify(success=True, transcript=transcript_text))
            response.set_cookie('request_count', str(request_count + 1))

            return response
        except Exception as e:
            app.logger.error(str(e))
            # Return a user-friendly error message
            return jsonify(error=f"An error occurred while processing the audio. Please try again. (Error:{str(e)})"), 500
    else:
        return jsonify(error=True, message="Maximum number of translations reached."), 400

@app.route("/get_transcripts", methods=['GET'])
def get_transcripts():
    # Implement logic to fetch the list of transcript texts and audio file names
    # from the 'data' directory and return them as JSON.
    data_dir = 'data'
    transcripts = []
    
    #Ensure data directory exists
    if not os.path.exists(data_dir):
        return jsonify(error="Data directory not found."), 500

    # Get all .txt files in the data directory
    txt_files = glob.glob(os.path.join(data_dir, '*.txt'))

    # Read the content of each .txt file and store it along with the filename
    for txt_file in txt_files:
        try:
            with open(txt_file, 'r', encoding='utf-8') as file:
                text_content = file.read()
                # Extract filename without extension for matching with .wav file
                base_filename = os.path.splitext(os.path.basename(txt_file))[0]
                wav_file = os.path.join(data_dir, base_filename + '.wav')
                cookie_file = os.path.join("data", f"{base_filename}.cookie")
                
                # Read the client_id from .cookie file
                client_id = "unknown"
                if os.path.exists(cookie_file):
                    with open(cookie_file, 'r', encoding='utf-8') as file:
                        client_id = file.read().strip()
                
                # Check if corresponding .wav file exists
                if os.path.exists(wav_file):
                    transcripts.append({
                        'filename': base_filename,
                        'text': text_content.strip(),
                        'client_id': client_id
                    })
                else:
                    print(f"Warning: Corresponding .wav file not found for {txt_file}")
        except Exception as e:
            print(f"Error reading {txt_file}: {str(e)}")

    return jsonify(transcripts)

@app.route('/get_audio/<filename>', methods=['GET'])
def get_audio(filename):
    try:
        return send_from_directory('data', filename)
    except FileNotFoundError:
        return "File not found.", 404

@app.route('/delete_transcript/<filename>', methods=['DELETE'])
def delete_transcript(filename):
    try:
        os.remove(os.path.join('data', filename + '.wav'))
        os.remove(os.path.join('data', filename + '.txt'))
        os.remove(os.path.join('data', filename + '.cookie'))
        return '', 204  # 204: No Content
    except FileNotFoundError:
        return 'File not found.', 404
    except Exception as e:
        print(f"Error deleting files: {str(e)}")
        return 'Internal Server Error', 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
