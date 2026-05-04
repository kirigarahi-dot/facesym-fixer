// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

const PROMPT_PATH = process.env.PROMPT_PATH || "/etc/secrets/Portrait_Consultant_AI.txt";
let SYSTEM_PROMPT = "";
try {
  SYSTEM_PROMPT = fs.readFileSync(PROMPT_PATH, "utf-8");
} catch (e) {
  console.warn("[warn] Could not read system prompt file at", PROMPT_PATH);
  SYSTEM_PROMPT = "FaceSymmetry Fixer default prompt (not set).";
}

// --- Tiny text RPG data ---
const STARTING_PLAYER = {
  hp: 30,
  maxHp: 30,
  attack: 7,
  potions: 2,
  gold: 0,
  floor: 1
};

const ENEMIES = [
  { name: "スライム", hp: 12, attack: 4, reward: 8 },
  { name: "ゴブリン", hp: 18, attack: 5, reward: 12 },
  { name: "オーク", hp: 24, attack: 6, reward: 18 },
  { name: "ダークナイト", hp: 30, attack: 8, reward: 30 }
];

function pickEnemy(floor = 1) {
  const idx = Math.min(ENEMIES.length - 1, Math.max(0, floor - 1));
  return { ...ENEMIES[idx] };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Health check
app.get("/", (req, res) => {
  res.send("FaceSymmetry Fixer API is running.");
});

// Minimal /fix endpoint
app.post("/fix", async (req, res) => {
  try {
    const { image_base64, payload } = req.body || {};
    if (!image_base64) return res.status(400).json({ error: "no_image" });

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

    res.json({
      result_image_base64: image_base64,
      edit_log: plan
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// --- RPG endpoint ---
app.post("/rpg", (req, res) => {
  const { action = "start", state } = req.body || {};

  const player = {
    ...STARTING_PLAYER,
    ...(state?.player || {})
  };

  const enemy = state?.enemy ? { ...state.enemy } : pickEnemy(player.floor);
  const logs = [];

  if (action === "start") {
    logs.push(`第${player.floor}階層: ${enemy.name} が現れた！`);
    return res.json({
      message: "RPG開始！ action を attack / potion / flee で送ってください。",
      state: { player, enemy, battleOver: false },
      logs
    });
  }

  if (player.hp <= 0) {
    return res.json({
      message: "ゲームオーバーです。action=start で再開できます。",
      state: { player, enemy, battleOver: true },
      logs: ["あなたは力尽きた。"]
    });
  }

  if (action === "attack") {
    const dmg = clamp(player.attack + Math.floor(Math.random() * 4) - 1, 1, 999);
    enemy.hp = clamp(enemy.hp - dmg, 0, 999);
    logs.push(`あなたの攻撃！ ${enemy.name} に ${dmg} ダメージ。`);
  } else if (action === "potion") {
    if (player.potions <= 0) {
      logs.push("ポーションがない！");
    } else {
      player.potions -= 1;
      const heal = 10;
      player.hp = clamp(player.hp + heal, 0, player.maxHp);
      logs.push(`ポーションを使った。HPが ${heal} 回復した。`);
    }
  } else if (action === "flee") {
    logs.push("あなたは逃げ出した…。次の戦いに備えよう。\naction=start で再開できる。");
    return res.json({
      message: "逃走成功",
      state: { player, enemy: pickEnemy(player.floor), battleOver: true },
      logs
    });
  } else {
    return res.status(400).json({ error: "invalid_action", message: "action は start / attack / potion / flee のいずれか。" });
  }

  if (enemy.hp > 0) {
    const enemyDmg = clamp(enemy.attack + Math.floor(Math.random() * 3) - 1, 1, 999);
    player.hp = clamp(player.hp - enemyDmg, 0, player.maxHp);
    logs.push(`${enemy.name} の反撃！ あなたは ${enemyDmg} ダメージを受けた。`);
  }

  if (enemy.hp <= 0) {
    player.gold += enemy.reward;
    player.floor += 1;
    const nextEnemy = pickEnemy(player.floor);
    logs.push(`${enemy.name} を倒した！ ${enemy.reward}G を獲得。`);
    logs.push(`第${player.floor}階層へ進んだ。次の敵は ${nextEnemy.name}。`);
    return res.json({
      message: "勝利！ action=start で次の戦闘へ。",
      state: { player, enemy: nextEnemy, battleOver: true },
      logs
    });
  }

  if (player.hp <= 0) {
    logs.push("あなたは倒れた…ゲームオーバー。action=start で最初から再開。");
    return res.json({
      message: "敗北",
      state: { player, enemy, battleOver: true },
      logs
    });
  }

  res.json({
    message: "戦闘継続中",
    state: { player, enemy, battleOver: false },
    logs
  });
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
