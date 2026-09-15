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
import requests

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import models and services
from models.yolo_model import get_yolo_model, YOLOModel
from models.nlp_model import NLPModel
from services.image_service import ImageService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# Initialize Models
# ============================================

logger.info("🔄 Loading AI Models...")

# Initialize YOLO model
try:
    yolo_model = get_yolo_model()
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

class AnalyzeResponse(BaseModel):
    isValid: bool
    category: str
    confidence: float
    severity: str
    descriptionAnalysis: dict
    imageAnalysis: Optional[dict] = None

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
# Main Analyze Endpoint (Image + Text)
# ============================================

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_complaint(
    imageUrl: str = Form(...),
    description: str = Form(...),
    location: Optional[str] = Form(None)
):
    """
    Analyze complaint image and description
    """
    try:
        logger.info(f"📥 Analyzing complaint: {description[:50]}...")
        
        # Default results
        category = 'other'
        confidence = 0.5
        severity = 'medium'
        is_valid = True
        description_analysis = {}
        image_analysis = None
        
        # Step 1: Analyze text with NLP
        if nlp_model:
            try:
                text_result = nlp_model.analyze_text(description)
                description_analysis = text_result
                
                if text_result.get('category_confidence', 0) > 0.5:
                    category = text_result['detected_category']
                    confidence = text_result['category_confidence']
                logger.info(f"📝 Text analysis: category={category}, confidence={confidence}")
            except Exception as e:
                logger.warning(f"⚠️ NLP analysis failed: {e}")
        
        # Step 2: Analyze image with YOLO
        if yolo_model and imageUrl:
            try:
                image_result = yolo_model.validate_image(imageUrl)
                image_analysis = image_result
                
                if image_result.get('isValid'):
                    # Use image category if confidence is high
                    if image_result.get('confidence', 0) > confidence:
                        category = image_result['category']
                        confidence = image_result['confidence']
                        severity = image_result.get('severity', severity)
                    logger.info(f"🖼️ Image analysis: category={category}, confidence={confidence}")
                else:
                    logger.warning(f"⚠️ Image invalid: {image_result.get('reason')}")
                    # If image is clearly invalid, reduce confidence
                    if 'invalid object' in image_result.get('reason', '').lower():
                        confidence = min(confidence, 0.4)
                        
            except Exception as e:
                logger.warning(f"⚠️ YOLO analysis failed: {e}")
        
        # Step 3: Cross-validation
        if image_analysis and description_analysis:
            image_category = image_analysis.get('category')
            text_category = description_analysis.get('detected_category')
            
            if image_category and text_category and image_category == text_category:
                # Both agree - boost confidence
                confidence = min(confidence + 0.1, 0.98)
                logger.info(f"✅ Cross-validation: Both agree on {image_category}")
            elif image_category and text_category and image_category != text_category:
                # Mismatch - flag for review
                logger.warning(f"⚠️ Category mismatch: image={image_category}, text={text_category}")
                confidence = min(confidence, 0.6)
        
        # Step 4: Determine final validity
        if confidence < 0.4:
            is_valid = False
        
        # Step 5: Determine severity
        if confidence > 0.8:
            severity = 'high'
        elif confidence > 0.6:
            severity = 'medium'
        else:
            severity = 'low'
        
        # Prepare response
        response = {
            'isValid': is_valid,
            'category': category,
            'confidence': round(confidence, 2),
            'severity': severity,
            'descriptionAnalysis': description_analysis,
            'imageAnalysis': image_analysis
        }
        
        logger.info(f"✅ Analysis complete: {response}")
        return response
        
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        
        return {
            'isValid': True,
            'category': 'other',
            'confidence': 0.5,
            'severity': 'medium',
            'descriptionAnalysis': {
                'sentiment': 'neutral',
                'keywords': [],
                'wordCount': len(description.split())
            },
            'imageAnalysis': None
        }

# ============================================
# Image Upload Endpoint
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
        
        # Analyze with YOLO
        result = ImageService.analyze_image(contents)
        
        return {
            'success': True,
            'filename': file.filename,
            'content_type': file.content_type,
            'analysis': result
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
        'categories': {
            'pothole': {'department': 'roads', 'severity': 'high'},
            'garbage': {'department': 'sanitation', 'severity': 'medium'},
            'streetlight': {'department': 'electricity', 'severity': 'medium'},
            'water_leakage': {'department': 'water', 'severity': 'high'},
            'road_damage': {'department': 'roads', 'severity': 'high'},
        }
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