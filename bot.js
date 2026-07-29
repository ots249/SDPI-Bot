require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const http = require("http");

const bot = new Telegraf(process.env.BOT_TOKEN);

const API =
  process.env.API_URL ||
  "https://btebresultszone.com/api/student-results";

// Health Check (Render)
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("BTEB Result Bot Running ✅");
  })
  .listen(process.env.PORT || 3000, () => {
    console.log("Health server started");
  });

// Start
bot.start((ctx) => {
  ctx.replyWithHTML(
`🎓 <b>BTEB Student Result Bot</b>

📌 শুধু আপনার <b>Board Roll</b> পাঠান।

উদাহরণ:
<code>240363</code>

অথবা

<code>/result 240363</code>`
  );
});

// Help
bot.help((ctx) => {
  ctx.replyWithHTML(
`📖 <b>Commands</b>

/result 240363

অথবা শুধু Roll Number পাঠান।`
  );
});

// /result
bot.command("result", async (ctx) => {
  const roll = ctx.message.text.split(" ")[1];

  if (!roll)
    return ctx.reply("❌ Example:\n/result 240363");

  await getResult(ctx, roll);
});

// Roll Search
bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (/^\d+$/.test(text)) {
    await getResult(ctx, text);
  }
});

async function getResult(ctx, roll) {
  try {
    const loading = await ctx.reply("⏳ Checking result...");

    const { data } = await axios.get(API, {
      params: {
        roll,
        curriculumId: "diploma_in_engineering",
      },
      timeout: 15000,
    });

    if (!data.success || !data.data?.length) {
      return ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        "❌ Result not found."
      );
    }

    // Main Result
    const student =
      data.data.find((x) => x.regulation !== 0) || data.data[0];

    // Re-scrutiny
    const rescrutiny =
      data.data.find((x) => x.regulation === 0);

    // Semester Result
    let semesterText = "";

    student.semesterResults
      .sort((a, b) => b.semester - a.semester)
      .forEach((s) => {

        const icon =
          s.status === "passed" ? "✅" :
          s.status === "failed" ? "❌" : "❓";

        const status =
          s.status === "passed"
            ? "<b>PASSED</b>"
            : s.status === "failed"
            ? "<b>FAILED</b>"
            : "<b>UNKNOWN</b>";

        const latest = s.results?.[0];

        const gpa =
          latest?.gpa != null
            ? `<code>${Number(latest.gpa).toFixed(2)}</code>`
            : "N/A";

        semesterText +=
`${icon} <b>Semester ${s.semester}</b>
├ Status: ${status}
└ GPA: ${gpa}

`;
      });

    // Referred Subjects
    let referredText = "✅ None";

    if (student.currentFailedSubjects?.length) {
      referredText = student.currentFailedSubjects
        .map(
          (sub) =>
            `• <code>${sub.subCode}</code> ${sub.subName} (S${sub.originSemester})`
        )
        .join("\n");
    }

// Re-scrutiny Message
    let resText = "";

    if (rescrutiny?.latestResults?.length) {
      const r = rescrutiny.latestResults[0];

      resText = `
━━━━━━━━━━━━━━

🔄 <b>Re-scrutiny</b>
📅 <code>${r.date.substring(0, 10)}</code>
📝 ${r.publishedText || "Result Published"}
`;
    }

    const message = `🎓 <b>BTEB Student Result</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
🏫 <b>Institute:</b> ${student.institute.name}
📍 <b>District:</b> ${student.institute.district}
📚 <b>Regulation:</b> <code>${student.regulation}</code>

━━━━━━━━━━━━━━

📊 <b>Semester Results</b>

${semesterText}
━━━━━━━━━━━━━━

📕 <b>Referred Subjects (${student.currentFailedSubjects.length})</b>

${referredText}
${resText}`;

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loading.message_id,
      undefined,
      message,
      {
        parse_mode: "HTML",
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.url(
              "🌐 BTEB Results Zone",
              "https://btebresultszone.com"
            ),
          ],
        ]).reply_markup,
      }
    );

} catch (error) {
      console.error(error);

      const errorMessage =
        error.response?.status === 404
          ? "❌ Result not found."
          : "❌ Failed to fetch result.\nPlease try again later.";

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loading.message_id,
          undefined,
          errorMessage
        );
      } catch {
        await ctx.reply(errorMessage);
      }
    }
}

// Launch Bot
bot.launch().then(() => {
  console.log(`✅ Logged in as @${bot.botInfo.username}`);
});

// Graceful Shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

console.log("🚀 BTEB Result Bot Started");