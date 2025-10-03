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

# --- MODEL LOADING & GITHUB CLIENT (No changes needed here) ---
# ... (your existing model loading and GitHub client code) ...

# Initialize GitHub client from environment token if available
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
github_client = Github(GITHUB_TOKEN) if GITHUB_TOKEN else Github()

# --- NEW: HELPER FUNCTIONS FOR VISUALIZATION DATA ---
def build_language_counts(predictions):
    """Counts the occurrences of each predicted language."""
    counts = {}
    for p in predictions:
        lang = p['predicted_language']
        counts[lang] = counts.get(lang, 0) + 1
    return counts

def build_tree_from_paths(predictions, root_name):
    """Build a single-root hierarchical tree for react-d3-tree.

    Output shape:
    {
      name: <root_name>,
      children: [ ... ],
    }
    - Directories appear before files in each branch
    - Files carry an attributes.language field
    - File nodes have no children
    """
    # Build a nested dict structure first
    tree = {}
    for item in predictions:
        parts = [p for p in item['file'].split('/') if p]
        current_level = tree
        for i, part in enumerate(parts):
            is_file = (i == len(parts) - 1)
            if part not in current_level:
                current_level[part] = {} if not is_file else {"lang": item['predicted_language']}
            current_level = current_level[part]

    def is_file_node(node_dict):
        return "lang" in node_dict

    # Format into react-d3-tree structure with directory-first sorting
    def format_tree(name, node_dict):
        if is_file_node(node_dict):
            return {"name": name, "attributes": {"language": node_dict["lang"], "type": "file"}}
        # Separate dirs and files
        dir_keys = [k for k, v in node_dict.items() if not is_file_node(v)]
        file_keys = [k for k, v in node_dict.items() if is_file_node(v)]
        dir_keys.sort()
        file_keys.sort()
        children = [format_tree(k, node_dict[k]) for k in dir_keys] + [format_tree(k, node_dict[k]) for k in file_keys]
        return {"name": name, "attributes": {"type": "directory"}, "children": children}

    return format_tree(root_name, tree)


# --- YOUR EXISTING HELPER AND PREDICT ENDPOINT ---

EXTENSION_TO_LANGUAGE = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".jsx": "JavaScript",
    ".java": "Java",
    ".rb": "Ruby",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".c": "C",
    ".cs": "C#",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".m": "Objective-C",
    ".mm": "Objective-C++",
    ".scala": "Scala",
    ".r": "R",
    ".jl": "Julia",
    ".sh": "Shell",
    ".ps1": "PowerShell",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".md": "Markdown",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".toml": "TOML",
    ".json": "JSON",
}

def get_repo_contents_recursive(repo, path=""):
    """Return a flat list of ContentFile objects for all files in the repo under path."""
    contents_stack = list(repo.get_contents(path))
    all_files = []
    while contents_stack:
        content = contents_stack.pop(0)
        if content.type == "dir":
            contents_stack.extend(repo.get_contents(content.path))
        else:
            all_files.append(content)
    return all_files

@app.route('/predict', methods=['GET'])
def predict_repo_languages():
    try:
        # Read repo path from query string, e.g., /predict?repo=owner/name
        repo_path = request.args.get("repo")
        if not repo_path:
            return jsonify({"error": "Missing required query parameter: repo (format: owner/name)"}), 400

        repo = github_client.get_repo(repo_path)
        all_repo_files = get_repo_contents_recursive(repo)
        
        # Build predictions from file extensions
        language_predictions = []
        MAX_FILES = 1000  # safety cap
        for f in all_repo_files[:MAX_FILES]:
            _, ext = os.path.splitext(f.path.lower())
            predicted = EXTENSION_TO_LANGUAGE.get(ext, "Unknown")
            language_predictions.append({
                "file": f.path,
                "predicted_language": predicted,
            })

        # --- FIX: Generate data for visualizations ---
        language_counts = build_language_counts(language_predictions)
        file_tree = build_tree_from_paths(language_predictions, root_name=repo.full_name)
        
        return jsonify({
            "repository": repo.full_name,
            "predictions": language_predictions,
            "language_counts": language_counts, # Data for the pie chart
            "file_tree": file_tree           # Data for the interactive tree
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5001)