import sqlite3
import pandas as pd

db_file = "snippets.db"
sample_file = "github_snippets_sample.csv"
rows_to_read = 5000000 # Increased to 3 million for a better sample

print(f"Connecting to '{db_file}' to create a sample CSV...")

try:
    # Connect to the SQLite database
    conn = sqlite3.connect(db_file)
    print("✅ Successfully connected.")

    # Load a larger number of rows into a pandas DataFrame
    print(f"Loading {rows_to_read} rows from the 'snippets' table...")
    df_large_sample = pd.read_sql_query(f"SELECT snippet, language FROM snippets LIMIT {rows_to_read}", conn)
    print("✅ Large sample loaded successfully.")

    # --- NEW: Clean and filter for major languages ---
    df_large_sample.dropna(inplace=True)
    target_languages = [
        'JavaScript', 'Python', 'Java', 'C++', 'C', 
        'HTML', 'CSS', 'Shell', 'Ruby', 'Go', 'CSV', 'Powershell', 'Rust', 'Text', 'YAML'
    ]
    df_filtered = df_large_sample[df_large_sample['language'].isin(target_languages)]
    print(f"✅ Filtered down to {len(df_filtered)} rows with target languages.")

    # Save the filtered (but not yet balanced) DataFrame to the CSV file
    df_filtered.to_csv(sample_file, index=False)
    print(f"✅ Successfully created '{sample_file}' with the filtered data.")

except Exception as e:
    print(f"❌ An error occurred: {e}")

finally:
    # Close the connection
    if 'conn' in locals():
        conn.close()
        print("Database connection closed.")