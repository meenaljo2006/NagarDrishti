"""
FastAPI Server for AI Services
"""

import os
import sys
import logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn
import base64
from io import BytesIO
from PIL import Image

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import models and services
from models.yolo_model import YOLOModel
from models.nlp_model import NLPModel
from services.image_service import ImageService
from utils.categories import CATEGORIES

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# Initialize Models
# ============================================

logger.info("🔄 Loading AI Models...")

# Initialize YOLO model (with fallback)
try:
    yolo_model = YOLOModel(confidence_threshold=0.5)
    logger.info("✅ YOLO model initialized")
except Exception as e:
    logger.warning(f"⚠️ YOLO model not available: {e}")
    yolo_model = None

# Initialize NLP model
try:
    nlp_model = NLPModel()
    logger.info("✅ NLP model initialized")
except Exception as e:
    logger.warning(f"⚠️ NLP model not available: {e}")
    nlp_model = None

logger.info("🚀 AI Services Ready!")

# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="NagarDrishti AI Services",
    description="AI-powered infrastructure issue detection",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Request/Response Models
# ============================================

class AnalyzeRequest(BaseModel):
    imageUrl: str
    description: str
    location: Optional[dict] = None

class AnalyzeResponse(BaseModel):
    isValid: bool
    category: str
    confidence: float
    severity: str
    descriptionAnalysis: dict

class HealthResponse(BaseModel):
    status: str
    models: dict
    version: str

# ============================================
# Health Check
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check if AI services are healthy"""
    return {
        "status": "healthy",
        "models": {
            "yolo": yolo_model is not None,
            "nlp": nlp_model is not None
        },
        "version": "1.0.0"
    }

# ============================================
# Analyze Endpoint
# ============================================

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_complaint(
    imageUrl: str = Form(...),
    description: str = Form(...),
    location: Optional[str] = Form(None)
):
    """
    Analyze complaint image and description
    
    Args:
        imageUrl: URL of the image
        description: Text description of the issue
        location: Location coordinates (optional)
    
    Returns:
        Analysis results with category, confidence, severity
    """
    try:
        logger.info(f"📥 Analyzing complaint: {description[:50]}...")
        
        # Initialize results
        category = 'other'
        confidence = 0.5
        severity = 'medium'
        is_valid = True
        description_analysis = {}
        
        # Step 1: Analyze description with NLP
        if nlp_model:
            try:
                text_result = nlp_model.analyze_text(description)
                logger.info(f"📝 NLP Analysis: {text_result}")
                
                # Use NLP category if confidence is high
                if text_result['category_confidence'] > 0.6:
                    category = text_result['detected_category']
                    confidence = text_result['category_confidence']
                    description_analysis = text_result
            except Exception as e:
                logger.warning(f"⚠️ NLP analysis failed: {e}")
        
        # Step 2: Analyze image with YOLO
        if yolo_model and imageUrl:
            try:
                # Download image from URL
                import requests
                response = requests.get(imageUrl, timeout=10)
                response.raise_for_status()
                image_data = response.content
                
                # Run YOLO prediction
                yolo_result = yolo_model.predict(image_data)
                logger.info(f"🖼️ YOLO Analysis: {yolo_result}")
                
                if yolo_result['primary_detection']:
                    # Map YOLO class to our categories
                    yolo_class = yolo_result['primary_detection']['class_name']
                    yolo_confidence = yolo_result['primary_detection']['confidence']
                    
                    # Check if class matches our categories
                    for cat_name, cat_info in CATEGORIES.items():
                        if yolo_class.lower() in cat_info['keywords']:
                            category = cat_name
                            confidence = max(confidence, yolo_confidence)
                            break
            except Exception as e:
                logger.warning(f"⚠️ YOLO analysis failed: {e}")
        
        # Step 3: Determine severity based on confidence and category
        if confidence > 0.8:
            severity = 'high'
        elif confidence > 0.6:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Step 4: Final validation
        if confidence < 0.3:
            is_valid = False
        
        # Step 5: Prepare response
        response = {
            'isValid': is_valid,
            'category': category,
            'confidence': round(confidence, 2),
            'severity': severity,
            'descriptionAnalysis': description_analysis
        }
        
        logger.info(f"✅ Analysis complete: {response}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        
        # Return fallback response
        return {
            'isValid': True,
            'category': 'other',
            'confidence': 0.5,
            'severity': 'medium',
            'descriptionAnalysis': {
                'sentiment': 'neutral',
                'keywords': [],
                'wordCount': len(description.split())
            }
        }

# ============================================
# Direct Image Upload Endpoint
# ============================================

@app.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    description: str = Form(""),
):
    """
    Analyze uploaded image directly
    """
    try:
        # Read image
        contents = await file.read()
        image_data = contents
        
        # Get image stats
        image_stats = ImageService.process_image(image_data)
        
        # Analyze with YOLO if available
        yolo_result = None
        if yolo_model:
            try:
                yolo_result = yolo_model.predict(image_data)
            except Exception as e:
                logger.warning(f"⚠️ YOLO error: {e}")
        
        return {
            'success': True,
            'image_stats': image_stats,
            'yolo_result': yolo_result,
            'description': description
        }
        
    except Exception as e:
        logger.error(f"❌ Image analysis error: {e}")
        return JSONResponse(
            status_code=500,
            content={'error': str(e)}
        )

# ============================================
# Categories Endpoint
# ============================================

@app.get("/categories")
async def get_categories():
    """Get available categories"""
    return {
        'categories': CATEGORIES
    }

# ============================================
# Main Entry Point
# ============================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )