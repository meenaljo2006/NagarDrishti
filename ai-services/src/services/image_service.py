"""
Image Processing Service
"""

import sys
import os
import cv2
import numpy as np
from PIL import Image
import io
import base64
import logging
from typing import Dict, Union

# Add src to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.yolo_model import get_yolo_model

logger = logging.getLogger(__name__)

class ImageService:
    """Service for image analysis"""
    
    @staticmethod
    def analyze_image(image_data: Union[str, bytes, np.ndarray]) -> Dict:
        """
        Analyze image and return results
        
        Args:
            image_data: Image data
        
        Returns:
            Analysis results
        """
        try:
            # Get YOLO model
            yolo = get_yolo_model()
            
            # Validate image
            result = yolo.validate_image(image_data)
            
            return {
                'success': True,
                'analysis': result
            }
            
        except Exception as e:
            logger.error(f"❌ Image analysis error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_image_info(image_data: Union[str, bytes, np.ndarray]) -> Dict:
        """Get basic image information"""
        try:
            # Load image
            if isinstance(image_data, str):
                if image_data.startswith('data:image'):
                    image_data = base64.b64decode(image_data.split(',')[1])
                elif image_data.startswith('http'):
                    import requests
                    response = requests.get(image_data, timeout=10)
                    image_data = response.content
                else:
                    image_data = open(image_data, 'rb').read()
            
            image = Image.open(io.BytesIO(image_data))
            
            return {
                'format': image.format,
                'mode': image.mode,
                'size': image.size,
                'width': image.width,
                'height': image.height
            }
            
        except Exception as e:
            return {'error': str(e)}