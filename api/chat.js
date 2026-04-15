import axios from "axios";

const API_KEY = process.env.GROQ_API_KEY;
const SHEET_URL = process.env.SHEET_URL;

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

  return now.toLocaleString("vi-VN");
}

// ================= CLASSIFY =================
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

// ================= SHEET =================
async function sendToSheet(result) {
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
          content: "Bạn là trợ lý AI, trả lời ngắn gọn."
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

// ================= MAIN HANDLER =================
export default async function handler(req, res) {
  try {
    console.log("MESSAGE:", message);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const message = body?.message;

    const result = await classifyMessage(message);

    if (result.intent !== "chat") {
      await sendToSheet(result);

      return res.status(200).json({
        reply: `Đã lưu ${result.items.length} công việc ✔`
      });
    }

    const reply = await chatAI(message);

    res.status(200).json({ reply });

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ reply: "Lỗi server" });
  }
}