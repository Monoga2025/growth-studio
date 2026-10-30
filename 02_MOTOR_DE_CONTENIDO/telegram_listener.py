"""
🤖 TELEGRAM BOT LISTENER: ESCUCHADOR CONTINUO DE VIDEOS
Detecta links de Instagram, TikTok o YouTube en mensajes de Telegram,
los descarga, extrae el guión exacto, monta el teleprompter móvil
y responde inmediatamente con el enlace en vivo de grupomonoga.com.
"""

import os
import sys
import re
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from auto_pipeline import process_video_pipeline

ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()

URL_REGEX = re.compile(
    r'(https?://(?:www\.)?(?:instagram\.com/p/[a-zA-Z0-9_-]+|instagram\.com/reel/[a-zA-Z0-9_-]+|tiktok\.com/@[^/]+/video/\d+|vm\.tiktok\.com/[a-zA-Z0-9]+|youtube\.com/shorts/[a-zA-Z0-9_-]+|youtu\.be/[a-zA-Z0-9_-]+)[^\s]*)',
    re.IGNORECASE
)

def send_telegram_message(token, chat_id, text, reply_to_message_id=None):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    if reply_to_message_id:
        payload["reply_to_message_id"] = reply_to_message_id
    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.json()
    except Exception as e:
        print(f"Error enviando mensaje a Telegram: {e}")
        return None

def start_polling():
    if not TELEGRAM_BOT_TOKEN:
        print("⚠️ No se ha definido TELEGRAM_BOT_TOKEN en el archivo .env")
        print("👉 Por favor genera un bot con @BotFather en Telegram y coloca el token en:")
        print(f"   {ENV_PATH}")
        return

    print(f"🚀 [Telegram Bot] Iniciando escucha con polling...")
    offset = None
    
    # Comprobar identidad del bot
    try:
        me = requests.get(f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe", timeout=10).json()
        if me.get("ok"):
            print(f"✅ Bot Conectado como: @{me['result'].get('username')} ({me['result'].get('first_name')})")
        else:
            print(f"❌ Error al validar token de Telegram: {me}")
            return
    except Exception as e:
        print(f"❌ Error conectando a Telegram API: {e}")
        return

    while True:
        try:
            params = {"timeout": 25}
            if offset:
                params["offset"] = offset

            resp = requests.get(
                f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates",
                params=params,
                timeout=30
            ).json()

            if not resp.get("ok"):
                time.sleep(3)
                continue

            updates = resp.get("result", [])
            for update in updates:
                offset = update["update_id"] + 1
                message = update.get("message") or update.get("channel_post")
                if not message:
                    continue

                text = message.get("text") or message.get("caption") or ""
                chat_id = message["chat"]["id"]
                msg_id = message["message_id"]

                # Detectar enlaces de video
                matches = URL_REGEX.findall(text)
                if matches:
                    video_url = matches[0]
                    print(f"\n📩 [Nuevo Video Detectado]: {video_url}")
                    
                    send_telegram_message(
                        TELEGRAM_BOT_TOKEN,
                        chat_id,
                        "⏳ <b>Video recibido.</b> Extrayendo audio y transcribiendo guión exacto...",
                        reply_to_message_id=msg_id
                    )

                    try:
                        res = process_video_pipeline(video_url)
                        
                        reply_msg = (
                            f"🎬 <b>¡Teleprompter Móvil Listo!</b>\n\n"
                            f"📱 <b>Abre en tu celular para leer mientras grabas:</b>\n"
                            f"👉 <a href=\"{res['public_url']}\">{res['public_url']}</a>\n\n"
                            f"📜 <b>Guión Exacto (Sin parafrasear):</b>\n"
                            f"<i>\"{res['transcript'][:400]}...\"</i>"
                        )
                        send_telegram_message(
                            TELEGRAM_BOT_TOKEN,
                            chat_id,
                            reply_msg,
                            reply_to_message_id=msg_id
                        )
                        print(f"✅ Teleprompter enviado a Telegram: {res['public_url']}")

                    except Exception as err:
                        print(f"❌ Error procesando pipeline: {err}")
                        send_telegram_message(
                            TELEGRAM_BOT_TOKEN,
                            chat_id,
                            f"❌ Error al procesar el video: {str(err)}",
                            reply_to_message_id=msg_id
                        )

        except requests.exceptions.RequestException:
            time.sleep(5)
        except Exception as e:
            print(f"Error en loop de polling: {e}")
            time.sleep(3)

if __name__ == "__main__":
    start_polling()
