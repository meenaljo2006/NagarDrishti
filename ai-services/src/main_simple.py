"""
NagarDrishti AI Service - Simple Version (No OpenCV required)
"""

from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="NagarDrishti AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "NagarDrishti AI Service Running"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "NagarDrishti AI",
        "version": "1.0.0"
    }

@app.post("/analyze")
async def analyze(
    imageUrl: str = Form(...),
    description: str = Form(...),
    location: str = Form(None)
):
    """
    Analyze complaint using keyword matching
    """
    text = description.lower()
    
    # Category detection
    categories = {
        'pothole': ['pothole', 'crack', 'hole', 'road damage', 'asphalt', 'craters'],
        'garbage': ['garbage', 'trash', 'waste', 'dump', 'litter', 'rubbish'],
        'streetlight': ['streetlight', 'light', 'lamp', 'dark', 'illumination'],
        'water_leakage': ['water', 'leak', 'pipe', 'drain', 'flood', 'overflow'],
        'road_damage': ['damage', 'broken', 'repair', 'construction', 'barricade']
    }
    
    best_category = 'other'
    best_score = 0
    
    for category, keywords in categories.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_category = category
    
    # Calculate confidence
    if best_score > 2:
        confidence = 0.85
    elif best_score > 1:
        confidence = 0.70
    elif best_score > 0:
        confidence = 0.50
    else:
        confidence = 0.30
    
    confidence = min(confidence, 0.95)
    
    # Determine severity
    if confidence > 0.8:
        severity = 'high'
    elif confidence > 0.6:
        severity = 'medium'
    else:
        severity = 'low'
    
    # Extract keywords
    keywords = [w for w in text.split() if len(w) > 3][:5]
    
    return {
        "isValid": confidence > 0.4,
        "category": best_category,
        "confidence": round(confidence, 2),
        "severity": severity,
        "descriptionAnalysis": {
            "sentiment": "neutral",
            "keywords": keywords,
            "wordCount": len(text.split())
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
