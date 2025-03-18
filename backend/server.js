require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { Pool } = require("pg"); 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("151.231.152.66") 
        ? false 
        : { rejectUnauthorized: false }
});



const app = express();
app.use(express.json());
app.use(cors());

app.post("/api/register", async (req, res) => {
    const { name, personality } = req.body;

    try {
        const newUser = await pool.query(
            "INSERT INTO users (name, personality) VALUES ($1, $2) RETURNING *",
            [name, personality || "neutral"]
        );
        res.json(newUser.rows[0]);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Could not create user" });
    }
});

app.post("/api/login", async (req, res) => {
    const { name } = req.body;

    try {
        const user = await pool.query("SELECT * FROM users WHERE name = $1", [name]);

        if (user.rows.length === 0) {
            res.status(401).json({ error: "User not found" });
        } else {
            res.json(user.rows[0]);
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).json({ error: "Could not log in" });    
    }
});

app.post("/api/new-chat", async (req, res) => {
    const { userId, title } = req.body;

    try {
        const newChat = await pool.query(
            "INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *",
            [userId, title || "New Chat"]
        );
        res.json(newChat.rows[0]);
    } catch (error) {
        console.error("Error creating chat:", error);
        res.status(500).json({ error: "Could not create chat" });
    }
});

app.put("/api/chats/:chatId", async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;

    try {
        const updatedChat = await pool.query(
            "UPDATE chats SET title = $1 WHERE id = $2 RETURNING *",
            [title, chatId]
        );

        res.json(updatedChat.rows[0]);
    } catch (error) {
        console.error("Error renaming chat:", error);
        res.status(500).json({ error: "Could not rename chat" });
    }
});

app.delete("/api/chats/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        await pool.query("DELETE FROM chats WHERE id = $1", [chatId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting chat:", error);
        res.status(500).json({ error: "Could not delete chat" });
    }
});


app.get("/api/messages/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const messages = await pool.query(
            "SELECT sender, content, timestamp FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC",
            [chatId]
        );
        res.json(messages.rows);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Could not fetch messages" });
    }
});


app.get("/api/chats/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const chats = await pool.query("SELECT * FROM chats WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
        res.json(chats.rows);
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({ error: "Could not fetch chats" });
    }
});

app.get("/api/chat-info/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const chatQuery = await pool.query(
            "SELECT users.name, users.personality, users.preferences FROM users JOIN chats ON users.id = chats.user_id WHERE chats.id = $1",
            [chatId]
        );

        if (chatQuery.rows.length === 0) {
            return res.status(404).json({ error: "Chat not found" });
        }

        res.json(chatQuery.rows[0]);
    } catch (error) {
        console.error("Error fetching chat info:", error);
        res.status(500).json({ error: "Could not fetch chat info" });
    }
});


app.post("/api/chat", async (req, res) => {
    const { chatId, message } = req.body;

    try {
        // Fetch user data (name, personality, preferences)
        const userQuery = await pool.query(
            "SELECT users.name, users.personality, users.preferences FROM users JOIN chats ON users.id = chats.user_id WHERE chats.id = $1",
            [chatId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "Chat not found or user not associated" });
        }

        const user = userQuery.rows[0];
        let preferences = user.preferences || {};

        // Fetch chat history
        const chatHistory = await pool.query(
            "SELECT sender, content FROM messages WHERE chat_id = $1 ORDER BY timestamp ASC",
            [chatId]
        );

        // Construct AI context
        let context = `You are an AI assistant chatting with ${user.name}.`;
        context += ` They have a ${user.personality} personality.`;
        context += ` Their known preferences: ${JSON.stringify(preferences)}.`;
        context += ` Their previous messages:`;
        chatHistory.rows.forEach(chat => {
            context += `\n${chat.sender}: ${chat.content}`;
        });

        // Generate AI response
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: context }, { role: "user", content: message }],
        });

        const aiReply = response.choices[0].message.content;

        // Update preferences dynamically
        if (message.toLowerCase().includes("i like") || message.toLowerCase().includes("my preference is")) {
            const extractedPreference = message.replace(/(i like|my preference is)/gi, "").trim();
            preferences.updated = extractedPreference;

            // Save updated preferences to the database
            await pool.query("UPDATE users SET preferences = $1 WHERE name = $2", [preferences, user.name]);
        }

        // Save messages
        await pool.query("INSERT INTO messages (chat_id, sender, content) VALUES ($1, 'user', $2)", [chatId, message]);
        await pool.query("INSERT INTO messages (chat_id, sender, content) VALUES ($1, 'bot', $2)", [chatId, aiReply]);

        res.json({ reply: aiReply, updatedPreferences: preferences });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Error processing AI response" });
    }
});





app.listen(5000, () => console.log("Server running on port 5000"));
