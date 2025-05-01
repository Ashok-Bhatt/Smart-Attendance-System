from flask import Flask, request
import json
import tensorflow as tf
import numpy as np
import base64
import io
from PIL import Image
from flask_pymongo import PyMongo
from datetime import datetime
import os
from dotenv import load_dotenv
from flask_cors import CORS


load_dotenv()

# Connection string
connection_string = os.getenv("DATABASE_URI")

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])
app.config["MONGO_URI"] = connection_string
mongo = PyMongo(app)


image_size = (128, 128)
celebrity_names = ['Ashok', 'Priyansh', 'Vrajesh']
celebrity_ids = [100+i for i in range(len(celebrity_names))]

# Loading a model
model = tf.keras.models.load_model('./student_recognition.keras')

@app.route("/")
def home():
    return "Flask app is running"

@app.route("/recognize_face/", methods=["POST"])
def recognize_face():

    try:
        data = request.get_json()
        image_base64 = data.get('image_base64')

        if not image_base64:
            return {"error, image not provided"}, 400
        
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_bytes))
        image = image.resize(image_size)

        image_array = tf.keras.preprocessing.image.img_to_array(image) / 255.0
        image_array = tf.expand_dims(image_array, 0)

        prediction = model.predict(image_array)
        max_score_index = np.argmax(prediction)

        confidence = prediction[0][max_score_index]
        prediction = celebrity_names[max_score_index]

        if (confidence > 0.98):

            today = datetime.today().strftime("%Y-%m-%d")

            new_user = {
                "name" : prediction
            }

            mongo.db.attendance.update_one(
                {"date" : today},
                {"$addToSet" : {"users" : new_user}}, 
                upsert = True,
            )

        result = {
            "confidence" : float(confidence),
            "prediction" : prediction
        }

        return json.dumps(result)
    except:
        return {"error! cannot recognize face"}, 400

@app.route("/get_attendance/", methods=["GET"])
def get_attendance():

    try:
        attendance = mongo.db.attendance.find({})
        attendance_count = {
            "totalDays" : 0,
            "attendance": {celebrity : 0 for celebrity in celebrity_names},
        }

        for date in attendance:
            attendance_count["totalDays"] = attendance_count["totalDays"] + 1
            for user in date["users"]:
                username = user["name"]
                attendance_count["attendance"][username] = attendance_count["attendance"][username] + 1
        return json.dumps(attendance_count)
    except:
        return {"error! cannot get attendance"}, 400

@app.route("/get_attendance/<string:username>", methods=["GET"])
def get_user_attendance(username):

    try:
        attendance = mongo.db.attendance.find({})
        attendance_count = {
            "totalDays" : 0,
            "totalPresent" : 0,
        }

        for date in attendance:
            attendance_count["totalDays"] = attendance_count["totalDays"] + 1
            for user in date["users"]:
                new_username = user["name"]
                if username == new_username:
                    attendance_count["totalPresent"] = attendance_count["totalPresent"] + 1
        return json.dumps(attendance_count)
    except:
        return {"error! cannot get attendance"}, 400



@app.route("/get_daily_attendance/<string:date>", methods=["GET"])
def get_daily_attendance(date):

    try:
        daily_attendance = mongo.db.attendance.find({"date" : date})
        present_celebrities = []

        for record in daily_attendance:
            for user in record["users"]:
                username = user["name"]
                present_celebrities.append(username)

        attendance_record = [{"id": celebrity_ids[i], "name": celebrity_names[i], "status" : True if (celebrity_names[i] in present_celebrities) else False} for i in range(len(celebrity_names))]

        return json.dumps(attendance_record)
    except:
        return {"error! cannot get daily attendance"}, 400


@app.route("/user_attendance_history/<string:username>", methods=["GET"])
def get_user_attendance_history(username):

    try:
        attendance = mongo.db.attendance.find({})
        attendance_history = {}

        for record in  attendance:
            date = record["date"]
            attendance_history[date] = False
            for user in record["users"]:
                if user["name"] == username:
                    attendance_history[date] = True
        
        return json.dumps(attendance_history)
    except:
        return {"error! cannot get daily attendance"}, 400

if __name__=="__main__":
    app.run(debug=True)