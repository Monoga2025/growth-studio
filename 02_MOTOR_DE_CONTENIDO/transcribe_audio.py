import os
import speech_recognition as sr
from pydub import AudioSegment
from pydub.silence import split_on_silence

def transcribe_audio_file(file_path):
    print(f"Loading audio: {file_path}")
    sound = AudioSegment.from_file(file_path)
    
    # Normalize sound
    sound = sound.set_channels(1).set_frame_rate(16000)
    
    # Split into chunks of around 15 seconds
    chunk_length_ms = 15000
    chunks = [sound[i:i + chunk_length_ms] for i in range(0, len(sound), chunk_length_ms)]
    print(f"Divided into {len(chunks)} chunks of 15s...")
    
    r = sr.Recognizer()
    full_transcript = []
    
    for i, chunk in enumerate(chunks):
        chunk_name = f"temp_chunk_{i}.wav"
        chunk.export(chunk_name, format="wav")
        
        with sr.AudioFile(chunk_name) as source:
            audio_listened = r.record(source)
            try:
                text = r.recognize_google(audio_listened, language="es-ES")
                print(f"Chunk {i+1}/{len(chunks)}: {text}")
                full_transcript.append(text)
            except sr.UnknownValueError:
                print(f"Chunk {i+1}/{len(chunks)}: [Inaudible / Silencio]")
            except Exception as e:
                print(f"Chunk {i+1}/{len(chunks)} error: {e}")
                
        if os.path.exists(chunk_name):
            os.remove(chunk_name)
            
    transcript_text = " ".join(full_transcript)
    output_txt = file_path.rsplit(".", 1)[0] + "_transcript.txt"
    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(transcript_text)
        
    print("\n--- TRANSCRIPCIÓN COMPLETA EXACTA ---")
    print(transcript_text)
    print(f"\nGuardado en: {output_txt}")
    return transcript_text

if __name__ == "__main__":
    import sys
    audio_path = sys.argv[1] if len(sys.argv) > 1 else "instagram_audio.mp3"
    transcribe_audio_file(audio_path)
