---
name: Telegram Community Bot
description: KACHI/BACHI community management bot config and quirks
---

## Bot identity
- Username: @OzzyIzzy_Bot
- Bot ID: 8977374147
- can_read_all_group_messages: true (privacy mode OFF — reads all group messages without @mention)

## Critical webhook fix
- Must call `bot.handleUpdate(req.body)` WITHOUT passing Express `res` as second arg
- Passing `res as any` causes Telegraf to attempt webhook-response mode which silently fails with Express 5
- Instead: ACK Telegram immediately with `res.status(200).json({ok:true})`, then call handleUpdate async

## Token history
- Old token (bot ID 8498873345) was invalidated — do NOT use
- Current token stored as TELEGRAM_BOT_TOKEN secret

## Deployment
- Must use `vm` (always-running) deployment, NOT autoscale — bot needs persistent process for scheduler
- artifact.toml has deploymentTarget = "vm" configured

**Why:** Telegram bots use long-running webhook + cron scheduler. Autoscale spins down between requests, killing the 3-hour motivational message scheduler.
**How to apply:** Any future deployment config changes must keep deploymentTarget = "vm" in artifact.toml.
