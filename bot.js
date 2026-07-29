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

// User Data Storage (In-memory - for demo purposes)
// In production, use a database like MongoDB, PostgreSQL, etc.
const userData = {};

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
  ["🔍 Check Result", "⭐ My Result"],
  ["📊 Semester GPA", "📕 Referred Subjects"],
  ["📜 Search History", "🔄 Re-scrutiny Status"],
  ["📖 Help", "ℹ️ About"],
  ["🌐 Website"]
])
  .resize()
  .persistent();

// ===============================
// START
// ===============================

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  delete userState[userId];

  // Initialize user data if not exists
  if (!userData[userId]) {
    userData[userId] = {
      savedRoll: null,
      searchHistory: [],
      lastResult: null
    };
  }

  await ctx.replyWithHTML(
`🎓 <b>Welcome to BTEB Student Result Bot</b>

এই বটের মাধ্যমে Diploma in Engineering-এর Result দেখতে পারবেন।

✨ <b>Features:</b>
• 🔍 Search Result by Roll
• ⭐ Save & View Your Result
• 📜 Search History (Last 5)
• 📊 Semester-wise GPA
• 📕 Referred Subjects
• 🔄 Re-scrutiny Status

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

<b>🔍 Check Result</b>
• ক্লিক করুন এবং আপনার Board Roll পাঠান

<b>⭐ My Result</b>
• আপনার সংরক্ষিত ফলাফল দেখুন

<b>📊 Semester GPA</b>
• প্রতি সেমিস্টারের GPA দেখুন

<b>📕 Referred Subjects</b>
• আপনার Referred Subjects দেখুন

<b>📜 Search History</b>
• আপনার শেষ ৫টি সার্চ দেখুন

<b>🔄 Re-scrutiny Status</b>
• Re-scrutiny স্ট্যাটাস দেখুন

<b>📝 Direct Search:</b>
সরাসরি আপনার Board Roll পাঠান

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
<code>240363</code>

💡 Tip: Result সংরক্ষণ করতে "⭐ My Result" ব্যবহার করুন।`,
mainMenu
  );
});

// My Result (Saved Result)
bot.hears("⭐ My Result", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.savedRoll) {
    return ctx.replyWithHTML(
`❌ <b>No Saved Result Found</b>

আপনি এখনো কোনো Result সংরক্ষণ করেননি।

🔍 <b>How to Save:</b>
1. "🔍 Check Result" ব্যবহার করুন
2. আপনার Roll পাঠান
3. Automatically সংরক্ষিত হবে

অথবা সরাসরি Roll পাঠান।`,
mainMenu
    );
  }

  // Check if we have the saved result data
  if (userData[userId]?.lastResult) {
    await displayResult(ctx, userData[userId].lastResult, userData[userId].savedRoll);
  } else {
    // Fetch the saved result again
    await getResult(ctx, userData[userId].savedRoll, true);
  }
});

// Semester GPA
bot.hears("📊 Semester GPA", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.savedRoll) {
    return ctx.replyWithHTML(
`❌ <b>No Result Found</b>

প্রথমে আপনার Result সংরক্ষণ করুন।

🔍 "🔍 Check Result" ব্যবহার করুন অথবা সরাসরি Roll পাঠান।`,
mainMenu
    );
  }

  if (!userData[userId]?.lastResult) {
    await getResult(ctx, userData[userId].savedRoll, true);
    return;
  }

  const student = userData[userId].lastResult;
  
  let semesterGPA = "";
  student.semesterResults
    .sort((a, b) => b.semester - a.semester)
    .forEach((s) => {
      const result = s.results?.[0];
      const gpa = result?.gpa != null ? result.gpa.toFixed(2) : "N/A";
      const status = s.status === "passed" ? "✅" : s.status === "failed" ? "❌" : "❓";
      
      semesterGPA += `${status} <b>Semester ${s.semester}</b>: <code>${gpa}</code>\n`;
    });

  const message = 
`📊 <b>Semester-wise GPA</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
🏫 <b>Institute:</b> ${student.institute.name}

━━━━━━━━━━━━━━

${semesterGPA}

💡 <b>Total Semesters:</b> ${student.semesterResults.length}`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📊 Detailed Result",
            callback_data: "view_result"
          }
        ]
      ]
    }
  });
});

// Referred Subjects
bot.hears("📕 Referred Subjects", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.savedRoll) {
    return ctx.replyWithHTML(
`❌ <b>No Result Found</b>

প্রথমে আপনার Result সংরক্ষণ করুন।

🔍 "🔍 Check Result" ব্যবহার করুন অথবা সরাসরি Roll পাঠান।`,
mainMenu
    );
  }

  if (!userData[userId]?.lastResult) {
    await getResult(ctx, userData[userId].savedRoll, true);
    return;
  }

  const student = userData[userId].lastResult;
  
  if (!student.currentFailedSubjects?.length) {
    return ctx.replyWithHTML(
`✅ <b>Congratulations!</b>

আপনার কোনো Referred Subject নেই।

🎉 <b>Roll:</b> <code>${student.roll}</code>
📚 <b>Status:</b> All subjects passed!`,
mainMenu
    );
  }

  let referredList = "";
  student.currentFailedSubjects.forEach((sub, index) => {
    referredList += `${index + 1}. <code>${sub.subCode}</code> <b>${sub.subName}</b>\n   ↳ Semester ${sub.originSemester}\n\n`;
  });

  const message = 
`📕 <b>Referred Subjects</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
📚 <b>Total Referred:</b> ${student.currentFailedSubjects.length}

━━━━━━━━━━━━━━

${referredList}

💡 <b>Tip:</b> Re-scrutiny এর মাধ্যমে Result পরিবর্তন হতে পারে।`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔄 Check Re-scrutiny",
            callback_data: "view_rescrutiny"
          }
        ]
      ]
    }
  });
});

// Search History
bot.hears("📜 Search History", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.searchHistory?.length) {
    return ctx.replyWithHTML(
`❌ <b>No Search History</b>

আপনি এখনো কোনো Roll Search করেননি।

🔍 "🔍 Check Result" ব্যবহার করে শুরু করুন।`,
mainMenu
    );
  }

  let historyText = "";
  const history = userData[userId].searchHistory.slice(0, 5);
  
  history.forEach((item, index) => {
    const date = new Date(item.timestamp).toLocaleDateString('bn-BD', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    historyText += `${index + 1}. <code>${item.roll}</code> - ${date}\n`;
  });

  const message = 
`📜 <b>Last 5 Search History</b>

${historyText}

💡 <b>Tip:</b> ⭐ My Result ব্যবহার করে আপনার Result সংরক্ষণ করুন।`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: history.map((item) => [
        {
          text: `🔍 View ${item.roll}`,
          callback_data: `view_history_${item.roll}`
        }
      ])
    }
  });
});

// Re-scrutiny Status
bot.hears("🔄 Re-scrutiny Status", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.savedRoll) {
    return ctx.replyWithHTML(
`❌ <b>No Result Found</b>

প্রথমে আপনার Result সংরক্ষণ করুন।

🔍 "🔍 Check Result" ব্যবহার করুন অথবা সরাসরি Roll পাঠান।`,
mainMenu
    );
  }

  if (!userData[userId]?.lastResult) {
    await getResult(ctx, userData[userId].savedRoll, true);
    return;
  }

  const student = userData[userId].lastResult;
  const rescrutiny = userData[userId].lastResultRescrutiny;

  if (!rescrutiny?.latestResults?.length) {
    return ctx.replyWithHTML(
`ℹ️ <b>No Re-scrutiny Found</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>

আপনার এই Roll-এ কোনো Re-scrutiny তথ্য পাওয়া যায়নি।

💡 Re-scrutiny সাধারণত ফলাফল প্রকাশের পর করা হয়।`,
mainMenu
    );
  }

  const r = rescrutiny.latestResults[0];
  
  let subjectDetails = "";
  if (r.subjectDetails?.length) {
    r.subjectDetails.forEach((sub) => {
      subjectDetails += `• <code>${sub.subCode}</code> ${sub.subName}\n  ↳ Status: ${sub.status || "N/A"}\n\n`;
    });
  }

  const message = 
`🔄 <b>Re-scrutiny Status</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
📅 <b>Date:</b> <code>${r.date?.substring(0,10) || "N/A"}</code>
📝 <b>Status:</b> ${r.publishedText || "Result Published"}

━━━━━━━━━━━━━━

${subjectDetails || "ℹ️ No subject details available"}

💡 <b>Note:</b> Re-scrutiny Result পরবর্তীতে পরিবর্তন হতে পারে।`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📊 View Full Result",
            callback_data: "view_result"
          }
        ]
      ]
    }
  });
});

// Help
bot.hears("📖 Help", async (ctx) => {
  await ctx.replyWithHTML(
`📖 <b>How to Use</b>

<b>🔍 Check Result</b>
• ক্লিক করুন এবং আপনার Board Roll পাঠান

<b>⭐ My Result</b>
• আপনার সংরক্ষিত ফলাফল দেখুন

<b>📊 Semester GPA</b>
• প্রতি সেমিস্টারের GPA দেখুন

<b>📕 Referred Subjects</b>
• আপনার Referred Subjects দেখুন

<b>📜 Search History</b>
• আপনার শেষ ৫টি সার্চ দেখুন

<b>🔄 Re-scrutiny Status</b>
• Re-scrutiny স্ট্যাটাস দেখুন

<b>📝 Direct Search:</b>
সরাসরি আপনার Board Roll পাঠান

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

⚡ Version: 3.0

✨ <b>Features:</b>
• Real-time Result Check
• Save & View Results
• Search History (Last 5)
• Semester-wise GPA
• Referred Subjects
• Re-scrutiny Status
• Beautiful HTML Result

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
// COMMANDS
// ===============================

// /result command
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

// /save command
bot.command("save", async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.replyWithHTML(
`❌ <b>Usage</b>

<code>/save 240363</code>`
    );
  }
  await saveResult(ctx, args[1]);
});

// /history command
bot.command("history", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.searchHistory?.length) {
    return ctx.replyWithHTML(
`❌ <b>No Search History</b>

আপনি এখনো কোনো Roll Search করেননি।`,
mainMenu
    );
  }

  let historyText = "";
  const history = userData[userId].searchHistory.slice(0, 5);
  
  history.forEach((item, index) => {
    const date = new Date(item.timestamp).toLocaleDateString('bn-BD');
    historyText += `${index + 1}. <code>${item.roll}</code> - ${date}\n`;
  });

  await ctx.replyWithHTML(
`📜 <b>Last 5 Search History</b>

${historyText}`
  );
});

// ===============================
// DIRECT ROLL SEARCH
// ===============================

bot.on("text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Ignore menu buttons
  const menuButtons = [
    "🔍 Check Result",
    "⭐ My Result",
    "📊 Semester GPA",
    "📕 Referred Subjects",
    "📜 Search History",
    "🔄 Re-scrutiny Status",
    "📖 Help",
    "ℹ️ About",
    "🌐 Website"
  ];
  
  if (menuButtons.includes(text)) return;

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

async function getResult(ctx, roll, isSaved = false) {
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
    const student = data.data.find(r => r.regulation !== 0) || data.data[0];
    const rescrutiny = data.data.find(r => r.regulation === 0);

    // Save to user data
    const userId = ctx.from.id;
    if (!userData[userId]) {
      userData[userId] = {
        savedRoll: null,
        searchHistory: [],
        lastResult: null,
        lastResultRescrutiny: null
      };
    }

    // Save result if not saved already
    if (!isSaved) {
      userData[userId].savedRoll = roll;
      userData[userId].lastResult = student;
      userData[userId].lastResultRescrutiny = rescrutiny;
      
      // Add to search history
      if (!userData[userId].searchHistory) {
        userData[userId].searchHistory = [];
      }
      
      userData[userId].searchHistory.unshift({
        roll: roll,
        timestamp: Date.now()
      });
      
      // Keep only last 5
      if (userData[userId].searchHistory.length > 5) {
        userData[userId].searchHistory = userData[userId].searchHistory.slice(0, 5);
      }
    }

    await displayResult(ctx, student, roll, rescrutiny, loading);

  } catch (error) {
    console.error(error);

    const msg = error.response?.status === 404
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
// DISPLAY RESULT
// ===============================

async function displayResult(ctx, student, roll, rescrutiny = null, loading = null) {
  // Semester Results
  let semesterText = "";
  student.semesterResults
    .sort((a, b) => b.semester - a.semester)
    .forEach((s) => {
      const result = s.results?.[0];
      const status = s.status === "passed"
        ? "✅ <b>PASSED</b>"
        : s.status === "failed"
        ? "❌ <b>FAILED</b>"
        : "❓ <b>UNKNOWN</b>";
      const gpa = result?.gpa != null ? result.gpa.toFixed(2) : "N/A";

      semesterText +=
`📘 <b>Semester ${s.semester}</b>
├ <b>Status:</b> ${status}
└ <b>GPA:</b> <code>${gpa}</code>

`;
    });

  // Referred Subjects
  let referredText = "✅ None";
  if (student.currentFailedSubjects?.length) {
    referredText = student.currentFailedSubjects
      .map((sub) =>
`• <code>${sub.subCode}</code> ${sub.subName}
  ↳ Semester ${sub.originSemester}`
      )
      .join("\n\n");
  }

  // Re-scrutiny
  let resText = "";
  if (rescrutiny?.latestResults?.length) {
    const r = rescrutiny.latestResults[0];
    resText =
`\n━━━━━━━━━━━━━━

🔄 <b>Re-scrutiny</b>
📅 <b>Date:</b> <code>${r.date?.substring(0,10) || "N/A"}</code>
📝 <b>Status:</b> ${r.publishedText || "Result Published"}`;
  }

  // Final Message
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

📕 <b>Referred Subjects (${student.currentFailedSubjects?.length || 0})</b>

${referredText}
${resText}

💡 <b>Tips:</b>
• ⭐ My Result - সংরক্ষিত Result দেখুন
• 📊 Semester GPA - Semester-wise GPA দেখুন
• 📕 Referred Subjects - Referred Subjects দেখুন
• 🔄 Re-scrutiny - Re-scrutiny স্ট্যাটাস দেখুন`;

  const inlineKeyboard = [
    [
      {
        text: "⭐ Save Result",
        callback_data: `save_result_${student.roll}`
      },
      {
        text: "🔍 Search Again",
        callback_data: "search_again"
      }
    ],
    [
      {
        text: "📊 Semester GPA",
        callback_data: "view_gpa"
      },
      {
        text: "📕 Referred Subjects",
        callback_data: "view_referred"
      }
    ],
    [
      {
        text: "🔄 Re-scrutiny Status",
        callback_data: "view_rescrutiny"
      },
      {
        text: "📜 Search History",
        callback_data: "view_history"
      }
    ],
    [
      {
        text: "🌐 Website",
        url: "https://btebresultszone.com"
      }
    ]
  ];

  if (loading) {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loading.message_id,
      undefined,
      message,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      }
    );
  } else {
    await ctx.replyWithHTML(message, {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  }
}

// ===============================
// SAVE RESULT
// ===============================

async function saveResult(ctx, roll) {
  try {
    if (!/^\d{6}$/.test(roll)) {
      return ctx.replyWithHTML(
`❌ <b>Invalid Roll Number</b>

Example:
<code>240363</code>`
      );
    }

    const { data } = await axios.get(API_URL, {
      params: {
        roll,
        curriculumId: "diploma_in_engineering"
      },
      timeout: 15000
    });

    if (!data.success || !data.data || data.data.length === 0) {
      return ctx.reply("❌ Result not found.");
    }

    const student = data.data.find(r => r.regulation !== 0) || data.data[0];
    const rescrutiny = data.data.find(r => r.regulation === 0);

    const userId = ctx.from.id;
    if (!userData[userId]) {
      userData[userId] = {
        savedRoll: null,
        searchHistory: [],
        lastResult: null,
        lastResultRescrutiny: null
      };
    }

    userData[userId].savedRoll = roll;
    userData[userId].lastResult = student;
    userData[userId].lastResultRescrutiny = rescrutiny;

    await ctx.replyWithHTML(
`✅ <b>Result Saved Successfully!</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
🏫 <b>Institute:</b> ${student.institute.name}

💡 এখন "⭐ My Result" ব্যবহার করে দেখুন।`,
mainMenu
    );

  } catch (error) {
    console.error(error);
    await ctx.reply("❌ Failed to save result. Please try again.");
  }
}

// ===============================
// CALLBACK HANDLERS
// ===============================

// Save Result
bot.action(/^save_result_(.+)$/, async (ctx) => {
  const roll = ctx.match[1];
  await ctx.answerCbQuery();
  await saveResult(ctx, roll);
});

// View Result
bot.action("view_result", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  if (userData[userId]?.lastResult) {
    await displayResult(ctx, userData[userId].lastResult, userData[userId].savedRoll);
  } else {
    await ctx.reply("❌ No result found. Please search again.");
  }
});

// View GPA
bot.action("view_gpa", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  if (!userData[userId]?.lastResult) {
    return ctx.reply("❌ No result found. Please search again.");
  }

  const student = userData[userId].lastResult;
  let semesterGPA = "";
  
  student.semesterResults
    .sort((a, b) => b.semester - a.semester)
    .forEach((s) => {
      const result = s.results?.[0];
      const gpa = result?.gpa != null ? result.gpa.toFixed(2) : "N/A";
      const status = s.status === "passed" ? "✅" : s.status === "failed" ? "❌" : "❓";
      
      semesterGPA += `${status} <b>Semester ${s.semester}</b>: <code>${gpa}</code>\n`;
    });

  await ctx.replyWithHTML(
`📊 <b>Semester-wise GPA</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>

━━━━━━━━━━━━━━

${semesterGPA}

💡 <b>Total Semesters:</b> ${student.semesterResults.length}`
  );
});

// View Referred Subjects
bot.action("view_referred", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  if (!userData[userId]?.lastResult) {
    return ctx.reply("❌ No result found. Please search again.");
  }

  const student = userData[userId].lastResult;
  
  if (!student.currentFailedSubjects?.length) {
    return ctx.replyWithHTML(
`✅ <b>Congratulations!</b>

আপনার কোনো Referred Subject নেই।

🎉 <b>Roll:</b> <code>${student.roll}</code>`
    );
  }

  let referredList = "";
  student.currentFailedSubjects.forEach((sub, index) => {
    referredList += `${index + 1}. <code>${sub.subCode}</code> <b>${sub.subName}</b>\n   ↳ Semester ${sub.originSemester}\n\n`;
  });

  await ctx.replyWithHTML(
`📕 <b>Referred Subjects</b>

🆔 <b>Roll:</b> <code>${student.roll}</code>
📚 <b>Total Referred:</b> ${student.currentFailedSubjects.length}

━━━━━━━━━━━━━━

${referredList}`
  );
});

// View Re-scrutiny
bot.action("view_rescrutiny", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  if (!userData[userId]?.lastResultRescrutiny) {
    return ctx.replyWithHTML(
`ℹ️ <b>No Re-scrutiny Found</b>

আপনার এই Roll-এ কোনো Re-scrutiny তথ্য পাওয়া যায়নি।`
    );
  }

  const rescrutiny = userData[userId].lastResultRescrutiny;
  const r = rescrutiny.latestResults[0];
  
  let subjectDetails = "";
  if (r.subjectDetails?.length) {
    r.subjectDetails.forEach((sub) => {
      subjectDetails += `• <code>${sub.subCode}</code> ${sub.subName}\n  ↳ Status: ${sub.status || "N/A"}\n\n`;
    });
  }

  await ctx.replyWithHTML(
`🔄 <b>Re-scrutiny Status</b>

📅 <b>Date:</b> <code>${r.date?.substring(0,10) || "N/A"}</code>
📝 <b>Status:</b> ${r.publishedText || "Result Published"}

━━━━━━━━━━━━━━

${subjectDetails || "ℹ️ No subject details available"}`
  );
});

// View History
bot.action("view_history", async (ctx) => {
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  if (!userData[userId]?.searchHistory?.length) {
    return ctx.reply("❌ No search history found.");
  }

  let historyText = "";
  const history = userData[userId].searchHistory.slice(0, 5);
  
  history.forEach((item, index) => {
    const date = new Date(item.timestamp).toLocaleDateString('bn-BD');
    historyText += `${index + 1}. <code>${item.roll}</code> - ${date}\n`;
  });

  await ctx.replyWithHTML(
`📜 <b>Last 5 Search History</b>

${historyText}`
  );
});

// View History by Roll
bot.action(/^view_history_(.+)$/, async (ctx) => {
  const roll = ctx.match[1];
  await ctx.answerCbQuery();
  await getResult(ctx, roll);
});

// Search Again
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