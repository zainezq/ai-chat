"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [chats, setChats] = useState<{ id: number; title: string }[]>([]);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [preferences, setPreferences] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("1"); // Replace with actual logged-in user ID
  const [chatId, setChatId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchChats();
    if (chatId) {
      fetchMessages(chatId);
    }
  }, [chatId]);

  // Fetch all chats for the user
  const fetchChats = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/chats/${userId}`);
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // Create a new chat and set it as active
  const createNewChat = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/new-chat", {
        userId,
        title: "New Chat",
      });

      setChats([response.data, ...chats]); // Add new chat to the list
      setChatId(response.data.id); // Set the current chat
      setMessages([]); // Clear messages for a fresh start
      setPreferences({}); // Reset preferences for the new chat
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  // Fetch messages and user preferences for a selected chat
  const fetchMessages = async (chatId: number) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/messages/${chatId}`);
      setMessages(response.data.map((msg: { sender: any; content: any; }) => ({ role: msg.sender, text: msg.content })));

      // Fetch user preferences
      const chatResponse = await axios.get(`http://localhost:5000/api/chat-info/${chatId}`);
      setPreferences(chatResponse.data.preferences);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Send message and update chat
  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;

    const newMessages = [...messages, { role: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        chatId,
        message: input,
      });

      setMessages([...newMessages, { role: "bot", text: response.data.reply }]);
      setPreferences(response.data.updatedPreferences); // Update preferences dynamically
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar for chat history */}
      <div className={`bg-gray-800 text-white p-4 transition-all duration-300 ${isSidebarOpen ? "w-64" : "w-16"}`}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mb-4 focus:outline-none">
          {isSidebarOpen ? "⬅️" : "➡️"}
        </button>

        {isSidebarOpen && (
          <div>
            <button onClick={createNewChat} className="bg-blue-600 text-white p-2 w-full rounded-md mb-4">
              ➕ New Chat
            </button>

            <h2 className="text-lg font-bold mb-4">Chats</h2>
            {chats.map((chat) => (
              <p
                key={chat.id}
                onClick={() => setChatId(chat.id)}
                className={`p-2 cursor-pointer ${chatId === chat.id ? "bg-blue-400" : "hover:bg-gray-600"} rounded-md`}
              >
                {chat.title}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Main Chat UI */}
      <div className="flex flex-col flex-1 justify-between p-4 bg-gray-100">
        <div className="overflow-auto flex-1 border p-4 bg-white rounded-lg shadow-md">
          {messages.map((msg, index) => (
            <p
              key={index}
              className={`p-2 ${msg.role === "user" ? "bg-blue-500 text-white text-right" : "bg-green-500 text-white text-left"} rounded-lg my-1 max-w-[60%] ${msg.role === "user" ? "ml-auto" : ""}`}
            >
              {msg.text}
            </p>
          ))}
        </div>

        {/* Display user preferences */}
        <div className="p-2 bg-gray-200 rounded-lg mt-2">
          <h3 className="text-md font-bold">User Preferences</h3>
          <p className="text-sm text-gray-700">{Object.keys(preferences).length ? JSON.stringify(preferences) : "No preferences set yet."}</p>
        </div>

        <div className="flex items-center mt-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border p-2 flex-1 rounded-l-lg"
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-r-lg">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
