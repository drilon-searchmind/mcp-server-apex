import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
let key = process.env.GEMINI_API_KEY?.trim() || "";

if (!key) {
  try {
    const env = readFileSync(rootEnv, "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const name = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (name === "GEMINI_API_KEY") key = value;
    }
  } catch (e) {
    console.error("Could not read .env:", e.message);
    process.exit(1);
  }
}

if (!key) {
  console.error("NO_GEMINI_API_KEY found in env or ../../.env");
  process.exit(1);
}

console.log("KEY_PRESENT", `${key.slice(0, 8)}...${key.slice(-4)}`, `len=${key.length}`);

const modelsToTest = [
  "gemini-2.0-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview-05-20",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
];

async function testModel(model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Say hi in exactly 3 words." }] }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  const err = data?.error?.message;
  console.log(`${model}: ${res.status} ${err || `OK -> ${String(text || "").slice(0, 80)}`}`);
}

const listRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
);
const listData = await listRes.json().catch(() => ({}));

if (listData.models) {
  const generateModels = listData.models
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => m.name.replace("models/", ""));
  console.log("\nAvailable generateContent models (first 25):");
  console.log(generateModels.slice(0, 25).join("\n"));
} else {
  console.log("LIST_ERR", listRes.status, listData?.error?.message || JSON.stringify(listData).slice(0, 300));
}

console.log("\nTesting hardcoded model ids:");
for (const model of modelsToTest) {
  await testModel(model);
}
