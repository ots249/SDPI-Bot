require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const http = require("http");

const bot = new Telegraf(process.env.BOT_TOKEN);

const API =
  process.env.API_URL ||
  "https://btebresultszone.com/api/student-results";

// Railway Health Check
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("BTEB Bot is Running ✅");
  })
  .listen(process.env.PORT || 3000);

// Start
bot.start((ctx) => {
  ctx.replyWithHTML(
`🎓 <b>BTEB Result Bot</b>

শুধু আপনার <b>Board Roll</b> পাঠান।

উদাহরণ:
<code>240312</code>

অথবা
<code>/result 240312</code>`
  );
});

// Help
bot.help((ctx) => {
  ctx.replyWithHTML(
`📖 <b>ব্যবহারবিধি</b>

• শুধু Roll পাঠান
• অথবা

<code>/result 240312</code>`
  );
});

// /result command
bot.command("result", async (ctx) => {

  const roll = ctx.message.text.split(" ")[1];

  if (!roll) {
    return ctx.reply("❌ ব্যবহার:\n/result 240312");
  }

  await getResult(ctx, roll);

});

// Roll only
bot.on("text", async (ctx) => {

  const text = ctx.message.text.trim();

  if (/^\d+$/.test(text)) {

    await getResult(ctx, text);

  }

});

async function getResult(ctx, roll) {
  try {
    const wait = await ctx.reply("⏳ Checking result...");

    const { data } = await axios.get(API, {
      params: {
        roll,
        curriculumId: "diploma_in_engineering",
      },
      timeout: 15000,
    });

    if (!data.success || !data.data || !data.data.length) {
      return ctx.telegram.editMessageText(
        ctx.chat.id,
        wait.message_id,
        undefined,
        "❌ Result not found."
      );
    }

    // Main Result
    const student = data.data.find((x) => x.regulation !== 0) || data.data[0];

    // Re-scrutiny
    const rescrutiny = data.data.find((x) => x.regulation === 0);

    // Semester Status
    let semesterText = "";
    if (student.semesterResults?.length) {
      student.semesterResults
        .sort((a, b) => b.semester - a.semester)
        .forEach((s) => {
          let icon = "❓";
          if (s.status === "passed") icon = "✅";
          if (s.status === "failed") icon = "❌";

          semesterText += `${icon} Semester ${s.semester}: ${s.status.toUpperCase()}\n`;
        });
    }

    // Referred Subjects
    let referredText = "✅ None";

    if (student.currentFailedSubjects?.length) {
      referredText = student.currentFailedSubjects
        .map(
          (s) =>
            `• ${s.subCode} - ${s.subName} (S${s.originSemester})`
        )
        .join("\n");
    }

    // Re-scrutiny
    let resText = "";

    if (
      rescrutiny &&
      rescrutiny.latestResults &&
      rescrutiny.latestResults.length
    ) {
      const r = rescrutiny.latestResults[0];

      resText =
`\n🔄 <b>Re-scrutiny</b>
📅 ${r.date.substring(0,10)}
${r.publishedText || "Result Published"}`;
    }

    const message =
`🎓 <b>BTEB Student Result</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>

🏫 <b>Institute</b>
${student.institute.name}

📍 ${student.institute.district}
📚 Regulation: ${student.regulation}

━━━━━━━━━━━━━━

📊 <b>Semester Result</b>
${semesterText}

📕 <b>Referred Subjects (${student.currentFailedSubjects.length})</b>
${referredText}${resText}`;

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      wait.message_id,
      undefined,
      message,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🌐 Website",
                url: "https://btebresultszone.com",
              },
            ],
          ],
        },
      }
    );
  } catch (err) {
    console.error(err);

    ctx.reply(
      "❌ Failed to fetch result.\nPlease try again later."
    );
  }
}

// Launch Bot
bot.launch().then(() => {
  console.log(`✅ Logged in as @${bot.botInfo.username}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));