from huggingface_hub import HfApi, create_repo, upload_file
import os
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
api = HfApi()

username = api.whoami(token)["name"]
repo_name = "Smart-Attendance"
repo_id = f"{username}/{repo_name}"

create_repo(repo_id, repo_type="model", exist_ok=True, private=True)

upload_file(
    path_or_fileobj="./models/student_recognition.keras",
    path_in_repo="student_recognition.keras",
    repo_id=repo_id,
    repo_type="model",
    token=token
)