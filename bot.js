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
const userData = {};

// Curriculum Options
const CURRICULUMS = {
  DIPLOMA_ENGINEERING: {
    id: "diploma_in_engineering",
    name: "Diploma In Engineering",
    emoji: "🔧",
    short: "Engineering"
  },
  DIPLOMA_ENGINEERING_ARMY: {
    id: "diploma_in_engineering_army",
    name: "Diploma In Engineering (Army)",
    emoji: "🪖",
    short: "Army"
  },
  DIPLOMA_ENGINEERING_NAVAL: {
    id: "diploma_in_engineering_naval",
    name: "Diploma In Engineering (Naval)",
    emoji: "⚓",
    short: "Naval"
  },
  DIPLOMA_TEXTILE: {
    id: "diploma_in_textile_engineering",
    name: "Diploma In Textile Engineering",
    emoji: "🧵",
    short: "Textile"
  },
  DIPLOMA_TOURISM: {
    id: "diploma_in_tourism_and_hospitality",
    name: "Diploma In Tourism And Hospitality",
    emoji: "🏨",
    short: "Tourism"
  },
  DIPLOMA_AGRICULTURE: {
    id: "diploma_in_agriculture",
    name: "Diploma In Agriculture",
    emoji: "🌾",
    short: "Agriculture"
  },
  DIPLOMA_FISHERIES: {
    id: "diploma_in_fisheries",
    name: "Diploma In Fisheries",
    emoji: "🐟",
    short: "Fisheries"
  },
  DIPLOMA_FORESTRY: {
    id: "diploma_in_forestry",
    name: "Diploma In Forestry",
    emoji: "🌳",
    short: "Forestry"
  },
  DIPLOMA_LIVESTOCK: {
    id: "diploma_in_livestock",
    name: "Diploma In Livestock",
    emoji: "🐄",
    short: "Livestock"
  },
  CERTIFICATE_MARINE: {
    id: "certificate_in_marine_trade",
    name: "Certificate In Marine Trade",
    emoji: "⛵",
    short: "Marine"
  },
  DIPLOMA_MEDICAL: {
    id: "diploma_in_medical_technology",
    name: "Diploma In Medical Technology",
    emoji: "🏥",
    short: "Medical"
  },
  ADVANCED_CERTIFICATE: {
    id: "advanced_certificate_course",
    name: "Advanced Certificate Course",
    emoji: "📜",
    short: "Advanced"
  },
  NATIONAL_SKILL: {
    id: "national_skill_standard_basic_certificate",
    name: "National Skill Standard Basic Certificate",
    emoji: "🛠️",
    short: "Skill"
  },
  ONE_YEAR_CERTIFICATE: {
    id: "one_year_certificate_course",
    name: "One Year Certificate Course",
    emoji: "📅",
    short: "1 Year"
  },
  DIPLOMA_COMMERCE: {
    id: "diploma_in_commerce",
    name: "Diploma In Commerce",
    emoji: "💼",
    short: "Commerce"
  },
  CERTIFICATE_ULTRASOUND: {
    id: "certificate_in_medical_ultrasound",
    name: "Certificate In Medical Ultrasound",
    emoji: "🫀",
    short: "Ultrasound"
  },
  HSC_BUSINESS: {
    id: "hsc_business_management",
    name: "HSC (Business Management)",
    emoji: "📊",
    short: "HSC BM"
  },
  HSC_VOCATIONAL: {
    id: "hsc_vocational",
    name: "HSC (Vocational)",
    emoji: "🎯",
    short: "HSC Voc"
  },
  SSC_VOCATIONAL: {
    id: "ssc_vocational",
    name: "SSC (Vocational)",
    emoji: "📚",
    short: "SSC Voc"
  },
  DAKHIL_VOCATIONAL: {
    id: "dakhil_vocational",
    name: "Dakhil (Vocational)",
    emoji: "🕌",
    short: "Dakhil"
  }
};

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
  ["🌐 Website", "📚 Select Curriculum"]
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
      lastResult: null,
      lastResultRescrutiny: null,
      selectedCurriculum: "diploma_in_engineering" // Default
    };
  }

  await ctx.replyWithHTML(
`🎓 <b>Welcome to BTEB Student Result Bot</b>

এই বটের মাধ্যমে বিভিন্ন Curriculum-এর Result দেখতে পারবেন।

✨ <b>Features:</b>
• 🔍 Check Result with Curriculum Selection
• ⭐ Save & View Your Result
• 📜 Search History (Last 5)
• 📊 Semester-wise GPA
• 📕 Referred Subjects
• 🔄 Re-scrutiny Status
• 📚 20+ Curriculum Support

📌 <b>How to Check Result:</b>
1️⃣ Click "🔍 Check Result"
2️⃣ Select your Curriculum
3️⃣ Enter your Board Roll

💡 <b>Default Curriculum:</b> Diploma In Engineering
📚 Change using "📚 Select Curriculum" button`,
mainMenu
  );
});

// ===============================
// SELECT CURRICULUM (Main Menu)
// ===============================

bot.hears("📚 Select Curriculum", async (ctx) => {
  await showCurriculumSelection(ctx);
});

// ===============================
// CHECK RESULT FLOW
// ===============================

bot.hears("🔍 Check Result", async (ctx) => {
  const userId = ctx.from.id;
  userState[userId] = { step: "SELECTING_CURRICULUM" };
  
  await ctx.replyWithHTML(
`🔍 <b>Check Result - Step 1/2</b>

📚 <b>Select Your Curriculum</b>

নিচ থেকে আপনার Curriculum নির্বাচন করুন:

💡 <b>Current:</b> ${getCurriculumName(userData[userId]?.selectedCurriculum)}`,
    {
      reply_markup: {
        inline_keyboard: getCurriculumButtons()
      }
    }
  );
});

// Curriculum Selection Callback (from Check Result)
bot.action(/^check_curr_(.+)$/, async (ctx) => {
  const curriculumId = ctx.match[1];
  const userId = ctx.from.id;
  
  // Find curriculum name
  const curriculum = Object.values(CURRICULUMS).find(c => c.id === curriculumId);
  
  if (!curriculum) {
    await ctx.answerCbQuery("❌ Invalid curriculum selected");
    return;
  }

  // Save selected curriculum
  if (!userData[userId]) {
    userData[userId] = {
      savedRoll: null,
      searchHistory: [],
      lastResult: null,
      lastResultRescrutiny: null,
      selectedCurriculum: curriculumId
    };
  } else {
    userData[userId].selectedCurriculum = curriculumId;
  }

  // Update state to waiting for roll
  userState[userId] = { 
    step: "WAITING_ROLL",
    curriculum: curriculumId
  };

  await ctx.answerCbQuery(`✅ ${curriculum.name} selected`);
  
  await ctx.replyWithHTML(
`✅ <b>Curriculum Selected!</b>

📚 <b>${curriculum.emoji} ${curriculum.name}</b>

━━━━━━━━━━━━━━

🔍 <b>Step 2/2 - Enter Your Roll</b>

📝 আপনার <b>Board Roll</b> পাঠান।

<b>Example:</b>
<code>240363</code>

💡 Result automatically save করবে।`,
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
• Click "🔍 Check Result"
• Select your Curriculum
• Enter your Board Roll

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

<b>📚 Select Curriculum</b>
• আপনার Curriculum পরিবর্তন করুন

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

// My Result (Saved Result)
bot.hears("⭐ My Result", async (ctx) => {
  const userId = ctx.from.id;
  
  if (!userData[userId]?.savedRoll) {
    return ctx.replyWithHTML(
`❌ <b>No Saved Result Found</b>

আপনি এখনো কোনো Result সংরক্ষণ করেননি।

🔍 <b>How to Save:</b>
1. "🔍 Check Result" ব্যবহার করুন
2. Curriculum নির্বাচন করুন
3. আপনার Roll পাঠান
4. Automatically সংরক্ষিত হবে

অথবা সরাসরি Roll পাঠান।`,
mainMenu
    );
  }

  if (userData[userId]?.lastResult) {
    await displayResult(ctx, userData[userId].lastResult, userData[userId].savedRoll);
  } else {
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
    const curriculum = item.curriculum ? Object.values(CURRICULUMS).find(c => c.id === item.curriculum) : null;
    const currEmoji = curriculum?.emoji || "📚";
    historyText += `${index + 1}. ${currEmoji} <code>${item.roll}</code> - ${date}\n`;
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
• Click "🔍 Check Result"
• Select your Curriculum
• Enter your Board Roll

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

<b>📚 Select Curriculum</b>
• আপনার Curriculum পরিবর্তন করুন

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

⚡ Version: 4.0

✨ <b>Features:</b>
• Step-by-step Result Check
• 20+ Curriculum Support
• Save & View Results
• Search History (Last 5)
• Semester-wise GPA
• Referred Subjects
• Re-scrutiny Status

🌐 Data Source:
BTEB Results Zone

👨‍💻 Powered by SDPI

📚 <b>Supported Curriculums:</b>
${Object.values(CURRICULUMS).map(c => `${c.emoji} ${c.name}`).join('\n')}`,
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

<code>/result 240363</code>
<code>/result 240363 diploma_in_engineering</code>`
    );
  }
  
  const roll = args[1];
  const curriculum = args[2] || userData[ctx.from.id]?.selectedCurriculum || "diploma_in_engineering";
  
  await getResult(ctx, roll, false, curriculum);
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
    const curriculum = item.curriculum ? Object.values(CURRICULUMS).find(c => c.id === item.curriculum) : null;
    const currEmoji = curriculum?.emoji || "📚";
    historyText += `${index + 1}. ${currEmoji} <code>${item.roll}</code> - ${date}\n`;
  });

  await ctx.replyWithHTML(
`📜 <b>Last 5 Search History</b>

${historyText}`
  );
});

// /curriculum command
bot.command("curriculum", async (ctx) => {
  await showCurriculumSelection(ctx);
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
    "🌐 Website",
    "📚 Select Curriculum"
  ];
  
  if (menuButtons.includes(text)) return;

  const userId = ctx.from.id;

  // Check if user is in WAITING_ROLL state
  if (userState[userId]?.step === "WAITING_ROLL") {
    const curriculum = userState[userId].curriculum || userData[userId]?.selectedCurriculum || "diploma_in_engineering";
    delete userState[userId];
    return await getResult(ctx, text, false, curriculum);
  }

  // Direct Roll (with default curriculum)
  if (/^\d{6}$/.test(text)) {
    const curriculum = userData[userId]?.selectedCurriculum || "diploma_in_engineering";
    return await getResult(ctx, text, false, curriculum);
  }
});

// ===============================
// HELPER FUNCTIONS
// ===============================

function getCurriculumButtons() {
  const buttons = Object.values(CURRICULUMS).map((curr) => [
    Markup.button.callback(
      `${curr.emoji} ${curr.short || curr.name}`,
      `check_curr_${curr.id}`
    )
  ]);

  // Format in 2 columns
  const twoColumnButtons = [];
  for (let i = 0; i < buttons.length; i += 2) {
    if (i + 1 < buttons.length) {
      twoColumnButtons.push([buttons[i][0], buttons[i + 1][0]]);
    } else {
      twoColumnButtons.push([buttons[i][0]]);
    }
  }
  
  // Add cancel button
  twoColumnButtons.push([
    Markup.button.callback("❌ Cancel", "cancel_check")
  ]);
  
  return twoColumnButtons;
}

function getCurriculumName(curriculumId) {
  if (!curriculumId) return "Diploma In Engineering";
  const curriculum = Object.values(CURRICULUMS).find(c => c.id === curriculumId);
  return curriculum ? `${curriculum.emoji} ${curriculum.name}` : "Diploma In Engineering";
}

async function showCurriculumSelection(ctx) {
  const userId = ctx.from.id;
  const currentCurr = userData[userId]?.selectedCurriculum || "diploma_in_engineering";
  const currentName = getCurriculumName(currentCurr);

  await ctx.replyWithHTML(
`📚 <b>Select Your Curriculum</b>

বর্তমান Curriculum: <code>${currentName}</code>

নিচ থেকে আপনার Curriculum নির্বাচন করুন:`,
    {
      reply_markup: {
        inline_keyboard: getCurriculumButtons()
      }
    }
  );
}

// ===============================
// GET RESULT
// ===============================

async function getResult(ctx, roll, isSaved = false, curriculumId = null) {
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

    const userId = ctx.from.id;
    const curriculum = curriculumId || userData[userId]?.selectedCurriculum || "diploma_in_engineering";
    
    loading = await ctx.reply("⏳ Checking result...");

    // API Call with curriculum
    const { data } = await axios.get(API_URL, {
      params: {
        roll,
        curriculumId: curriculum
      },
      timeout: 15000
    });

    // Result Not Found
    if (!data.success || !data.data || data.data.length === 0) {
      return ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        "❌ Result not found for this Roll and Curriculum."
      );
    }

    // Main Result
    const student = data.data.find(r => r.regulation !== 0) || data.data[0];
    const rescrutiny = data.data.find(r => r.regulation === 0);

    // Save to user data
    if (!userData[userId]) {
      userData[userId] = {
        savedRoll: null,
        searchHistory: [],
        lastResult: null,
        lastResultRescrutiny: null,
        selectedCurriculum: curriculum
      };
    }

    // Save result if not saved already
    if (!isSaved) {
      userData[userId].savedRoll = roll;
      userData[userId].lastResult = student;
      userData[userId].lastResultRescrutiny = rescrutiny;
      userData[userId].selectedCurriculum = curriculum;
      
      // Add to search history
      if (!userData[userId].searchHistory) {
        userData[userId].searchHistory = [];
      }
      
      userData[userId].searchHistory.unshift({
        roll: roll,
        curriculum: curriculum,
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

    const userId = ctx.from.id;
    const curriculum = userData[userId]?.selectedCurriculum || "diploma_in_engineering";

    const { data } = await axios.get(API_URL, {
      params: {
        roll,
        curriculumId: curriculum
      },
      timeout: 15000
    });

    if (!data.success || !data.data || data.data.length === 0) {
      return ctx.reply("❌ Result not found.");
    }

    const student = data.data.find(r => r.regulation !== 0) || data.data[0];
    const rescrutiny = data.data.find(r => r.regulation === 0);

    if (!userData[userId]) {
      userData[userId] = {
        savedRoll: null,
        searchHistory: [],
        lastResult: null,
        lastResultRescrutiny: null,
        selectedCurriculum: curriculum
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

// Cancel Check
bot.action("cancel_check", async (ctx) => {
  const userId = ctx.from.id;
  delete userState[userId];
  await ctx.answerCbQuery("❌ Cancelled");
  await ctx.replyWithHTML(
`❌ <b>Search Cancelled</b>

আবার চেষ্টা করতে "🔍 Check Result" ব্যবহার করুন।`,
mainMenu
  );
});

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
    const curriculum = item.curriculum ? Object.values(CURRICULUMS).find(c => c.id === item.curriculum) : null;
    const currEmoji = curriculum?.emoji || "📚";
    historyText += `${index + 1}. ${currEmoji} <code>${item.roll}</code> - ${date}\n`;
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
  
  const userId = ctx.from.id;
  const historyItem = userData[userId]?.searchHistory?.find(h => h.roll === roll);
  const curriculum = historyItem?.curriculum || userData[userId]?.selectedCurriculum || "diploma_in_engineering";
  
  await getResult(ctx, roll, false, curriculum);
});

// Search Again
bot.action("search_again", async (ctx) => {
  const userId = ctx.from.id;
  userState[userId] = { step: "SELECTING_CURRICULUM" };
  await ctx.answerCbQuery();
  
  await ctx.replyWithHTML(
`🔍 <b>Search Again - Step 1/2</b>

📚 <b>Select Your Curriculum</b>

নিচ থেকে আপনার Curriculum নির্বাচন করুন:

💡 <b>Current:</b> ${getCurriculumName(userData[userId]?.selectedCurriculum)}`,
    {
      reply_markup: {
        inline_keyboard: getCurriculumButtons()
      }
    }
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