import tkinter as tk
from tkinter import scrolledtext
import threading
import queue
from llama_wrapper import query_llama

class ChatApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Chatbot")
        self.root.geometry("600x400")

        # Chat history display
        self.chat_history = scrolledtext.ScrolledText(root, wrap=tk.WORD, state='disabled')
        self.chat_history.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Input frame (to hold the input field and send button)
        input_frame = tk.Frame(root)
        input_frame.pack(fill=tk.X, padx=10, pady=10)

        # User input field
        self.user_input = tk.Entry(input_frame, font=("Arial", 12))
        self.user_input.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.user_input.bind("<Return>", self.send_message)  # Bind Enter key to send message

        # Send button
        self.send_button = tk.Button(input_frame, text="Send", command=self.send_message)
        self.send_button.pack(side=tk.RIGHT, padx=(10, 0))

        # Queue for thread-safe GUI updates
        self.queue = queue.Queue()

        # Start a thread to process the queue
        self.process_queue()

    def send_message(self, event=None):
        user_message = self.user_input.get().strip()
        if user_message:
            self.display_message(f"You: {user_message}\n")
            self.user_input.delete(0, tk.END)

            # Run the AI query in a separate thread
            threading.Thread(target=self.get_ai_response, args=(user_message,)).start()

    def get_ai_response(self, user_message):
        ai_response = query_llama(user_message)
        # Use the queue to update the GUI safely
        self.queue.put(f"AI: {ai_response}\n")

    def display_message(self, message):
        self.chat_history.config(state='normal')
        self.chat_history.insert(tk.END, message)
        self.chat_history.config(state='disabled')
        self.chat_history.yview(tk.END)

    def process_queue(self):
        try:
            while True:
                message = self.queue.get_nowait()
                self.display_message(message)
        except queue.Empty:
            pass
        # Schedule the method to run again
        self.root.after(100, self.process_queue)

if __name__ == "__main__":
    root = tk.Tk()
    app = ChatApp(root)
    root.mainloop()
