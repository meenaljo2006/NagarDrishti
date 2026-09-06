"""
Image Processing Service
"""

import cv2
import numpy as np
from PIL import Image
import io
import base64
import logging

logger = logging.getLogger(__name__)

class ImageService:
    """Service for processing and analyzing images"""
    
    @staticmethod
    def process_image(image_data):
        """
        Process image for analysis
        
        Args:
            image_data: Image data (bytes, base64, or path)
        
        Returns:
            dict: Image analysis results
        """
        try:
            # Preprocess image
            image = ImageService._preprocess_image(image_data)
            
            # Get image metadata
            height, width = image.shape[:2]
            total_pixels = height * width
            
            # Check image quality
            is_valid = ImageService._check_image_quality(image)
            
            # Get image stats
            stats = {
                'width': width,
                'height': height,
                'total_pixels': total_pixels,
                'is_valid': is_valid,
                'aspect_ratio': width / height
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Image processing error: {e}")
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    @staticmethod
    def _preprocess_image(image_data):
        """Preprocess image for analysis"""
        # If image is base64 string
        if isinstance(image_data, str) and image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            return np.array(image)
        
        # If image is bytes
        elif isinstance(image_data, bytes):
            image = Image.open(io.BytesIO(image_data))
            return np.array(image)
        
        # If image is file path
        elif isinstance(image_data, str):
            image = cv2.imread(image_data)
            return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # If image is already numpy array
        elif isinstance(image_data, np.ndarray):
            return image_data
        
        else:
            raise ValueError("Unsupported image format")
    
    @staticmethod
    def _check_image_quality(image):
        """
        Check image quality
        
        Args:
            image: Image as numpy array
        
        Returns:
            bool: True if image quality is acceptable
        """
        try:
            # Check if image is empty
            if image is None or image.size == 0:
                return False
            
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Check brightness
            mean_brightness = np.mean(gray)
            if mean_brightness < 30 or mean_brightness > 250:
                return False  # Too dark or too bright
            
            # Check contrast
            std_brightness = np.std(gray)
            if std_brightness < 10:
                return False  # Low contrast
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Quality check error: {e}")
            return False