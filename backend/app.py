import os
import re
from flask import Flask, jsonify, request
from github import Github, RateLimitExceededException
from dotenv import load_dotenv
import joblib
from flask_cors import CORS
import pandas as pd

load_dotenv()
app = Flask(__name__)
CORS(app)

# --- Enhanced Text Preprocessing Function ---
def enhanced_preprocessing(text):
    """Enhanced text preprocessing for better model accuracy"""
    if not text or pd.isna(text):
        return ""
    
    text = str(text)
    
    # Remove excessive whitespace and normalize
    text = re.sub(r'\s+', ' ', text)
    
    # Keep important programming symbols but normalize
    text = re.sub(r'[{}();,]', lambda m: f' {m.group()} ', text)
    
    # Handle common programming patterns
    text = re.sub(r'(\w+)\s*\(', r'\1 (', text)  # function calls
    text = re.sub(r'(\w+)\s*\[', r'\1 [', text)  # array access
    text = re.sub(r'(\w+)\s*\{', r'\1 {', text)  # object/block start
    
    # Normalize numbers and strings
    text = re.sub(r'\b\d+\b', ' NUM ', text)
    text = re.sub(r'"[^"]*"', ' STRING ', text)
    text = re.sub(r"'[^']*'", ' STRING ', text)
    
    # Handle imports and includes
    text = re.sub(r'(import|from|include|require)\s+\w+', r'\1 MODULE', text)
    
    return text.strip()

# --- Enhanced Model Loading ---
try:
    # Try to load the enhanced model first
    vectorizer = joblib.load('enhanced_vectorizer.pkl')
    model = joblib.load('enhanced_language_classifier.pkl')
    print("✅ Enhanced model and vectorizer loaded successfully.")
    model_type = "enhanced_ensemble"
except FileNotFoundError:
    try:
        # Fallback to original model
        vectorizer = joblib.load('vectorizer.pkl')
        model = joblib.load('language_classifier.pkl')
        print("✅ Original model and vectorizer loaded successfully.")
        model_type = "original"
    except FileNotFoundError:
        vectorizer = None
        model = None
        model_type = "none"
        print("🔴 WARNING: No model files found.")

# --- GitHub Client (keep as is) ---
auth_token = os.getenv("GITHUB_TOKEN")
g = Github(auth_token)

# --- NEW: Recursive helper function ---
def get_repo_contents_recursive(repo, path=""):
    """
    Recursively fetches all files from a repository, traversing into subdirectories.
    """
    try:
        contents = repo.get_contents(path)
        all_files = []
        for content_file in contents:
            if content_file.type == "dir":
                # If it's a directory, recurse into it and extend the list
                all_files.extend(get_repo_contents_recursive(repo, content_file.path))
            else:
                # If it's a file, add it to the list
                all_files.append(content_file)
        return all_files
    except RateLimitExceededException:
        raise # Re-throw the exception to be caught by the main handler
    except Exception:
        # Ignore errors from non-existent paths or other issues
        return []

@app.route('/predict', methods=['GET'])
def predict_repo_languages():
    if not model or not vectorizer:
        return jsonify({"error": "Model not loaded"}), 500

    repo_path = request.args.get('repo')
    if not repo_path:
        return jsonify({"error": "Repository path is required"}), 400

    try:
        repo = g.get_repo(repo_path)
        
        # --- FIX: Call the new recursive function ---
        all_repo_files = get_repo_contents_recursive(repo)
        
        language_predictions = []
        for file_content in all_repo_files:
            # Skip very large files to avoid long processing times
            if file_content.size > 100000: continue
            
            try:
                content_text = file_content.decoded_content.decode('utf-8')
                
                # Apply enhanced preprocessing if using enhanced model
                if model_type == "enhanced_ensemble":
                    processed_content = enhanced_preprocessing(content_text)
                else:
                    processed_content = content_text
                
                content_tfidf = vectorizer.transform([processed_content])
                prediction = model.predict(content_tfidf)
                
                # Get prediction confidence if available
                confidence = None
                if hasattr(model, 'predict_proba'):
                    proba = model.predict_proba(content_tfidf)
                    confidence = float(proba.max())
                
                prediction_data = {
                    "file": file_content.path,
                    "predicted_language": prediction[0],
                    "model_type": model_type
                }
                
                if confidence is not None:
                    prediction_data["confidence"] = confidence
                
                language_predictions.append(prediction_data)
                
            except Exception as e:
                # Skip files that can't be decoded or processed
                print(f"Skipping file {file_content.path}: {str(e)}")
                continue

        return jsonify({
            "repository": repo.full_name,
            "predictions": language_predictions,
            "model_info": {
                "type": model_type,
                "total_files_processed": len(language_predictions),
                "avg_confidence": sum(p.get("confidence", 0) for p in language_predictions) / len(language_predictions) if language_predictions else 0
            }
        })

    except RateLimitExceededException:
        return jsonify({"error": "GitHub API rate limit exceeded. Please try again later."}), 429
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)