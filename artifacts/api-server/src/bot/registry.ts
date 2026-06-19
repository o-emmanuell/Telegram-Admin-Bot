import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { logger } from "../lib/logger";

const DATA_DIR = "/home/runner/workspace/data";
const REGISTRY_FILE = `${DATA_DIR}/registered-groups.json`;

export type TokenType = "kachi" | "bachi";

interface Registry {
  kachi: string[];
  bachi: string[];
}

function load(): Registry {
  try {
    if (!existsSync(REGISTRY_FILE)) return { kachi: [], bachi: [] };
    const raw = readFileSync(REGISTRY_FILE, "utf-8");
    return JSON.parse(raw) as Registry;
  } catch {
    return { kachi: [], bachi: [] };
  }
}

function save(registry: Registry): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
  } catch (err) {
    logger.error({ err }, "Failed to save group registry");
  }
}

export function registerGroup(chatId: string | number, token: TokenType): "added" | "already" {
  const reg = load();
  const id = String(chatId);
  if (reg[token].includes(id)) return "already";
  reg[token].push(id);
  save(reg);
  logger.info({ chatId, token }, "Registered group");
  return "added";
}

export function unregisterGroup(chatId: string | number, token: TokenType): "removed" | "not_found" {
  const reg = load();
  const id = String(chatId);
  const idx = reg[token].indexOf(id);
  if (idx === -1) return "not_found";
  reg[token].splice(idx, 1);
  save(reg);
  logger.info({ chatId, token }, "Unregistered group");
  return "removed";
}

export function getGroups(token: TokenType): string[] {
  return load()[token];
}

export function getAllGroups(): Registry {
  return load();
}
