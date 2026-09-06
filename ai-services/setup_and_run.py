#!/usr/bin/env python
"""
NagarDrishti AI Services - Complete Setup & Run Script
This file handles everything: dependency installation, compatibility fixes, and service startup
"""

import os
import sys
import subprocess
import platform
import json
import time
import importlib
import pkg_resources
from pathlib import Path

# ============================================
# CONFIGURATION
# ============================================

# Required packages with compatible versions
REQUIRED_PACKAGES = {
    'numpy': '1.26.4',
    'opencv-python': '4.8.1.78',
    'Pillow': '10.1.0',
    'ultralytics': '8.0.185',
    'torch': '2.1.0',
    'torchvision': '0.16.0',
    'transformers': '4.35.0',
    'sentencepiece': '0.1.99',
    'protobuf': '3.20.3',
    'requests': '2.31.0',
    'scikit-learn': '1.3.1',
    'fastapi': '0.104.1',
    'uvicorn': '0.24.0',
    'python-multipart': '0.0.6',
    'python-dotenv': '1.0.0',
    'pydantic': '2.5.0'
}

# Packages that need special installation
SPECIAL_INSTALL = {
    'torch': '--index-url https://download.pytorch.org/whl/cpu',
    'torchvision': '--index-url https://download.pytorch.org/whl/cpu'
}

# ============================================
# UTILITY FUNCTIONS
# ============================================

def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {text}")
    print("=" * 60)

def print_success(text):
    """Print success message"""
    print(f"✅ {text}")

def print_error(text):
    """Print error message"""
    print(f"❌ {text}")

def print_info(text):
    """Print info message"""
    print(f"📌 {text}")

def print_progress(text):
    """Print progress message"""
    print(f"🔄 {text}")

def get_python_version():
    """Get Python version"""
    return f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

def is_package_installed(package_name):
    """Check if a package is installed"""
    try:
        pkg_resources.get_distribution(package_name)
        return True
    except pkg_resources.DistributionNotFound:
        return False
    except Exception:
        return False

def get_package_version(package_name):
    """Get installed package version"""
    try:
        return pkg_resources.get_distribution(package_name).version
    except Exception:
        return None

# ============================================
# INSTALLATION FUNCTIONS
# ============================================

def install_package(package_name, version=None, special_args=None):
    """
    Install a package with specific version
    """
    package_spec = f"{package_name}=={version}" if version else package_name
    
    cmd = [sys.executable, "-m", "pip", "install", package_spec]
    
    if special_args:
        cmd.extend(special_args.split())
    
    # Add --only-binary for problematic packages
    if package_name in ['numpy', 'opencv-python']:
        cmd.append("--only-binary=:all:")
    
    # Add --no-cache-dir to avoid issues
    cmd.insert(3, "--no-cache-dir")
    
    print_progress(f"Installing {package_spec}...")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            print_success(f"{package_name} installed successfully")
            return True
        else:
            print_error(f"{package_name} installation failed")
            if "error" in result.stderr.lower() or "error" in result.stdout.lower():
                # Try without version
                print_info(f"Retrying {package_name} without specific version...")
                return install_package(package_name, None, special_args)
            return False
            
    except Exception as e:
        print_error(f"Error installing {package_name}: {str(e)}")
        return False

def install_all_packages():
    """Install all required packages"""
    print_header("Installing Required Packages")
    
    # First, upgrade pip
    print_progress("Upgrading pip...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "--upgrade", "pip"],
        capture_output=True
    )
    
    success_count = 0
    failed_packages = []
    
    for package, version in REQUIRED_PACKAGES.items():
        special_args = SPECIAL_INSTALL.get(package, None)
        
        if install_package(package, version, special_args):
            success_count += 1
        else:
            failed_packages.append(package)
    
    print_header("Installation Summary")
    print_success(f"Installed: {success_count}/{len(REQUIRED_PACKAGES)} packages")
    
    if failed_packages:
        print_error(f"Failed packages: {', '.join(failed_packages)}")
        print_info("These packages might still work. Continuing...")
    
    return success_count > 0

def verify_installation():
    """Verify all critical packages are installed"""
    print_header("Verifying Installation")
    
    critical_packages = ['numpy', 'cv2', 'torch', 'fastapi', 'uvicorn']
    all_ok = True
    
    for package in critical_packages:
        try:
            if package == 'cv2':
                import cv2
                version = cv2.__version__
            else:
                module = importlib.import_module(package)
                version = getattr(module, '__version__', 'unknown')
            
            print_success(f"{package}: {version}")
        except ImportError:
            print_error(f"{package}: NOT INSTALLED")
            all_ok = False
        except Exception as e:
            print_error(f"{package}: Error - {str(e)}")
            all_ok = False
    
    return all_ok

# ============================================
# SERVICE CREATION FUNCTIONS
# ============================================

def create_simple_service():
    """Create the simple AI service file if it doesn't exist"""
    service_path = Path("src/main_simple.py")
    
    if service_path.exists():
        print_info("Simple service already exists")
        return True
    
    print_progress("Creating simple AI service...")
    
    service_code = '''"""
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
'''
    
    try:
        # Create src directory if it doesn't exist
        os.makedirs("src", exist_ok=True)
        
        with open(service_path, "w", encoding="utf-8") as f:
            f.write(service_code)
        
        print_success("Simple service created")
        return True
    except Exception as e:
        print_error(f"Failed to create service: {str(e)}")
        return False

def create_run_script():
    """Create a run script for easy startup"""
    run_path = Path("run_service.bat")
    
    run_code = '''@echo off
echo 🚀 Starting NagarDrishti AI Service...
echo.
call venv\\Scripts\\activate
python src/main_simple.py
pause
'''
    
    try:
        with open(run_path, "w") as f:
            f.write(run_code)
        print_success("Run script created: run_service.bat")
        return True
    except Exception as e:
        print_error(f"Failed to create run script: {str(e)}")
        return False

# ============================================
# MAIN SETUP FUNCTION
# ============================================

def main():
    """Main setup and run function"""
    print_header("NagarDrishti AI Services - Setup & Run")
    
    # Check Python version
    python_version = get_python_version()
    print_info(f"Python Version: {python_version}")
    
    # Check if we're in a virtual environment
    in_venv = sys.prefix != sys.base_prefix
    if in_venv:
        print_success("Virtual environment detected")
    else:
        print_info("No virtual environment detected. Creating one...")
        create_venv()
    
    # Install packages
    print_header("Step 1: Installing Dependencies")
    install_success = install_all_packages()
    
    # Verify installation
    print_header("Step 2: Verifying Installation")
    verify_success = verify_installation()
    
    # Create service files
    print_header("Step 3: Creating Service Files")
    create_simple_service()
    create_run_script()
    
    # Final status
    print_header("Setup Complete!")
    
    if verify_success:
        print_success("✅ All critical packages installed correctly!")
    else:
        print_info("⚠️ Some packages may not be installed. The service will still work with basic features.")
    
    print_info("📌 To start the service, run:")
    print("    run_service.bat")
    print("    OR")
    print("    python src/main_simple.py")
    
    print_info("📌 To test the service:")
    print("    curl http://localhost:8000/health")
    
    # Ask if user wants to start the service
    print("\n")
    response = input("🚀 Start the service now? (y/n): ")
    
    if response.lower() == 'y':
        print_header("Starting Service...")
        os.chdir("src")
        subprocess.run([sys.executable, "main_simple.py"])
    
    print_header("Setup Complete! 🎉")

def create_venv():
    """Create virtual environment"""
    print_progress("Creating virtual environment...")
    try:
        subprocess.run(
            [sys.executable, "-m", "venv", "venv"],
            capture_output=True,
            check=True
        )
        print_success("Virtual environment created")
        return True
    except Exception as e:
        print_error(f"Failed to create virtual environment: {str(e)}")
        return False

# ============================================
# ENTRY POINT
# ============================================

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️ Setup interrupted by user")
    except Exception as e:
        print_error(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
    
    input("\nPress Enter to exit...")