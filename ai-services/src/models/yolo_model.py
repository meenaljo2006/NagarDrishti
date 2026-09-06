"""
YOLOv8 Model for Image Classification
"""

import os
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import base64
import logging

logger = logging.getLogger(__name__)

class YOLOModel:
    """YOLOv8 wrapper for infrastructure issue detection"""
    
    def __init__(self, model_path='yolov8n.pt', confidence_threshold=0.5):
        """
        Initialize YOLO model
        
        Args:
            model_path: Path to YOLO model weights
            confidence_threshold: Minimum confidence for detection
        """
        self.confidence_threshold = confidence_threshold
        self.model = None
        self.model_path = model_path
        self.load_model()
    
    def load_model(self):
        """Load YOLO model"""
        try:
            # Try to load from local path, else download
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                logger.info(f"✅ YOLO model loaded from: {self.model_path}")
            else:
                # Download pre-trained model
                logger.info("📥 Downloading YOLO model...")
                self.model = YOLO(self.model_path)
                logger.info("✅ YOLO model downloaded and loaded")
        except Exception as e:
            logger.error(f"❌ Error loading YOLO model: {e}")
            raise
    
    def preprocess_image(self, image_data):
        """
        Preprocess image for YOLO
        
        Args:
            image_data: Image data (bytes, base64, or path)
        
        Returns:
            Preprocessed image as numpy array
        """
        try:
            # If image is base64 string
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                # Remove data URL prefix
                image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
                image = np.array(image)
            
            # If image is bytes
            elif isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data))
                image = np.array(image)
            
            # If image is file path
            elif isinstance(image_data, str) and os.path.exists(image_data):
                image = cv2.imread(image_data)
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # If image is already numpy array
            elif isinstance(image_data, np.ndarray):
                image = image_data
            
            else:
                raise ValueError("Unsupported image format")
            
            return image
            
        except Exception as e:
            logger.error(f"❌ Image preprocessing error: {e}")
            raise
    
    def predict(self, image_data):
        """
        Run inference on image
        
        Args:
            image_data: Image data (bytes, base64, or path)
        
        Returns:
            dict: Detection results
        """
        try:
            # Preprocess image
            image = self.preprocess_image(image_data)
            
            # Run YOLO inference
            results = self.model(image, conf=self.confidence_threshold)
            
            # Process results
            detections = []
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get class name and confidence
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        class_name = self.model.names[class_id]
                        
                        detections.append({
                            'class_id': class_id,
                            'class_name': class_name,
                            'confidence': confidence,
                            'bbox': box.xyxy[0].tolist() if hasattr(box, 'xyxy') else None
                        })
            
            # Get primary detection (highest confidence)
            primary_detection = None
            if detections:
                # Sort by confidence
                detections.sort(key=lambda x: x['confidence'], reverse=True)
                primary_detection = detections[0]
            
            return {
                'detections': detections,
                'primary_detection': primary_detection,
                'total_detections': len(detections)
            }
            
        except Exception as e:
            logger.error(f"❌ Prediction error: {e}")
            raise