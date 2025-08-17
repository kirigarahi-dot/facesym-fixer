// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// 🔒 Read secret prompt from Render Secret Files mount path
// Upload your prompt as a Secret File and set the mount path to:
//   /etc/secrets/Portrait_Consultant_AI.txt
// Do NOT commit your prompt file to GitHub.
const PROMPT_PATH = process.env.PROMPT_PATH || "/etc/secrets/Portrait_Consultant_AI.txt";
let SYSTEM_PROMPT = "";
try {
  SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, "utf-8");
} catch (e) {
  console.warn("[warn] Could not read system prompt file at", PROMPT_PATH);
  SYSTEM_PROMPT = "FaceSymmetry Fixer default prompt (not set).";
}

// Health check
app.get("/", (req, res) => {
  res.send("FaceSymmetry Fixer API is running.");
});

// Minimal /fix endpoint: echoes image for now and returns a stub log.
// Replace with real image-edit logic later.
app.post("/fix", async (req, res) => {
  try {
    const { image_base64, payload } = req.body || {};
    if (!image_base64) return res.status(400).json({ error: "no_image" });

    // ⚠️ Example guard: refuse to reveal the system prompt
    const userNotes = (payload && (payload.notes || "")) || "";
    if (/プロンプト|prompt|system/i.test(userNotes)) {
      return res.status(400).json({ error: "policy_refuse", message: "内部プロンプトは開示できません。" });
    }

    const plan = {
      plan: payload?.strength ?? "medium",
      priority: payload?.priority ?? ["eyes", "mouth"],
      preserve: payload?.preserve ?? ["skin_texture", "mole"],
      rationale: "自然さを最優先に、左右差を控えめに調整。",
      prompt_loaded: SYSTEM_PROMPT.length > 30
    };

    // TODO: integrate real image edit pipeline (landmarks -> TPS -> texture restore)
    res.json({
      result_image_base64: image_base64,
      edit_log: plan
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
