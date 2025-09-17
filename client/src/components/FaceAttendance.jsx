import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from "face-api.js";
import { serverBaseUrl } from '../config.js';

const SmartAttendance = () => {

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const screenshotInterval = 1;
    const minimumRequiredConfidence = 0.98;

    const [time, setTime] = useState(new Date());

    const recognizedStudents = useRef([]);
    const getCurrentDate = ()=>{

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');   

        const formattedDate = `${yyyy}-${mm}-${dd}`;
        return formattedDate
    }

    // Changing time
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetching attendance data stored in database
    useEffect(()=>{
        const current_date = getCurrentDate()
        axios.get(`${serverBaseUrl}/get_daily_attendance/${current_date}`)
        .then((res)=>{
            const data = res.data;
            recognizedStudents.current = data;
        })
        .catch((err)=>{
            console.log(err);
        })
    }, [])

    useEffect(()=>{
        const screenshot_mechanism = setInterval(async ()=>{
            const imageSrc = webcamRef.current.getScreenshot();
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            const image_base64 = imageSrc.split(",")[1];
    
            // Loading models
            await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
            await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

            const img = new Image();
            img.src = imageSrc;

            await new Promise((resolve) => {
                img.onload = resolve;
            });

            // Draw the original screenshot on canvas
            context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
            context.drawImage(img, 0, 0, canvas.width, canvas.height);

            const detections = await faceapi.detectAllFaces(
                img,
                new faceapi.TinyFaceDetectorOptions()
            );

            if (detections.length == 0){
                console.log("No face detected!");
                return;
            } 
                
            // Extract each face
            const faceCanvases = await faceapi.extractFaces(img, detections);
            
            for (let i = 0; i < faceCanvases.length; i++) {
                const faceCanvas = faceCanvases[i];
                const faceBase64 = faceCanvas.toDataURL("image/jpeg").split(",")[1];
                const box = detections[i].box;
        
                // Send to backend
                try {
                    const res = await axios.post(`${serverBaseUrl}/recognize_face/`, {
                        image_base64: faceBase64,
                    });
                    context.beginPath();
                    context.lineWidth = "3";
                    context.strokeStyle = (res.data["confidence"] > 0.98) ? "lime" : "red";
                    context.rect(box.x, box.y, box.width, box.height);
                    context.stroke();
                    context.font = "20px courier";
                    context.fillStyle = (res.data["confidence"] > minimumRequiredConfidence) ? 'lime' : 'red';
                    context.fillText((res.data["confidence"] > minimumRequiredConfidence) ? `${res.data["prediction"]} (${Number.parseFloat(res.data["confidence"]*100).toFixed(2)})` : "", box.x, box.y-25);

                    if (res.data["confidence"] > minimumRequiredConfidence){
                        for (let i=0; i<recognizedStudents.current.length; i++){
                            if (recognizedStudents.current[i]["name"] == res.data["prediction"]){
                                recognizedStudents.current[i]["status"] = true;
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Error recognizing face ${i + 1}:`, err);
                }
            }
        }, screenshotInterval*1000);
    }, [])

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-black via-[#092f2f] to-[#6195d6] flex items-center justify-center px-4 py-6 font-sans">
        <div className="w-full max-w-7xl bg-[#0d0d1f]/80 backdrop-blur-md py-2 px-8 rounded-3xl shadow-[0_8px_30px_rgba(255,0,255,0.3)] border border-fuchsia-800/30 flex gap-8">
    
            {/* Left Side - Camera + Status */}
            <div className="flex flex-col items-center flex-1">
                <h1 className="text-3xl font-semibold text-fuchsia-400 mb-8 flex items-center tracking-wide">
                    <span role="img" aria-label="target" className="mr-3"></span> Smart Attendance
                </h1>
    
                <div className="relative w-[850px] h-[540px] rounded-2xl overflow-hidden border border-cyan-400/40 shadow-inner shadow-cyan-500/30">
                    <Webcam
                        ref={webcamRef}
                        audio={false}
                        width={850}
                        height={540}
                        screenshotFormat="image/jpeg"
                        className="rounded-xl"
                        videoConstraints={{ facingMode: "user" }}
                    />
                    <canvas
                        ref={canvasRef}
                        width={850}
                        height={540}
                        className="absolute top-0 left-0"
                    />
                </div>
    
            </div>
    
            {/* Right Side - Time & Recognized List */}
            <div className="flex flex-col justify-between w-[350px]">
                {/* Time Block */}
                <div className="text-white text-center mb-6">
                    <p className="text-3xl font-semibold">{time.toLocaleTimeString()}</p>
                    <p className="text-sm text-gray-400">{time.toDateString()}</p>
                </div>
    
                {/* Recognized Students */}
                <div className="bg-[#1e1e3f]/80 rounded-xl border border-cyan-400/20 p-5 overflow-y-auto max-h-[550px] shadow-inner shadow-fuchsia-700/20">
                    <h2 className="text-xl font-medium text-fuchsia-400 mb-4 border-b border-pink-500/30 pb-2">Recognized Students</h2>
                    {recognizedStudents.current.map((student) => (
                        <div
                            key={student.id}
                            className="flex justify-between items-center text-white py-3 px-4 rounded-lg hover:bg-fuchsia-700/30 transition"
                        >
                            <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-xs text-gray-400">ID: {student.id}</p>
                            </div>
                            <span className={`${(student.status) ? 'text-lime-400' : 'text-red-400'} text-sm font-medium`}>{student.status ? 'Present' : 'Absent'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
    );
};

export default SmartAttendance;