require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const http = require("http");

const bot = new Telegraf(process.env.BOT_TOKEN);

const API_URL =
  process.env.API_URL ||
  "https://btebresultszone.com/api/student-results";

// Admin Configuration
const ADMIN_IDS = (process.env.ADMIN_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
const BOT_OWNER = process.env.BOT_OWNER || "SDPI";

// User State
const userState = {};

// User Data Storage (In-memory - for demo purposes)
const userData = {};

// Admin Stats
let adminStats = {
  totalUsers: 0,
  totalSearches: 0,
  totalResultsFound: 0,
  totalErrors: 0,
  activeUsers: 0,
  botStartTime: Date.now(),
  dailySearches: {},
  popularRolls: {},
  popularCurriculums: {}
};

// Broadcast State
const broadcastState = {};

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
// ADMIN CHECK
// ===============================

function isAdmin(ctx) {
  const userId = ctx.from.id.toString();
  return ADMIN_IDS.includes(userId);
}

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

// Admin Menu
const adminMenu = Markup.keyboard([
  ["📊 Dashboard", "👥 Users"],
  ["📢 Broadcast", "📈 Statistics"],
  ["🔍 Search User", "⚙️ Settings"],
  ["📋 Logs", "🔄 Reset Stats"],
  ["🚪 Exit Admin"]
])
  .resize()
  .persistent();

// ===============================
// START
// ===============================

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  delete userState[userId];

  // Update stats
  if (!userData[userId]) {
    adminStats.totalUsers++;
  }

  // Initialize user data if not exists
  if (!userData[userId]) {
    userData[userId] = {
      savedRoll: null,
      searchHistory: [],
      lastResult: null,
      lastResultRescrutiny: null,
      selectedCurriculum: "diploma_in_engineering",
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      totalSearches: 0
    };
  } else {
    userData[userId].lastSeen = Date.now();
  }

  // Check if admin
  if (isAdmin(ctx)) {
    await ctx.replyWithHTML(
`👑 <b>Welcome Admin!</b>

🎓 BTEB Student Result Bot

📊 <b>Quick Stats:</b>
• Total Users: ${adminStats.totalUsers}
• Total Searches: ${adminStats.totalSearches}
• Active Users: ${adminStats.activeUsers}

Use /admin for Admin Panel`,
mainMenu
    );
    return;
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
// ADMIN COMMANDS
// ===============================

bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx)) {
    return ctx.reply("⛔ You are not authorized to use this command.");
  }
  await showAdminPanel(ctx);
});

bot.command("stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showAdminStats(ctx);
});

bot.command("users", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showUserList(ctx);
});

bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(" ").slice(1).join(" ");
  if (!args) {
    return ctx.replyWithHTML(
`❌ <b>Usage:</b>
<code>/broadcast Your message here</code>

<b>Example:</b>
<code>/broadcast 📢 New feature added!</code>`
    );
  }
  await broadcastMessage(ctx, args);
});

bot.command("resetstats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  adminStats = {
    totalUsers: Object.keys(userData).length,
    totalSearches: 0,
    totalResultsFound: 0,
    totalErrors: 0,
    activeUsers: 0,
    botStartTime: Date.now(),
    dailySearches: {},
    popularRolls: {},
    popularCurriculums: {}
  };
  await ctx.reply("✅ Statistics reset successfully!");
});

// ===============================
// ADMIN PANEL
// ===============================

async function showAdminPanel(ctx) {
  await ctx.replyWithHTML(
`👑 <b>Admin Panel</b>

📊 <b>Dashboard</b>
• Total Users: ${adminStats.totalUsers}
• Total Searches: ${adminStats.totalSearches}
• Results Found: ${adminStats.totalResultsFound}
• Errors: ${adminStats.totalErrors}
• Active Users: ${adminStats.activeUsers}
• Uptime: ${getUptime()}

📌 <b>Available Actions:</b>
• 📊 Dashboard - View stats
• 👥 Users - Manage users
• 📢 Broadcast - Send messages
• 📈 Statistics - Detailed stats
• 🔍 Search User - Find user
• ⚙️ Settings - Bot settings
• 📋 Logs - View logs
• 🔄 Reset Stats - Reset statistics`,
adminMenu
  );
}

// ===============================
// ADMIN MENU HANDLERS
// ===============================

// Dashboard
bot.hears("📊 Dashboard", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showAdminStats(ctx);
});

// Users
bot.hears("👥 Users", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showUserList(ctx);
});

// Broadcast
bot.hears("📢 Broadcast", async (ctx) => {
  if (!isAdmin(ctx)) return;
  broadcastState[ctx.from.id] = { step: "waiting_message" };
  await ctx.replyWithHTML(
`📢 <b>Broadcast Message</b>

📝 আপনার Broadcast Message পাঠান।

💡 <b>Tips:</b>
• HTML formatting supported
• Use /broadcast command for quick send
• Type "cancel" to cancel`,
Markup.inlineKeyboard([
  [Markup.button.callback("❌ Cancel", "cancel_broadcast")]
])
  );
});

// Statistics
bot.hears("📈 Statistics", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showDetailedStats(ctx);
});

// Search User
bot.hears("🔍 Search User", async (ctx) => {
  if (!isAdmin(ctx)) return;
  userState[ctx.from.id] = { step: "admin_search_user" };
  await ctx.replyWithHTML(
`🔍 <b>Search User</b>

📝 ইউজারের ID অথবা Roll Number পাঠান।

<b>Example:</b>
<code>123456789</code> (User ID)
<code>240363</code> (Roll Number)`,
Markup.inlineKeyboard([
  [Markup.button.callback("❌ Cancel", "cancel_admin_action")]
])
  );
});

// Settings
bot.hears("⚙️ Settings", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showSettings(ctx);
});

// Logs
bot.hears("📋 Logs", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await showLogs(ctx);
});

// Reset Stats
bot.hears("🔄 Reset Stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.replyWithHTML(
`⚠️ <b>Reset Statistics?</b>

আপনি কি সব Statistics রিসেট করতে চান?

📊 <b>Current Stats:</b>
• Total Users: ${adminStats.totalUsers}
• Total Searches: ${adminStats.totalSearches}
• Results Found: ${adminStats.totalResultsFound}`,
Markup.inlineKeyboard([
  [Markup.button.callback("✅ Yes, Reset", "confirm_reset_stats")],
  [Markup.button.callback("❌ No, Cancel", "cancel_admin_action")]
])
  );
});

// Exit Admin
bot.hears("🚪 Exit Admin", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.replyWithHTML(
`👋 <b>Exited Admin Panel</b>

মেনুতে ফিরে যান।`,
mainMenu
  );
});

// ===============================
// ADMIN STATS
// ===============================

async function showAdminStats(ctx) {
  const activeUsers = Object.keys(userData).filter(id => {
    const user = userData[id];
    return user && (Date.now() - user.lastSeen) < 86400000; // 24 hours
  }).length;

  adminStats.activeUsers = activeUsers;

  const message = 
`📊 <b>Bot Statistics</b>

━━━━━━━━━━━━━━━━━━━

👥 <b>Users:</b>
• Total: <code>${adminStats.totalUsers}</code>
• Active (24h): <code>${adminStats.activeUsers}</code>

🔍 <b>Searches:</b>
• Total: <code>${adminStats.totalSearches}</code>
• Successful: <code>${adminStats.totalResultsFound}</code>
• Errors: <code>${adminStats.totalErrors}</code>

⏱️ <b>Bot Info:</b>
• Uptime: <code>${getUptime()}</code>
• Started: <code>${new Date(adminStats.botStartTime).toLocaleString()}</code>

📚 <b>Top Curriculums:</b>
${getTopCurriculums()}

📈 <b>Top Searched Rolls:</b>
${getTopRolls()}`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "refresh_stats" },
          { text: "📈 Detailed", callback_data: "detailed_stats" }
        ],
        [
          { text: "📋 Export Data", callback_data: "export_data" }
        ]
      ]
    }
  });
}

async function showDetailedStats(ctx) {
  const totalSearches = Object.values(userData).reduce((sum, user) => sum + (user.totalSearches || 0), 0);
  const usersWithSaved = Object.values(userData).filter(u => u.savedRoll).length;
  
  const today = new Date().toDateString();
  const todaySearches = adminStats.dailySearches[today] || 0;

  const message =
`📈 <b>Detailed Statistics</b>

━━━━━━━━━━━━━━━━━━━

👥 <b>User Stats:</b>
• Registered: <code>${adminStats.totalUsers}</code>
• With Saved Results: <code>${usersWithSaved}</code>
• Active (24h): <code>${adminStats.activeUsers}</code>

🔍 <b>Search Stats:</b>
• Today: <code>${todaySearches}</code>
• This Week: <code>${getWeeklySearches()}</code>
• Total: <code>${totalSearches}</code>
• Success Rate: <code>${getSuccessRate()}%</code>

📊 <b>Performance:</b>
• Avg Searches/User: <code>${(totalSearches / adminStats.totalUsers).toFixed(1)}</code>
• Error Rate: <code>${getErrorRate()}%</code>

📚 <b>Curriculum Distribution:</b>
${getCurriculumDistribution()}`;

  await ctx.replyWithHTML(message);
}

// ===============================
// USER MANAGEMENT
// ===============================

async function showUserList(ctx) {
  const users = Object.keys(userData);
  const totalUsers = users.length;
  const activeUsers = users.filter(id => {
    const user = userData[id];
    return user && (Date.now() - user.lastSeen) < 86400000;
  }).length;

  let userList = "";
  const recentUsers = users.slice(-10).reverse();
  recentUsers.forEach((id, index) => {
    const user = userData[id];
    if (user) {
      const lastSeen = user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Never";
      const hasSaved = user.savedRoll ? "⭐" : "❌";
      userList += `${index + 1}. <code>${id}</code> ${hasSaved}\n   📅 ${lastSeen}\n`;
    }
  });

  const message =
`👥 <b>User Management</b>

━━━━━━━━━━━━━━━━━━━

📊 <b>Overview:</b>
• Total: <code>${totalUsers}</code>
• Active (24h): <code>${activeUsers}</code>
• Inactive: <code>${totalUsers - activeUsers}</code>

📋 <b>Recent Users (Last 10):</b>

${userList || "No users found"}

💡 <b>Actions:</b>
• Click "🔍 Search User" to find specific user
• Use /searchuser [id] command`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "refresh_users" },
          { text: "📊 Stats", callback_data: "refresh_stats" }
        ]
      ]
    }
  });
}

// ===============================
// BROADCAST SYSTEM
// ===============================

async function broadcastMessage(ctx, message, isReply = false) {
  if (!isAdmin(ctx)) return;

  const loading = await ctx.reply("📢 Sending broadcast...");

  let sent = 0;
  let failed = 0;
  const userIds = Object.keys(userData);

  for (const userId of userIds) {
    try {
      await bot.telegram.sendMessage(userId, message, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📊 Check Result", callback_data: "search_again" }]
          ]
        }
      });
      sent++;
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      failed++;
      console.error(`Failed to send to ${userId}:`, error.message);
    }
  }

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    loading.message_id,
    undefined,
`📢 <b>Broadcast Complete!</b>

✅ <b>Sent:</b> <code>${sent}</code>
❌ <b>Failed:</b> <code>${failed}</code>
👥 <b>Total:</b> <code>${sent + failed}</code>

💡 <b>Message:</b>
${message.substring(0, 100)}${message.length > 100 ? "..." : ""}`
  );

  // Log broadcast
  console.log(`Broadcast sent by ${ctx.from.id}: ${message}`);
}

// ===============================
// SETTINGS
// ===============================

async function showSettings(ctx) {
  const message =
`⚙️ <b>Bot Settings</b>

━━━━━━━━━━━━━━━━━━━

🔧 <b>General Settings:</b>
• Default Curriculum: <code>${userData[ctx.from.id]?.selectedCurriculum || "diploma_in_engineering"}</code>
• Max History: <code>5</code>
• Auto-save: <code>Enabled</code>

📢 <b>Broadcast Settings:</b>
• Rate Limit: <code>50ms</code>
• Max Users: <code>${Object.keys(userData).length}</code>

👑 <b>Admin Settings:</b>
• Admins: <code>${ADMIN_IDS.length}</code>
• Owner: <code>${BOT_OWNER}</code>

💡 <b>Available Commands:</b>
• /admin - Open Admin Panel
• /stats - View Statistics
• /users - View Users
• /broadcast - Send Broadcast
• /resetstats - Reset Statistics
• /setcurriculum - Set Default Curriculum`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📚 Set Default Curriculum", callback_data: "admin_set_curriculum" }
        ]
      ]
    }
  });
}

// ===============================
// LOGS
// ===============================

async function showLogs(ctx) {
  const logs = [
    `📋 <b>System Logs</b>`,
    `━━━━━━━━━━━━━━━━━━━`,
    `🕐 ${new Date().toLocaleString()} - Bot Started`,
    `👥 ${adminStats.totalUsers} Total Users`,
    `🔍 ${adminStats.totalSearches} Total Searches`,
    `✅ ${adminStats.totalResultsFound} Results Found`,
    `❌ ${adminStats.totalErrors} Errors`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📊 Recent Activities:`
  ];

  // Get recent activities from user data
  const recentActivities = Object.values(userData)
    .filter(u => u.lastSeen)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 5);

  recentActivities.forEach((user, index) => {
    const time = user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Unknown";
    const roll = user.savedRoll || "No roll";
    logs.push(`${index + 1}. 🆔 ${roll} - ${time}`);
  });

  await ctx.replyWithHTML(logs.join("\n"), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "refresh_logs" },
          { text: "🗑️ Clear", callback_data: "clear_logs" }
        ]
      ]
    }
  });
}

// ===============================
// ADMIN CALLBACK HANDLERS
// ===============================

// Refresh Stats
bot.action("refresh_stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("🔄 Refreshing...");
  await showAdminStats(ctx);
});

// Refresh Users
bot.action("refresh_users", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("🔄 Refreshing...");
  await showUserList(ctx);
});

// Refresh Logs
bot.action("refresh_logs", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("🔄 Refreshing...");
  await showLogs(ctx);
});

// Clear Logs
bot.action("clear_logs", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("🗑️ Logs cleared");
  await ctx.reply("✅ Logs cleared successfully!");
});

// Confirm Reset Stats
bot.action("confirm_reset_stats", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("🔄 Resetting...");
  
  adminStats = {
    totalUsers: Object.keys(userData).length,
    totalSearches: 0,
    totalResultsFound: 0,
    totalErrors: 0,
    activeUsers: 0,
    botStartTime: Date.now(),
    dailySearches: {},
    popularRolls: {},
    popularCurriculums: {}
  };
  
  await ctx.reply("✅ Statistics reset successfully!");
});

// Cancel Admin Action
bot.action("cancel_admin_action", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("❌ Cancelled");
  delete userState[ctx.from.id];
  await ctx.reply("❌ Action cancelled.", adminMenu);
});

// Cancel Broadcast
bot.action("cancel_broadcast", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("❌ Cancelled");
  delete broadcastState[ctx.from.id];
  await ctx.reply("❌ Broadcast cancelled.", adminMenu);
});

// Export Data
bot.action("export_data", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery("📋 Exporting...");
  
  const data = {
    stats: adminStats,
    users: Object.keys(userData).length,
    timestamp: new Date().toISOString()
  };
  
  await ctx.replyWithHTML(
`📋 <b>Data Export</b>

📊 <b>Statistics:</b>
${JSON.stringify(adminStats, null, 2)}

👥 <b>Total Users:</b> ${data.users}
🕐 <b>Exported:</b> ${data.timestamp}`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 View Dashboard", callback_data: "refresh_stats" }]
        ]
      }
    }
  );
});

// Admin Set Curriculum
bot.action("admin_set_curriculum", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery();
  await ctx.replyWithHTML(
`📚 <b>Set Default Curriculum</b>

নিচ থেকে নতুন Default Curriculum নির্বাচন করুন:`,
    {
      reply_markup: {
        inline_keyboard: getCurriculumButtons("admin_curr_")
      }
    }
  );
});

bot.action(/^admin_curr_(.+)$/, async (ctx) => {
  if (!isAdmin(ctx)) return;
  const curriculumId = ctx.match[1];
  const curriculum = Object.values(CURRICULUMS).find(c => c.id === curriculumId);
  
  if (!curriculum) {
    await ctx.answerCbQuery("❌ Invalid curriculum");
    return;
  }

  // Set as default for all users (optional)
  // Or just set for admin
  userData[ctx.from.id].selectedCurriculum = curriculumId;
  
  await ctx.answerCbQuery(`✅ ${curriculum.name} set as default`);
  await ctx.replyWithHTML(
`✅ <b>Default Curriculum Updated!</b>

📚 <b>New Default:</b> ${curriculum.emoji} ${curriculum.name}

💡 All users will now use this as default.`,
adminMenu
  );
});

// ===============================
// ADMIN TEXT HANDLERS
// ===============================

// Handle Broadcast Message
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();

  // Handle admin broadcast
  if (broadcastState[userId]?.step === "waiting_message") {
    if (text.toLowerCase() === "cancel") {
      delete broadcastState[userId];
      return ctx.reply("❌ Broadcast cancelled.", adminMenu);
    }
    
    await broadcastMessage(ctx, text);
    delete broadcastState[userId];
    return;
  }

  // Handle admin user search
  if (userState[userId]?.step === "admin_search_user") {
    delete userState[userId];
    await searchUser(ctx, text);
    return;
  }

  // Ignore menu buttons for non-admin
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
    "📚 Select Curriculum",
    "📊 Dashboard",
    "👥 Users",
    "📢 Broadcast",
    "📈 Statistics",
    "🔍 Search User",
    "⚙️ Settings",
    "📋 Logs",
    "🔄 Reset Stats",
    "🚪 Exit Admin"
  ];
  
  if (menuButtons.includes(text)) return;

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
// SEARCH USER (Admin)
// ===============================

async function searchUser(ctx, query) {
  if (!isAdmin(ctx)) return;

  // Check if query is a user ID or roll number
  const isUserId = /^\d+$/.test(query) && query.length > 6;
  let foundUsers = [];

  if (isUserId) {
    // Search by user ID
    const user = userData[query];
    if (user) {
      foundUsers.push({ id: query, data: user });
    }
  } else {
    // Search by roll number
    for (const [id, data] of Object.entries(userData)) {
      if (data.searchHistory?.some(h => h.roll === query) || data.savedRoll === query) {
        foundUsers.push({ id, data });
      }
    }
  }

  if (foundUsers.length === 0) {
    return ctx.replyWithHTML(
`❌ <b>User Not Found</b>

🔍 <b>Searched for:</b> <code>${query}</code>

💡 Try searching by User ID or Roll Number.`
    );
  }

  let userList = "";
  foundUsers.forEach(({ id, data }, index) => {
    const lastSeen = data.lastSeen ? new Date(data.lastSeen).toLocaleString() : "Never";
    const savedRoll = data.savedRoll || "None";
    const searches = data.totalSearches || 0;
    userList += 
`${index + 1}. 🆔 <code>${id}</code>
   📋 Roll: <code>${savedRoll}</code>
   🔍 Searches: ${searches}
   📅 Last Seen: ${lastSeen}
   📚 Curriculum: ${getCurriculumName(data.selectedCurriculum)}
   ━━━━━━━━━━━━━━━━━━━\n`;
  });

  const message =
`🔍 <b>User Search Results</b>

📊 <b>Found:</b> <code>${foundUsers.length}</code> user(s)

━━━━━━━━━━━━━━━━━━━

${userList}

💡 <b>Actions:</b>
• Click "📊 View Stats" to see user details
• Click "📢 DM User" to send message`;

  await ctx.replyWithHTML(message, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📊 View Stats", callback_data: "refresh_stats" },
          { text: "🔍 Search Again", callback_data: "admin_search_again" }
        ]
      ]
    }
  });
}

// Admin Search Again
bot.action("admin_search_again", async (ctx) => {
  if (!isAdmin(ctx)) return;
  await ctx.answerCbQuery();
  userState[ctx.from.id] = { step: "admin_search_user" };
  await ctx.replyWithHTML(
`🔍 <b>Search User Again</b>

📝 ইউজারের ID অথবা Roll Number পাঠান।`,
Markup.inlineKeyboard([
  [Markup.button.callback("❌ Cancel", "cancel_admin_action")]
])
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
        inline_keyboard: getCurriculumButtons("check_curr_")
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
• Admin Panel

🌐 Data Source:
BTEB Results Zone

👨‍💻 Powered by ${BOT_OWNER}

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

// /searchuser command (Admin)
bot.command("searchuser", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(" ").slice(1).join(" ");
  if (!args) {
    return ctx.replyWithHTML(
`❌ <b>Usage:</b>
<code>/searchuser 123456789</code> (User ID)
<code>/searchuser 240363</code> (Roll Number)`
    );
  }
  await searchUser(ctx, args);
});

// /setcurriculum command (Admin)
bot.command("setcurriculum", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const args = ctx.message.text.split(" ").slice(1).join(" ");
  if (!args) {
    return ctx.replyWithHTML(
`❌ <b>Usage:</b>
<code>/setcurriculum diploma_in_engineering</code>

📚 <b>Available Curriculums:</b>
${Object.values(CURRICULUMS).map(c => `• ${c.id}`).join('\n')}`
    );
  }
  
  const curriculum = Object.values(CURRICULUMS).find(c => c.id === args);
  if (!curriculum) {
    return ctx.reply(`❌ Invalid curriculum ID. Use /setcurriculum to see available options.`);
  }
  
  userData[ctx.from.id].selectedCurriculum = args;
  await ctx.replyWithHTML(
`✅ <b>Default Curriculum Updated!</b>

📚 ${curriculum.emoji} ${curriculum.name}`
  );
});

// ===============================
// HELPER FUNCTIONS
// ===============================

function getCurriculumButtons(prefix = "check_curr_") {
  const buttons = Object.values(CURRICULUMS).map((curr) => [
    Markup.button.callback(
      `${curr.emoji} ${curr.short || curr.name}`,
      `${prefix}${curr.id}`
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

function getUptime() {
  const uptime = Date.now() - adminStats.botStartTime;
  const days = Math.floor(uptime / 86400000);
  const hours = Math.floor((uptime % 86400000) / 3600000);
  const minutes = Math.floor((uptime % 3600000) / 60000);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getTopCurriculums() {
  const stats = adminStats.popularCurriculums || {};
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  if (sorted.length === 0) return "• No data yet";
  
  return sorted.map(([id, count]) => {
    const name = getCurriculumName(id);
    return `• ${name}: <code>${count}</code> searches`;
  }).join("\n");
}

function getTopRolls() {
  const stats = adminStats.popularRolls || {};
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  if (sorted.length === 0) return "• No data yet";
  
  return sorted.map(([roll, count]) => {
    return `• <code>${roll}</code>: ${count} searches`;
  }).join("\n");
}

function getWeeklySearches() {
  const now = Date.now();
  const weekAgo = now - 7 * 86400000;
  let total = 0;
  
  for (const [date, count] of Object.entries(adminStats.dailySearches || {})) {
    const dateObj = new Date(date);
    if (dateObj.getTime() > weekAgo) {
      total += count;
    }
  }
  
  return total;
}

function getSuccessRate() {
  const total = adminStats.totalSearches || 0;
  if (total === 0) return 0;
  return ((adminStats.totalResultsFound / total) * 100).toFixed(1);
}

function getErrorRate() {
  const total = adminStats.totalSearches || 0;
  if (total === 0) return 0;
  return ((adminStats.totalErrors / total) * 100).toFixed(1);
}

function getCurriculumDistribution() {
  const stats = adminStats.popularCurriculums || {};
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  
  if (total === 0) return "• No data yet";
  
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      const name = getCurriculumName(id);
      return `• ${name}: ${percentage}% (${count})`;
    })
    .join("\n");
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
        inline_keyboard: getCurriculumButtons("check_curr_")
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
    
    // Update stats
    adminStats.totalSearches++;
    const today = new Date().toDateString();
    adminStats.dailySearches[today] = (adminStats.dailySearches[today] || 0) + 1;
    
    if (userData[userId]) {
      userData[userId].totalSearches = (userData[userId].totalSearches || 0) + 1;
      userData[userId].lastSeen = Date.now();
    }
    
    // Track popular rolls and curriculums
    adminStats.popularRolls[roll] = (adminStats.popularRolls[roll] || 0) + 1;
    adminStats.popularCurriculums[curriculum] = (adminStats.popularCurriculums[curriculum] || 0) + 1;
    
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
      adminStats.totalErrors++;
      return ctx.telegram.editMessageText(
        ctx.chat.id,
        loading.message_id,
        undefined,
        "❌ Result not found for this Roll and Curriculum."
      );
    }

    adminStats.totalResultsFound++;

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
        selectedCurriculum: curriculum,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        totalSearches: 1
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
    adminStats.totalErrors++;

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

  if (isAdmin(ctx)) {
    inlineKeyboard.push([
      {
        text: "👑 Admin View",
        callback_data: "admin_view_user"
      }
    ]);
  }

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
        selectedCurriculum: curriculum,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        totalSearches: 0
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
        inline_keyboard: getCurriculumButtons("check_curr_")
      }
    }
  );
});

// Admin View User
bot.action("admin_view_user", async (ctx) => {
  if (!isAdmin(ctx)) return;
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  const user = userData[userId];
  if (!user) {
    return ctx.reply("❌ User data not found.");
  }
  
  const message =
`👤 <b>User Details</b>

🆔 <b>User ID:</b> <code>${userId}</code>
📋 <b>Saved Roll:</b> <code>${user.savedRoll || "None"}</code>
🔍 <b>Total Searches:</b> ${user.totalSearches || 0}
📚 <b>Curriculum:</b> ${getCurriculumName(user.selectedCurriculum)}
📅 <b>First Seen:</b> ${user.firstSeen ? new Date(user.firstSeen).toLocaleString() : "Unknown"}
📅 <b>Last Seen:</b> ${user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Unknown"}

📜 <b>Search History:</b>
${user.searchHistory?.slice(0, 3).map(h => `• <code>${h.roll}</code> - ${new Date(h.timestamp).toLocaleString()}`).join("\n") || "No history"}`;

  await ctx.replyWithHTML(message);
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
  console.log(`👑 Admins: ${ADMIN_IDS.join(", ") || "None"}`);
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