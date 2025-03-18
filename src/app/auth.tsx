"use client";

import { useState } from "react";
import axios from "axios";

export default function Auth({ onAuth }: { onAuth: (user: any) => void }) {
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [isRegistering, setIsRegistering] = useState(true);

  const handleAuth = async () => {
    try {
      const endpoint = isRegistering ? "/api/register" : "/api/login";
      const response = await axios.post(`http://localhost:5000${endpoint}`, {
        name,
        personality,
      });

      localStorage.setItem("user", JSON.stringify(response.data));
      onAuth(response.data); // Notify parent component
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">{isRegistering ? "Register" : "Login"}</h2>
        
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 w-full mb-2 rounded"
        />

        {isRegistering && (
          <input
            type="text"
            placeholder="Personality (optional)"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            className="border p-2 w-full mb-2 rounded"
          />
        )}

        <button onClick={handleAuth} className="bg-blue-600 text-white p-2 w-full rounded-md">
          {isRegistering ? "Register" : "Login"}
        </button>

        <button
          onClick={() => setIsRegistering(!isRegistering)}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          {isRegistering ? "Already have an account? Login" : "No account? Register"}
        </button>
      </div>
    </div>
  );
}
