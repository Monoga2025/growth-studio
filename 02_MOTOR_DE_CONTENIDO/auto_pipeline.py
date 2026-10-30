"""
🎬 MOTOR AUTOMÁTICO: ENLACE DE VIDEO -> TRANSCRIPCIÓN EXACTA -> TELEPROMPTER MÓVIL -> DEPLOY HOSTINGER
Soporta: Instagram Reels, TikTok, YouTube Shorts.
"""

import os
import sys
import re
import json
import time
import subprocess
import posixpath
from pathlib import Path
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import speech_recognition as sr
from pydub import AudioSegment

# Configurar paths
SCRIPT_DIR = Path(__file__).resolve().parent
DEPLOYER_DIR = SCRIPT_DIR.parent / "deployer"
load_dotenv(DEPLOYER_DIR / ".env")

sys.path.insert(0, str(DEPLOYER_DIR))
from hostinger_cli.sftp_client import HostingerSFTPClient
from hostinger_cli.config import load_config

OUTPUT_DIR = SCRIPT_DIR / "teleprompters_output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def download_audio_from_url(video_url: str, output_prefix: str) -> Path:
    """Descarga el audio del video en MP3 usando yt-dlp."""
    print(f"📥 Descargando audio de: {video_url}")
    target_mp3 = OUTPUT_DIR / f"{output_prefix}.mp3"
    
    cmd = [
        sys.executable, "-m", "yt_dlp",
        "-x", "--audio-format", "mp3",
        "-o", str(OUTPUT_DIR / f"{output_prefix}.%(ext)s"),
        video_url
    ]
    subprocess.run(cmd, check=True)
    return target_mp3

def transcribe_audio_verbatim(audio_path: Path) -> str:
    """Transcribe el archivo de audio fragmento por fragmento con reconocimiento de voz en español."""
    print(f"🎙️ Transcribiendo audio: {audio_path.name}...")
    sound = AudioSegment.from_file(str(audio_path))
    sound = sound.set_channels(1).set_frame_rate(16000)
    
    chunk_length_ms = 15000
    chunks = [sound[i:i + chunk_length_ms] for i in range(0, len(sound), chunk_length_ms)]
    
    r = sr.Recognizer()
    transcript_parts = []
    
    for i, chunk in enumerate(chunks):
        temp_wav = SCRIPT_DIR / f"temp_{int(time.time())}_{i}.wav"
        chunk.export(str(temp_wav), format="wav")
        
        with sr.AudioFile(str(temp_wav)) as source:
            audio_data = r.record(source)
            try:
                text = r.recognize_google(audio_data, language="es-ES")
                transcript_parts.append(text)
            except sr.UnknownValueError:
                pass
            except Exception as e:
                print(f"  [Chunk {i}] Advertencia: {e}")
                
        if temp_wav.exists():
            temp_wav.unlink()
            
    full_text = " ".join(transcript_parts).strip()
    return full_text

def format_into_speech_paragraphs(raw_text: str) -> list:
    """Separa el texto transcrito en párrafos de ritmo natural para lectura en teleprompter."""
    # Intentamos separar por puntuación o conectores naturales del habla si no tiene puntos
    sentences = re.split(r'(?<=[.?!])\s+', raw_text)
    paragraphs = []
    
    for s in sentences:
        if len(s.strip()) > 0:
            # Si una frase es demasiado larga (> 180 caracteres), dividir en comas o conjunciones
            if len(s) > 220:
                subparts = re.split(r'(?<=[,;])\s+|(?<=\sy\s)|(?<=\se\s)|(?<=\spero\s)', s)
                accum = ""
                for part in subparts:
                    if len(accum) + len(part) < 160:
                        accum += (" " if accum else "") + part
                    else:
                        if accum: paragraphs.append(accum)
                        accum = part
                if accum: paragraphs.append(accum)
            else:
                paragraphs.append(s.strip())
                
    if not paragraphs:
        paragraphs = [raw_text]
        
    return paragraphs

def build_teleprompter_html(title: str, video_url: str, paragraphs: list, raw_text: str) -> str:
    """Genera la plantilla HTML mobile-first del Teleprompter con Cámara de Fondo idéntica a la app de referencia."""
    paragraphs_html = "\n".join([f'      <p class="leading-relaxed">{p}</p>' for p in paragraphs])
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>{title} — Teleprompter Cámara Móvil</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * {{ -webkit-tap-highlight-color: transparent; user-select: none; }}
    body {{ background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif; overflow: hidden; height: 100dvh; width: 100vw; }}
    .text-prompter {{ text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85), 0 1px 3px rgba(0, 0, 0, 0.95); line-height: 1.45; font-weight: 600; letter-spacing: -0.01em; }}
    input[type=range] {{ -webkit-appearance: none; background: #ffffff; height: 28px; border-radius: 9999px; outline: none; padding: 0 4px; }}
    input[type=range]::-webkit-slider-thumb {{ -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #9ca3af; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }}
    .no-scrollbar::-webkit-scrollbar {{ display: none; }}
    .no-scrollbar {{ -ms-overflow-style: none; scrollbar-width: none; }}
    .prompter-mask {{ mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 80%, transparent 100%); -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 80%, transparent 100%); }}
    .mirror-mode {{ transform: scaleX(-1); }}
  </style>
</head>
<body class="relative flex flex-col justify-between h-full w-full overflow-hidden select-none bg-black">

  <div class="absolute inset-0 z-0 bg-neutral-900 overflow-hidden">
    <video id="cameraVideo" autoplay playsinline muted webkit-playsinline class="w-full h-full object-cover mirror-mode"></video>
    <div id="cameraFallback" class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950/80 backdrop-blur-sm z-10 transition-opacity">
      <div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 text-3xl">📷</div>
      <h2 class="text-lg font-bold text-white mb-2">Permitir Acceso a la Cámara</h2>
      <p class="text-xs text-gray-400 mb-6 max-w-xs leading-relaxed">Para grabarte mientras lees el teleprompter en tu teléfono, necesitamos permiso de cámara y micrófono.</p>
      <button onclick="initCamera()" class="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/40">
        Activar Cámara y Micrófono
      </button>
    </div>
    <div class="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>
  </div>

  <header class="relative z-30 pt-4 px-4 flex items-center justify-between pointer-events-auto">
    <button onclick="toggleSettingsModal()" class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/10 active:scale-95 transition-transform">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
    </button>
    <div class="w-28 h-7 bg-black rounded-full border border-neutral-800/40 hidden sm:block opacity-60"></div>
    <button onclick="window.history.back() || window.close()" class="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white/90 border border-white/10 active:scale-95 transition-transform">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  </header>

  <div id="prompterContainer" class="fixed top-14 left-0 right-0 h-[48vh] z-30 px-6 overflow-y-scroll no-scrollbar prompter-mask pointer-events-auto">
    <div id="prompterContent" class="text-prompter text-white text-[22px] sm:text-[26px] max-w-md mx-auto pt-3 pb-36 space-y-4 transition-all text-left">
{paragraphs_html}
      <div class="h-44"></div>
    </div>
  </div>

  <div class="fixed bottom-[142px] left-0 right-0 z-40 px-6 flex items-end justify-between pointer-events-auto">
    <div class="w-7"></div>
    <div id="speedWidget" class="flex flex-col items-center space-y-2 w-full max-w-[240px] mx-auto">
      <div class="bg-black/85 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/15 shadow-2xl text-center">
        <span id="wpmValue" class="text-xs font-bold text-white tracking-wide">90 words/min</span>
      </div>
      <div class="w-full px-1">
        <input id="speedSlider" type="range" min="40" max="240" step="5" value="90" oninput="updateSpeed(this.value)" class="w-full cursor-pointer shadow-lg">
      </div>
    </div>
    <div class="flex flex-col items-center space-y-1">
      <div class="w-2.5 h-14 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end p-0.5 border border-white/10 shadow-lg">
        <div id="micBar" class="w-full bg-emerald-400 rounded-full transition-all duration-75" style="height: 35%;"></div>
      </div>
      <svg class="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
    </div>
  </div>

  <div class="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-t border-white/10 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-4 pointer-events-auto">

    <div class="grid grid-cols-6 gap-1 text-center mb-5 text-[10px] text-gray-300">
      <button onclick="toggleCameraMirror()" class="flex flex-col items-center justify-center py-1 hover:text-white active:scale-90 transition-transform">
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        <span>Posición</span>
      </button>
      <button onclick="togglePrompterWidth()" class="flex flex-col items-center justify-center py-1 hover:text-white active:scale-90 transition-transform">
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
        <span>Resize</span>
      </button>
      <button onclick="cycleFontSize()" class="flex flex-col items-center justify-center py-1 hover:text-white active:scale-90 transition-transform">
        <span class="text-base font-bold leading-none mb-1">A</span>
        <span>Font Size</span>
      </button>
      <button onclick="toggleSpeedWidget()" class="flex flex-col items-center justify-center py-1 rounded-xl border border-blue-500 bg-blue-500/10 text-blue-400 font-semibold active:scale-95 transition-all">
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Speed</span>
      </button>
      <button onclick="resetPrompterToTop()" class="flex flex-col items-center justify-center py-1 hover:text-white active:scale-90 transition-transform">
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h10M4 18h7"></path></svg>
        <span>Start Point</span>
      </button>
      <button onclick="togglePrompterMirror()" class="flex flex-col items-center justify-center py-1 hover:text-white active:scale-90 transition-transform">
        <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
        <span>Espejo</span>
      </button>
    </div>

    <div class="flex items-center justify-between px-4">
      <div class="w-20 text-left">
        <span id="recordingTimer" class="font-mono text-sm font-semibold text-white/80">00:00</span>
      </div>
      <div class="relative flex items-center justify-center">
        <button id="recordBtn" onclick="toggleRecording()" class="w-[72px] h-[72px] rounded-full bg-red-500 hover:bg-red-400 p-1 border-4 border-white shadow-xl shadow-red-500/30 flex items-center justify-center active:scale-95 transition-all">
          <div id="recordIcon" class="w-6 h-6 rounded-full bg-white transition-all"></div>
        </button>
      </div>
      <div class="w-20 flex justify-end">
        <button onclick="switchCameraFacing()" class="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white active:scale-90 transition-transform">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
        </button>
      </div>
    </div>
  </div>

  <div id="downloadModal" class="hidden fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
    <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-4">✓</div>
    <h3 class="text-xl font-bold text-white mb-2">¡Video Grabado con Éxito!</h3>
    <p class="text-xs text-gray-400 mb-6 max-w-xs">Puedes descargarlo a tu galería o guardarlo directamente para editar en CapCut o publicar.</p>
    <video id="previewRecordedVideo" controls playsinline class="w-full max-w-xs h-64 rounded-2xl bg-black object-cover mb-6 border border-white/10"></video>
    <div class="flex space-x-3 w-full max-w-xs">
      <a id="downloadVideoLink" download="monoga_pov_recording.webm" class="flex-1 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center">Descargar Video</a>
      <button onclick="closeDownloadModal()" class="flex-1 py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs">Grabar Otro</button>
    </div>
  </div>

  <script>
    let stream = null;
    let currentFacingMode = 'user';
    let isRecording = false;
    let mediaRecorder = null;
    let recordedChunks = [];
    let timerInterval = null;
    let elapsedSeconds = 0;
    let isScrolling = false;
    let scrollInterval = null;
    let wordsPerMinute = 90;
    let fontSizeLevel = 1;
    let fontSizes = ['text-xl sm:text-2xl', 'text-2xl sm:text-3xl', 'text-3xl sm:text-4xl'];
    let audioContext = null;
    let analyser = null;

    window.addEventListener('DOMContentLoaded', () => {{ initCamera(); }});

    async function initCamera() {{
      try {{
        if (stream) stream.getTracks().forEach(t => t.stop());
        const constraints = {{ video: {{ facingMode: currentFacingMode, width: {{ ideal: 1080 }}, height: {{ ideal: 1920 }} }}, audio: true }};
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const videoEl = document.getElementById('cameraVideo');
        videoEl.srcObject = stream;
        document.getElementById('cameraFallback').style.opacity = '0';
        setTimeout(() => {{ document.getElementById('cameraFallback').style.display = 'none'; }}, 300);
        setupAudioAnalyzer(stream);
      }} catch (err) {{
        console.warn("Camera init issue:", err);
        document.getElementById('cameraFallback').style.display = 'flex';
        document.getElementById('cameraFallback').style.opacity = '1';
      }}
    }}

    function switchCameraFacing() {{
      currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      const videoEl = document.getElementById('cameraVideo');
      if (currentFacingMode === 'user') {{ videoEl.classList.add('mirror-mode'); }} else {{ videoEl.classList.remove('mirror-mode'); }}
      initCamera();
    }}

    function toggleCameraMirror() {{ document.getElementById('cameraVideo').classList.toggle('mirror-mode'); }}
    function togglePrompterMirror() {{ document.getElementById('prompterContent').classList.toggle('mirror-mode'); }}
    function togglePrompterWidth() {{
      const el = document.getElementById('prompterContent');
      if (el.classList.contains('max-w-lg')) el.classList.replace('max-w-lg', 'max-w-xs');
      else if (el.classList.contains('max-w-xs')) el.classList.replace('max-w-xs', 'max-w-full');
      else el.classList.replace('max-w-full', 'max-w-lg');
    }}
    function cycleFontSize() {{
      const el = document.getElementById('prompterContent');
      el.classList.remove(fontSizes[fontSizeLevel]);
      fontSizeLevel = (fontSizeLevel + 1) % fontSizes.length;
      el.classList.add(fontSizes[fontSizeLevel]);
    }}
    function toggleSpeedWidget() {{ document.getElementById('speedWidget').classList.toggle('hidden'); }}
    function updateSpeed(val) {{
      wordsPerMinute = parseInt(val);
      document.getElementById('wpmValue').innerText = `${{wordsPerMinute}} words/min`;
      if (isScrolling) startScrolling();
    }}
    function resetPrompterToTop() {{ document.getElementById('prompterContainer').scrollTo({{ top: 0, behavior: 'smooth' }}); }}

    function startScrolling() {{
      if (scrollInterval) clearInterval(scrollInterval);
      const container = document.getElementById('prompterContainer');
      const pixelsPerSecond = (wordsPerMinute / 60) * 22;
      const intervalMs = 25;
      const step = (pixelsPerSecond * intervalMs) / 1000;
      scrollInterval = setInterval(() => {{
        container.scrollTop += step;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 10) stopScrolling();
      }}, intervalMs);
      isScrolling = true;
    }}
    function stopScrolling() {{ if (scrollInterval) clearInterval(scrollInterval); isScrolling = false; }}

    function setupAudioAnalyzer(mediaStream) {{
      try {{
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(mediaStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const micBar = document.getElementById('micBar');
        function updateMic() {{
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const pct = Math.min(100, Math.max(10, Math.round((avg / 128) * 100)));
          micBar.style.height = pct + '%';
          requestAnimationFrame(updateMic);
        }}
        updateMic();
      }} catch (e) {{}}
    }}

    function toggleRecording() {{ if (!isRecording) startRecording(); else stopRecording(); }}
    function startRecording() {{
      recordedChunks = [];
      try {{
        const opts = {{ mimeType: 'video/webm;codecs=vp8,opus' }};
        if (!MediaRecorder.isTypeSupported(opts.mimeType)) delete opts.mimeType;
        mediaRecorder = new MediaRecorder(stream, opts);
      }} catch (e) {{ mediaRecorder = new MediaRecorder(stream); }}
      mediaRecorder.ondataavailable = (e) => {{ if (e.data.size > 0) recordedChunks.push(e.data); }};
      mediaRecorder.onstop = () => {{
        const blob = new Blob(recordedChunks, {{ type: 'video/webm' }});
        const videoUrl = URL.createObjectURL(blob);
        document.getElementById('previewRecordedVideo').src = videoUrl;
        document.getElementById('downloadVideoLink').href = videoUrl;
        document.getElementById('downloadModal').classList.remove('hidden');
      }};
      mediaRecorder.start(1000);
      isRecording = true;
      document.getElementById('recordBtn').classList.replace('bg-red-500', 'bg-neutral-800');
      document.getElementById('recordIcon').classList.replace('rounded-full', 'rounded-md');
      document.getElementById('recordIcon').classList.replace('bg-white', 'bg-red-500');
      elapsedSeconds = 0;
      updateTimerDisplay();
      timerInterval = setInterval(() => {{ elapsedSeconds++; updateTimerDisplay(); }}, 1000);
      startScrolling();
    }}
    function stopRecording() {{
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      isRecording = false;
      document.getElementById('recordBtn').classList.replace('bg-neutral-800', 'bg-red-500');
      document.getElementById('recordIcon').classList.replace('rounded-md', 'rounded-full');
      document.getElementById('recordIcon').classList.replace('bg-red-500', 'bg-white');
      clearInterval(timerInterval);
      stopScrolling();
    }}
    function updateTimerDisplay() {{
      const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(elapsedSeconds % 60).padStart(2, '0');
      document.getElementById('recordingTimer').innerText = `${{mins}}:${{secs}}`;
    }}
    function closeDownloadModal() {{
      document.getElementById('downloadModal').classList.add('hidden');
      resetPrompterToTop();
    }}
    function toggleSettingsModal() {{
      alert("Teleprompter Cámara POV Monoga Studios\\n• Grabación Full HD en segundo plano\\n• Control de velocidad en palabras por minuto");
    }}
  </script>
</body>
</html>"""


def deploy_to_hostinger(local_html_path: Path, slug: str) -> str:
    """Sube el archivo HTML generado a Hostinger SFTP dentro de grupomonoga.com/teleprompter/<slug>/."""
    config = load_config()
    client = HostingerSFTPClient(config)
    client.connect()
    
    sftp = client._ensure_connected()
    base_root = config.get_root_for_domain(config.target_domain)
    teleprompter_dir = posixpath.join(base_root, "teleprompter")
    target_dir = posixpath.join(teleprompter_dir, slug)
    
    for d in [teleprompter_dir, target_dir]:
        try:
            sftp.stat(d)
        except IOError:
            try:
                sftp.mkdir(d)
            except Exception:
                pass
                
    remote_file = posixpath.join(target_dir, "index.html")
    client.put_file_atomic(str(local_html_path), remote_file)
    client.close()
    
    return f"https://grupomonoga.com/teleprompter/{slug}/"

def process_video_pipeline(video_url: str, custom_slug: str = None) -> dict:
    """Función maestra que ejecuta todo el flujo de inicio a fin."""
    timestamp = int(time.time())
    slug = custom_slug or f"video_{timestamp}"
    
    print(f"\n==========================================")
    print(f"🎬 INICIANDO PROCESAMIENTO: {video_url}")
    print(f"==========================================")
    
    # 1. Descargar audio
    audio_path = download_audio_from_url(video_url, slug)
    
    # 2. Transcribir exactamente sin parafrasear
    raw_transcript = transcribe_audio_verbatim(audio_path)
    paragraphs = format_into_speech_paragraphs(raw_transcript)
    
    # 3. Construir teleprompter
    title = f"Teleprompter POV · {slug}"
    html_content = build_teleprompter_html(title, video_url, paragraphs, raw_transcript)
    
    local_html = OUTPUT_DIR / f"{slug}_teleprompter.html"
    local_html.write_text(html_content, encoding="utf-8")
    print(f"📄 HTML guardado localmente en: {local_html}")
    
    # 4. Desplegar en vivo a Hostinger
    public_url = deploy_to_hostinger(local_html, slug)
    print(f"🚀 EN VIVO EN INTERNET: {public_url}")
    
    return {
        "slug": slug,
        "public_url": public_url,
        "local_html": str(local_html),
        "transcript": raw_transcript,
        "paragraphs": paragraphs
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
        slug = sys.argv[2] if len(sys.argv) > 2 else None
        res = process_video_pipeline(url, slug)
        print("\nResultado exitoso:")
        print(f"Link: {res['public_url']}")
    else:
        print("Uso: python auto_pipeline.py <url_video> [slug_opcional]")
