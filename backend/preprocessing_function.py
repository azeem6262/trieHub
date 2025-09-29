def enhanced_preprocessing(text):
    if pd.isna(text):
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
