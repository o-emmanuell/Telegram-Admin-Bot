export const kachiMotivationalMessages: string[] = [
  `🔥 *KACHI holders, this one's for you.*\n\nThe market is testing everyone right now. Price dips. FUD spreads. Weak hands fold. But do you know what separates winners from everyone else? *Conviction through the storm.* \n\nThe team is still here. Still building. Still pushing. When the tide turns — and it WILL — you'll be glad you held. 💎🙌`,

  `⚡️ *A message to every KACHI holder still standing:*\n\nThis market is designed to shake you out. Red candles, silence, uncertainty — it's all part of the cycle. But every great project had a "darkest hour" before the breakthrough.\n\nWe see it. The team sees it. And we're not going anywhere. Keep the faith. 🚀`,

  `🌊 *Markets go in waves. We're in the trough.*\n\nBut here's the thing about troughs — they always precede the next peak. KACHI is not dead. The team is very much alive and positioned to move when momentum returns.\n\nPatience is the rarest edge in crypto. You have it. Use it. 💪`,

  `📌 *Quick check-in from the KACHI side:*\n\nTeam = still standing ✅\nBuilding = ongoing ✅\nConviction = unshaken ✅\n\nThe market may be quiet but the work is not. Every day is preparation for the next push. Real ones stay. We see you. 👀🔥`,

  `🧠 *The smartest move in a bear market? Don't sell the vision.*\n\nNoise is loud right now. But zoom out. Why did you get into KACHI in the first place? That reason hasn't changed. The team hasn't changed. The mission hasn't changed.\n\nOnly the price did — temporarily. Stay locked. 🔒`,

  `💬 *Real talk:* the market is rough. We're not going to pretend otherwise.\n\nBut rough markets are where legacies are built. While others panic-sell, you're accumulating time in the market. That's the real alpha.\n\nKACHI team is here. Ready. Watching. When momentum comes back, we strike. ⚔️`,

  `🌅 *Every sunrise comes after a dark night.*\n\nCrypto winters feel eternal when you're in them. But spring always comes. The projects that survive and thrive are the ones with communities like ours — people who *believe* even when charts don't show it yet.\n\nHold strong. The comeback is loading. 📶`,

  `🏔️ *Diamonds are formed under pressure.*\n\nThis market is applying pressure. To you. To us. To every project out there. But pressure doesn't break what's built to last.\n\nKACHI was built to last. The team is still standing. Your conviction is your edge. Don't give it up cheap. 💎`,
];

export const bachiMotivationalMessages: string[] = [
  `🔥 *BACHI fam — stay solid.*\n\nThe market wants you to doubt. To second-guess. To sell. Don't give it that satisfaction.\n\nThe team is still here, still grinding, still ready to push when the window opens. Base is building and BACHI is part of that story. 💎`,

  `⚡️ *BACHI holders, we see you holding through this.*\n\nThat's not stubbornness — that's strategy. Every token that ever 10x'd had a period where people thought it was dead. This is just that period.\n\nTeam is ready. Community is holding. The moment is coming. 🚀`,

  `🌊 *Crypto cycles are brutal. But they're also predictable.*\n\nDown → doubt → accumulation → explosion. We're somewhere in the middle. The team is using this time to prepare for the push, not panic.\n\nBACHI holders: you're early. Act like it. 💪`,

  `📌 *BACHI status check:*\n\nTeam = online ✅\nMomentum = building quietly ✅\nCommunity = holding ✅\nFear = not welcome here ❌\n\nWe're in this together. The green days are ahead. Patience. 🔥`,

  `🧠 *Here's a thought for BACHI holders tonight:*\n\nThe market doesn't care about your feelings. But *we* do. And so does the team.\n\nThis isn't abandonment — it's a pause before the push. We're watching the charts, watching Base, watching the macro. When it's time, we move. Until then — hold. 🔒`,

  `💬 *Honest message to every BACHI holder:*\n\nWe know it's been a tough stretch. The market has been unforgiving. But the team hasn't flinched. We're still here, still planning, still committed to the mission.\n\nYour belief in this project hasn't gone unnoticed. We're pushing for everyone who stayed. 🙏`,

  `🌅 *BACHI in the quiet season.*\n\nSome of the biggest moves in crypto history started in the quietest periods. When no one was watching. When charts were flat. When communities were small but loyal.\n\nYou're in that moment right now. Don't miss the forest for the trees. 👀`,

  `🏔️ *Conviction is built in the dark.*\n\nAnyone can be bullish when everything is green. The real ones hold when it's hard. If you're reading this — you're a real one.\n\nBACHI team is not giving up. We hope you won't either. The push is coming. 💎🙌`,
];

export function getRandomKachiMessage(): string {
  return kachiMotivationalMessages[
    Math.floor(Math.random() * kachiMotivationalMessages.length)
  ]!;
}

export function getRandomBachiMessage(): string {
  return bachiMotivationalMessages[
    Math.floor(Math.random() * bachiMotivationalMessages.length)
  ]!;
}
