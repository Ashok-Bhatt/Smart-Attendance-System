import os
import requests
from dotenv import load_dotenv

load_dotenv()

MODEL_DIR = "./models"
MODEL_PATH = os.path.join(MODEL_DIR, "student_recognition.keras")

HF_URL = "https://huggingface.co/AshokBhatt/Smart-Attendance/resolve/main/student_recognition.keras"
headers = headers = {"Authorization": f"Bearer {os.getenv('HF_TOKEN')}"}

# Create directory if not exists
os.makedirs(MODEL_DIR, exist_ok=True)

# Creating keras file if not present
if not os.path.exists(MODEL_PATH):
    print("Downloading model from Hugging Face ...")
    r = requests.get(HF_URL, headers=headers)
    with open(MODEL_PATH, "wb") as f:
        f.write(r.content)
    print("Model downloaded")