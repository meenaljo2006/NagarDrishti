"""
NLP Model for Text Analysis
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import logging
import re
from ..utils.categories import CATEGORIES

logger = logging.getLogger(__name__)

class NLPModel:
    """NLP model for text classification and analysis"""
    
    def __init__(self, model_name='distilbert-base-uncased'):
        """
        Initialize NLP model
        
        Args:
            model_name: Hugging Face model name
        """
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load Hugging Face model"""
        try:
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=len(CATEGORIES)
            )
            logger.info(f"✅ NLP model loaded: {self.model_name}")
        except Exception as e:
            logger.warning(f"⚠️ Could not load full NLP model: {e}")
            logger.info("📝 Using fallback text analysis")
    
    def extract_keywords(self, text):
        """
        Extract keywords from text
        
        Args:
            text: Input text
        
        Returns:
            list: Extracted keywords
        """
        # Clean text
        text = text.lower()
        text = re.sub(r'[^a-z\s]', '', text)
        
        # Split into words
        words = text.split()
        
        # Remove stopwords
        stopwords = {'the', 'a', 'an', 'of', 'for', 'on', 'at', 'to', 'in', 'with', 'by'}
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        
        return keywords
    
    def detect_category_from_text(self, text):
        """
        Detect issue category from text
        
        Args:
            text: Input text
        
        Returns:
            dict: Category detection results
        """
        keywords = self.extract_keywords(text)
        
        # Count matches for each category
        category_scores = {}
        for category_name, info in CATEGORIES.items():
            score = 0
            for keyword in info['keywords']:
                if keyword in text.lower():
                    score += 1
            category_scores[category_name] = score
        
        # Find best matching category
        max_score = max(category_scores.values()) if category_scores else 0
        
        if max_score > 0:
            best_category = max(category_scores, key=category_scores.get)
            confidence = min(0.5 + (max_score * 0.1), 0.95)
        else:
            best_category = 'other'
            confidence = 0.3
        
        return {
            'category': best_category,
            'confidence': confidence,
            'keywords': keywords,
            'scores': category_scores
        }
    
    def analyze_text(self, text):
        """
        Analyze text for sentiment and keywords
        
        Args:
            text: Input text
        
        Returns:
            dict: Analysis results
        """
        # Extract keywords
        keywords = self.extract_keywords(text)
        
        # Detect category
        category_result = self.detect_category_from_text(text)
        
        # Sentiment analysis (simplified)
        positive_words = {'good', 'great', 'excellent', 'nice', 'clean', 'fixed'}
        negative_words = {'bad', 'poor', 'broken', 'damage', 'leak', 'dangerous', 'urgent'}
        
        words = text.lower().split()
        sentiment_score = 0
        for word in words:
            if word in positive_words:
                sentiment_score += 1
            elif word in negative_words:
                sentiment_score -= 1
        
        if sentiment_score > 1:
            sentiment = 'positive'
        elif sentiment_score < -1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'sentiment_score': sentiment_score,
            'keywords': keywords,
            'word_count': len(words),
            'detected_category': category_result['category'],
            'category_confidence': category_result['confidence'],
            'category_scores': category_result['scores']
        }