"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import Auth from "./auth"; 
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<{ id: number; title: string }[]>([]);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [preferences, setPreferences] = useState<{ [key: string]: string }>({});
  const [input, setInput] = useState("");
  const [chatId, setChatId] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchChats();
      if (chatId) {
        fetchMessages(chatId);
      }
    }
  }, [user, chatId]);

  // Fetch all chats for the user
  const fetchChats = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/chats/${user.id}`);
      setChats(response.data);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  // Create a new chat and set it as active
  const createNewChat = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/new-chat", {
        userId: user.id,
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
    setIsTyping(true);

    try {
      const response = await axios.post("http://localhost:5000/api/chat", {
        chatId,
        message: input,
      });

      setMessages([...newMessages, { role: "bot", text: response.data.reply }]);
      setPreferences(response.data.updatedPreferences);
    } catch (error) {
      console.error("Error sending message:", error);
    }
    finally {
      setIsTyping(false);
    }
  };

  const renameChat = async (chatId: number) => {
    if (!newTitle.trim()) return;
  
    try {
      const response = await axios.put(`http://localhost:5000/api/chats/${chatId}`, {
        title: newTitle,
      });
  
      setChats(chats.map(chat => (chat.id === chatId ? response.data : chat)));
      setRenameId(null); // Hide rename input
      setNewTitle(""); // Reset input
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  };
  
  const deleteChat = async (chatId: number) => {
    try {
      await axios.delete(`http://localhost:5000/api/chats/${chatId}`);
      setChats(chats.filter(chat => chat.id !== chatId));
  
      if (chatId === chatId) {
        setChatId(null); // Clear chat if the active one is deleted
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };
  
  

  // If the user is not authenticated, show the Auth page
  if (!user) {
    return <Auth onAuth={setUser} />;
  }
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
    <div key={chat.id} className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-600 rounded-md">
      {renameId === chat.id ? (
        <>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-1 rounded w-full"
          />
          <button onClick={() => renameChat(chat.id)} className="ml-2 text-green-500">✅</button>
          <button onClick={() => setRenameId(null)} className="ml-2 text-red-500">❌</button>
        </>
      ) : (
        <>
          <p onClick={() => setChatId(chat.id)} className={`${chatId === chat.id ? "bg-blue-400" : ""} p-2 flex-1`}>
            {chat.title}
          </p>
          <button onClick={() => setRenameId(chat.id)} className="text-yellow-500 ml-2">✏️</button>
          <button onClick={() => deleteChat(chat.id)} className="text-red-500 ml-2">🗑️</button>
        </>
      )}
    </div>
  ))}
</div>

        )}
      </div>

      {/* Main Chat UI */}
      <div className="flex flex-col flex-1 justify-between p-4 bg-gray-100">
        <div className="overflow-auto flex-1 border p-4 bg-white rounded-lg shadow-md">
        {messages.map((msg, index) => (
            <div key={index} className={`p-2 rounded-lg my-1 max-w-[60%] ${msg.role === "user" ? "bg-blue-500 text-white ml-auto" : "bg-green-500 text-white"}`}>
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          ))}
          {isTyping && <p className="text-gray-500 italic">AI is typing...</p>}
        
        </div>

        {/* Display user preferences */}
        <div className="p-2 bg-gray-200 rounded-lg mt-2">
        <h3 className="text-md font-bold">User Preferences</h3>
        {Object.keys(preferences).length > 0 ? (
          <ul className="text-sm text-gray-700">
            {Object.entries(preferences).map(([key, value]) => (
              <li key={key} className="mt-1">
                <span className="font-semibold">{key}:</span> 
                {Array.isArray(value) ? value.map(v => v.trim()).join(", ") : value.trim()}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-700">No preferences set yet.</p>
        )}
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
