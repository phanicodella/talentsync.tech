@echo off
echo Setting up face-api.js models...

REM Create directories
echo Creating directories...
mkdir "public\models\face_landmark_68"
mkdir "public\models\face_recognition"
mkdir "public\models\ssd_mobilenetv1"
mkdir "public\models\tiny_face_detector"

echo Downloading models...

REM face_landmark_68
echo Downloading face landmark model...
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json" --output "public\models\face_landmark_68\face_landmark_68_model-weights_manifest.json"
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1" --output "public\models\face_landmark_68\face_landmark_68_model-shard1"

REM face_recognition
echo Downloading face recognition model...
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json" --output "public\models\face_recognition\face_recognition_model-weights_manifest.json"
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1" --output "public\models\face_recognition\face_recognition_model-shard1"

REM ssd_mobilenetv1
echo Downloading SSD MobileNet model...
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json" --output "public\models\ssd_mobilenetv1\ssd_mobilenetv1_model-weights_manifest.json"
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1" --output "public\models\ssd_mobilenetv1\ssd_mobilenetv1_model-shard1"

REM tiny_face_detector
echo Downloading tiny face detector model...
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json" --output "public\models\tiny_face_detector\tiny_face_detector_model-weights_manifest.json"
curl -L "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1" --output "public\models\tiny_face_detector\tiny_face_detector_model-shard1"

echo.
echo Setup completed! Please check the public/models directory to verify the installation.
echo.
pause