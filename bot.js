require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const http = require("http");

const bot = new Telegraf(process.env.BOT_TOKEN);

const API_URL =
  process.env.API_URL ||
  "https://btebresultszone.com/api/student-results";

// User State
const userState = {};

// Render Health Check
const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain",
    });
    res.end("✅ BTEB Result Bot Running");
  })
  .listen(PORT, () => {
    console.log(`Health Server Running on ${PORT}`);
  });

// ===============================
// MAIN MENU
// ===============================

const mainMenu = Markup.keyboard([
  ["🔍 Check Result"],
  ["📖 Help", "ℹ️ About"],
  ["🌐 Website"]
])
  .resize()
  .persistent();

// ===============================
// START
// ===============================

bot.start(async (ctx) => {
  delete userState[ctx.from.id];

  await ctx.replyWithHTML(
`🎓 <b>Welcome to BTEB Student Result Bot</b>

এই বটের মাধ্যমে Diploma in Engineering-এর Result দেখতে পারবেন।

নিচের Menu থেকে একটি অপশন নির্বাচন করুন।`,
mainMenu
  );
});

// ===============================
// HELP
// ===============================

bot.help(async (ctx) => {

  await ctx.replyWithHTML(
`📖 <b>How to Use</b>

১️⃣ <b>🔍 Check Result</b> চাপুন

অথবা

২️⃣ সরাসরি আপনার Board Roll পাঠান

<b>Example:</b>

<code>240363</code>`,
mainMenu
  );

});

// ===============================
// MENU BUTTONS
// ===============================

// Check Result
bot.hears("🔍 Check Result", async (ctx) => {
  userState[ctx.from.id] = "WAITING_ROLL";

  await ctx.replyWithHTML(
`🔍 <b>Check Result</b>

📝 আপনার <b>Board Roll</b> পাঠান।

<b>Example:</b>
<code>240363</code>`,
mainMenu
  );
});

// Help
bot.hears("📖 Help", async (ctx) => {

  await ctx.replyWithHTML(
`📖 <b>How to Use</b>

১️⃣ Menu থেকে <b>🔍 Check Result</b> চাপুন

অথবা

২️⃣ সরাসরি Board Roll পাঠান

<b>Example:</b>

<code>240363</code>`,
mainMenu
  );

});

// About
bot.hears("ℹ️ About", async (ctx) => {

  await ctx.replyWithHTML(
`ℹ️ <b>About Bot</b>

🎓 BTEB Student Result Bot

⚡ Version: 2.0

🌐 Data Source:
BTEB Results Zone

👨‍💻 Powered by SDPI`,
mainMenu
  );

});

// Website
bot.hears("🌐 Website", async (ctx) => {

  await ctx.reply(
    "🌐 https://btebresultszone.com"
  );

});

// ===============================
// /result command
// ===============================

bot.command("result", async (ctx) => {

  const args = ctx.message.text.split(" ");

  if (args.length < 2) {

    return ctx.replyWithHTML(
`❌ <b>Usage</b>

<code>/result 240363</code>`
    );

  }

  await getResult(ctx, args[1]);

});

// ===============================
// Direct Roll Search
// ===============================

bot.on("text", async (ctx) => {

  const text = ctx.message.text.trim();

  // Ignore menu buttons
  if (
    [
      "🔍 Check Result",
      "📖 Help",
      "ℹ️ About",
      "🌐 Website"
    ].includes(text)
  ) return;

  // Waiting for Roll
  if (userState[ctx.from.id] === "WAITING_ROLL") {

    delete userState[ctx.from.id];

    return await getResult(ctx, text);

  }

  // Direct Roll
  if (/^\d{6}$/.test(text)) {

    return await getResult(ctx, text);

  }

});

// ===============================
// GET RESULT
// ===============================

async function getResult(ctx, roll) {

  let loading;

  try {

    // Roll Validation
    if (!/^\d{6}$/.test(roll)) {
      return ctx.replyWithHTML(
`❌ <b>Invalid Roll Number</b>

Example:
<code>240363</code>`
      );
    }

    loading = await ctx.reply("⏳ Checking result...");

    // API Call
    const { data } = await axios.get(API_URL, {
      params: {
        roll,
        curriculumId: "diploma_in_engineering"
      },
      timeout: 15000
    });

    // Result Not Found
    if (!data.success || !data.data || data.data.length === 0) {

      return ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        "❌ Result not found."
      );

    }

    // Main Result
    const student =
      data.data.find(r => r.regulation !== 0) ||
      data.data[0];

    // Re-scrutiny Result
    const rescrutiny =
      data.data.find(r => r.regulation === 0);

    // ===============================
    // Semester Results
    // ===============================

    let semesterText = "";

    student.semesterResults
      .sort((a, b) => b.semester - a.semester)
      .forEach((s) => {

        const result = s.results?.[0];

        const status =
          s.status === "passed"
            ? "✅ <b>PASSED</b>"
            : s.status === "failed"
            ? "❌ <b>FAILED</b>"
            : "❓ <b>UNKNOWN</b>";

        const gpa =
          result?.gpa != null
            ? result.gpa.toFixed(2)
            : "N/A";

        semesterText +=
`📘 <b>Semester ${s.semester}</b>
├ <b>Status:</b> ${status}
└ <b>GPA:</b> <code>${gpa}</code>

`;

      });

    // ===============================
    // Referred Subjects
    // ===============================

    let referredText = "✅ None";

    if (student.currentFailedSubjects?.length) {

      referredText = student.currentFailedSubjects
        .map((sub) =>
`• <code>${sub.subCode}</code> ${sub.subName}
  ↳ Semester ${sub.originSemester}`
        )
        .join("\n\n");

    }

// ===============================
    // Re-scrutiny
    // ===============================

    let resText = "";

    if (rescrutiny?.latestResults?.length) {

      const r = rescrutiny.latestResults[0];

      resText =
`\n━━━━━━━━━━━━━━

🔄 <b>Re-scrutiny</b>
📅 <b>Date:</b> <code>${r.date.substring(0,10)}</code>
📝 <b>Status:</b> ${r.publishedText || "Result Published"}`;
    }

    // ===============================
    // Final Message
    // ===============================

    const message =
`🎓 <b>BTEB Student Result</b>

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
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔍 Search Again",
                callback_data: "search_again"
              }
            ],
            [
              {
                text: "🌐 Website",
                url: "https://btebresultszone.com"
              }
            ]
          ]
        }
      }
    );

  } catch (error) {

    console.error(error);

    const msg =
      error.response?.status === 404
        ? "❌ Result not found."
        : "❌ Failed to fetch result.\nPlease try again later.";

    if (loading) {

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loading.message_id,
          undefined,
          msg
        );
      } catch {
        await ctx.reply(msg);
      }

    } else {

      await ctx.reply(msg);

    }

  }

}

// ===============================
// Search Again Button
// ===============================

bot.action("search_again", async (ctx) => {

  userState[ctx.from.id] = "WAITING_ROLL";

  await ctx.answerCbQuery();

  await ctx.replyWithHTML(
`🔍 <b>Search Again</b>

📝 নতুন <b>Board Roll</b> পাঠান।`,
mainMenu
  );

});

// ===============================
// DELETE WEBHOOK (Avoid 409 Error)
// ===============================

(async () => {
  try {
    await bot.telegram.deleteWebhook({
      drop_pending_updates: true,
    });

    console.log("✅ Webhook deleted");
  } catch (err) {
    console.log("Webhook:", err.message);
  }
})();

// ===============================
// LAUNCH BOT
// ===============================

bot.launch().then(async () => {
  const me = await bot.telegram.getMe();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🤖 Bot : @${me.username}`);
  console.log(`🆔 ID  : ${me.id}`);
  console.log("✅ BTEB Result Bot Started");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

// ===============================
// GRACEFUL SHUTDOWN
// ===============================

process.once("SIGINT", () => {
  console.log("Stopping Bot...");
  bot.stop("SIGINT");
});

process.once("SIGTERM", () => {
  console.log("Stopping Bot...");
  bot.stop("SIGTERM");
});

// ===============================
// UNHANDLED ERRORS
// ===============================

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

