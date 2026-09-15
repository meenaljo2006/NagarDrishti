"""
YOLOv8 Model for Infrastructure Issue Detection
Detects potholes, garbage, streetlights, water leakage, road damage
"""

import os
import sys
import cv2
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import base64
import logging
import requests
from typing import Dict, List, Optional, Union

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)

# ============================================
# INFRASTRUCTURE CATEGORIES
# ============================================

# Our project categories
INFRASTRUCTURE_CATEGORIES = {
    'pothole': {
        'id': 0,
        'name': 'Pothole',
        'department': 'roads',
        'severity': 'high',
        'keywords': ['pothole', 'crack', 'hole', 'road damage', 'asphalt']
    },
    'garbage': {
        'id': 1,
        'name': 'Garbage',
        'department': 'sanitation',
        'severity': 'medium',
        'keywords': ['garbage', 'trash', 'waste', 'dump', 'litter']
    },
    'streetlight': {
        'id': 2,
        'name': 'Streetlight',
        'department': 'electricity',
        'severity': 'medium',
        'keywords': ['streetlight', 'light', 'lamp', 'dark', 'pole']
    },
    'water_leakage': {
        'id': 3,
        'name': 'Water Leakage',
        'department': 'water',
        'severity': 'high',
        'keywords': ['water', 'leak', 'pipe', 'drain', 'flood']
    },
    'road_damage': {
        'id': 4,
        'name': 'Road Damage',
        'department': 'roads',
        'severity': 'high',
        'keywords': ['damage', 'broken', 'repair', 'construction', 'barricade']
    }
}

# Invalid objects that should NOT be in infrastructure images
INVALID_OBJECTS = [
    'person', 'face', 'selfie', 'food', 'phone', 'laptop', 
    'car', 'bike', 'animal', 'dog', 'cat', 'bird'
]

# ============================================
# YOLO MODEL CLASS
# ============================================

class YOLOModel:
    """
    YOLOv8 wrapper for infrastructure issue detection
    """
    
    def __init__(self, model_path: str = 'yolov8n.pt', confidence_threshold: float = 0.5):
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
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
                logger.info(f"✅ YOLO model loaded from: {self.model_path}")
            else:
                logger.info("📥 Downloading YOLO model (first time only)...")
                self.model = YOLO(self.model_path)
                logger.info("✅ YOLO model downloaded and loaded")
            
            # Log available classes
            logger.info(f"📊 Model classes: {len(self.model.names)} classes available")
            
        except Exception as e:
            logger.error(f"❌ Error loading YOLO model: {e}")
            raise
    
    def preprocess_image(self, image_data: Union[str, bytes, np.ndarray]) -> np.ndarray:
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
                image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
                image = np.array(image)
            
            # If image is URL
            elif isinstance(image_data, str) and image_data.startswith(('http://', 'https://')):
                response = requests.get(image_data, timeout=10)
                response.raise_for_status()
                image = Image.open(io.BytesIO(response.content))
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
            
            # Convert to RGB if needed
            if len(image.shape) == 2:
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            elif image.shape[2] == 4:
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
            
            return image
            
        except Exception as e:
            logger.error(f"❌ Image preprocessing error: {e}")
            raise
    
    def check_image_quality(self, image: np.ndarray) -> Dict:
        """
        Check image quality
        
        Args:
            image: Image as numpy array
        
        Returns:
            Dict with quality metrics
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Calculate metrics
            brightness = np.mean(gray)
            contrast = np.std(gray)
            
            # Check if image is too small
            height, width = gray.shape
            is_too_small = height < 100 or width < 100
            
            # Check if image is too dark or too bright
            is_too_dark = brightness < 30
            is_too_bright = brightness > 250
            
            # Check if image has low contrast
            is_low_contrast = contrast < 10
            
            return {
                'is_valid': not (is_too_small or is_too_dark or is_too_bright or is_low_contrast),
                'brightness': float(brightness),
                'contrast': float(contrast),
                'width': width,
                'height': height,
                'is_too_small': is_too_small,
                'is_too_dark': is_too_dark,
                'is_too_bright': is_too_bright,
                'is_low_contrast': is_low_contrast
            }
            
        except Exception as e:
            logger.error(f"❌ Quality check error: {e}")
            return {'is_valid': False, 'error': str(e)}
    
    def detect_objects(self, image: np.ndarray) -> List[Dict]:
        """
        Run YOLO detection on image
        
        Args:
            image: Image as numpy array
        
        Returns:
            List of detections
        """
        try:
            # Run YOLO inference
            results = self.model(image, conf=self.confidence_threshold, verbose=False)
            
            detections = []
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        # Get class name and confidence
                        class_id = int(box.cls[0])
                        confidence = float(box.conf[0])
                        class_name = self.model.names[class_id]
                        
                        # Get bounding box
                        bbox = box.xyxy[0].tolist() if hasattr(box, 'xyxy') else None
                        
                        detections.append({
                            'class_id': class_id,
                            'class_name': class_name,
                            'confidence': confidence,
                            'bbox': bbox
                        })
            
            return detections
            
        except Exception as e:
            logger.error(f"❌ Detection error: {e}")
            return []
    
    def validate_image(self, image_data: Union[str, bytes, np.ndarray]) -> Dict:
        """
        Validate image and detect infrastructure issues
        
        Args:
            image_data: Image data
        
        Returns:
            Validation result with category, confidence, severity
        """
        try:
            # Preprocess image
            image = self.preprocess_image(image_data)
            
            # Check quality
            quality = self.check_image_quality(image)
            
            if not quality['is_valid']:
                return {
                    'isValid': False,
                    'reason': 'Image quality too low',
                    'quality': quality,
                    'category': None,
                    'confidence': 0,
                    'severity': None
                }
            
            # Detect objects
            detections = self.detect_objects(image)
            
            if not detections:
                return {
                    'isValid': False,
                    'reason': 'No objects detected',
                    'quality': quality,
                    'category': None,
                    'confidence': 0,
                    'severity': None
                }
            
            # Check for invalid objects
            for detection in detections:
                if detection['class_name'].lower() in INVALID_OBJECTS:
                    return {
                        'isValid': False,
                        'reason': f"Invalid object detected: {detection['class_name']}",
                        'quality': quality,
                        'category': None,
                        'confidence': 0,
                        'severity': None,
                        'invalid_object': detection['class_name']
                    }
            
            # Check for infrastructure issues
            # (In a real scenario, YOLO would be trained on infrastructure images)
            # For now, we'll use the highest confidence detection
            primary = max(detections, key=lambda x: x['confidence'])
            
            # Map to our categories (simplified)
            category = self.map_to_category(primary['class_name'])
            
            return {
                'isValid': True,
                'reason': 'Valid infrastructure image',
                'quality': quality,
                'category': category,
                'confidence': primary['confidence'],
                'severity': self.get_severity(category),
                'detections': detections,
                'primary_detection': primary
            }
            
        except Exception as e:
            logger.error(f"❌ Validation error: {e}")
            return {
                'isValid': False,
                'reason': f'Validation error: {str(e)}',
                'category': None,
                'confidence': 0,
                'severity': None
            }
    
    def map_to_category(self, class_name: str) -> str:
        """
        Map YOLO class name to our categories
        
        Args:
            class_name: YOLO detected class
        
        Returns:
            Our category name
        """
        class_lower = class_name.lower()
        
        # Check keywords for each category
        for category, info in INFRASTRUCTURE_CATEGORIES.items():
            for keyword in info['keywords']:
                if keyword in class_lower:
                    return category
        
        # Default mapping for common YOLO classes
        if 'car' in class_lower or 'truck' in class_lower:
            return 'road_damage'
        elif 'person' in class_lower:
            return 'other'
        
        return 'other'
    
    def get_severity(self, category: str) -> str:
        """Get severity for category"""
        if category in INFRASTRUCTURE_CATEGORIES:
            return INFRASTRUCTURE_CATEGORIES[category]['severity']
        return 'medium'


# ============================================
# SINGLETON INSTANCE
# ============================================

_yolo_model = None

def get_yolo_model() -> YOLOModel:
    """Get or create YOLO model instance"""
    global _yolo_model
    if _yolo_model is None:
        _yolo_model = YOLOModel()
    return _yolo_model