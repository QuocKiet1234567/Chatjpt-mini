const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const { createEvent } = require("./calendar");
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const API_KEY = process.env.GROQ_API_KEY;
const SHEET_URL = process.env.SHEET_URL;

// ================= AI ROUTER =================
async function classifyMessage(message) {
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `
Bạn là AI quản lý công việc chuyên nghiệp.

Trả JSON DUY NHẤT:

{
  "intent": "task | plan | chat",
  "items": [
    {
      "task": "",
      "time": "",
      "priority": "low | medium | high"
    }
  ]
}

QUY TẮC:
- nhiều việc → plan
- 1 việc → task
- không phải việc → chat
- tự hiểu thời gian: mai, hôm nay, 3h, chiều...
- tự gán priority
`
          },
          { role: "user", content: message }
        ],
        temperature: 0
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return JSON.parse(res.data.choices[0].message.content);

  } catch (err) {
    console.log("CLASSIFY ERROR:", err.message);
    return { intent: "chat", items: [] };
  }
}

// ================= TIME PARSER =================
function parseTime(text) {
  const now = new Date();

  if (!text) return "";

  if (text.includes("mai")) {
    now.setDate(now.getDate() + 1);
  }

  const match = text.match(/(\d{1,2})h/);
  if (match) {
    now.setHours(match[1], 0, 0);
  }

  return now.toISOString();
}

// ================= GOOGLE SHEET =================
async function sendToSheet(result) {
  if (!result.items || result.items.length === 0) return;

  for (const item of result.items) {
    const parsedTime = parseTime(item.time);

    // 1. LƯU GOOGLE SHEETS
    await axios.post(SHEET_URL, {
      task: item.task,
      time: parsedTime,
      type: result.intent,
      priority: item.priority || "normal"
    });

    // 2. TẠO GOOGLE CALENDAR EVENT (MỚI THÊM)
    await createEvent(item.task, parsedTime);
  }
} {  
  if (!result.items || result.items.length === 0) return;

  for (const item of result.items) {
    const parsedTime = parseTime(item.time);

    await axios.post(SHEET_URL, {
      task: item.task,
      time: parsedTime,
      type: result.intent,
      priority: item.priority || "normal"
    });
  }
}

// ================= CHAT =================
async function chatAI(message) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Bạn là trợ lý AI, trả lời ngắn gọn, dễ hiểu."
        },
        { role: "user", content: message }
      ],
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return res.data.choices[0].message.content;
}

// ================= ROUTE =================
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const result = await classifyMessage(message);

    console.log("AI:", result);

    if (result.intent !== "chat") {
      await sendToSheet(result);

      return res.json({
        reply: `Đã lưu ${result.items.length} công việc ✔`
      });
    }

    const reply = await chatAI(message);

    res.json({ reply });

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ reply: "Lỗi server" });
  }
});

app.listen(3000, () => {
  console.log("Server chạy http://localhost:3000");
});