import subprocess

def query_llama(prompt):
    command = [
        "/home/zaine/llama.cpp/build/bin/llama-cli",
        "-m", "/home/zaine/llama.cpp/models/llama-7b.gguf",
        "-p", prompt,
        "-t", "4"  # Use 4 threads
    ]
    print("Running command:", " ".join(command))  # Debug print
    result = subprocess.run(command, capture_output=True, text=True)
    print("Command output:", result.stdout)  # Debug print
    print("Command error:", result.stderr)  # Debug print
    return result.stdout.strip()
