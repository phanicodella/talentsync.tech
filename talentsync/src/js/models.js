// src/js/models.js
const loadModels = async () => {
    try {
        // First verify the JSON files
        const baseUrl = window.location.origin + '/public/models';
        const verifyModel = async (path) => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            const json = await response.json(); // Verify it's valid JSON
            return json;
        };

        console.log('Verifying model files...');
        const modelPaths = {
            tinyFaceDetector: '/tiny_face_detector/tiny_face_detector_model-weights_manifest.json',
            faceLandmark: '/face_landmark_68/face_landmark_68_model-weights_manifest.json',
            ssdMobilenet: '/ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json',
            faceRecognition: '/face_recognition/face_recognition_model-weights_manifest.json'
        };

        // Verify each model file
        for (const [key, path] of Object.entries(modelPaths)) {
            const fullPath = baseUrl + path;
            console.log(`Verifying ${key} at ${fullPath}`);
            await verifyModel(fullPath);
            console.log(`✓ ${key} verified`);
        }

        // Now load the models
        console.log('Loading models...');
        const modelPromises = [
            faceapi.nets.tinyFaceDetector.load(baseUrl),
            faceapi.nets.faceLandmark68Net.load(baseUrl),
            faceapi.nets.faceRecognitionNet.load(baseUrl),
            faceapi.nets.ssdMobilenetv1.load(baseUrl)
        ];

        await Promise.all(modelPromises);
        console.log('All models loaded successfully');
        return true;
    } catch (error) {
        console.error('Model loading error:', error);
        throw error;
    }
};

// Export for use in other files
window.loadFaceApiModels = loadModels;