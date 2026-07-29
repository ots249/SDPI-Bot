require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

const API = process.env.API_URL || "https://btebresultszone.com/api/student-results";

bot.start((ctx) => {
    ctx.reply(
`🎓 Welcome to SDPI Bot

📌 Send your Board Roll

Example:
240363

Or

/result 240363`,
        Markup.inlineKeyboard([
            [
                Markup.button.url(
                    "🌐 BTEB Results Zone",
                    "https://btebresultszone.com"
                )
            ]
        ])
    );
});

bot.help((ctx) => {
    ctx.reply(
`📖 Commands

/result <roll>

Example:
/result 240363`
    );
});

async function getResult(ctx, roll) {

    const loading = await ctx.reply("🔍 Searching...");

    try {

        const response = await axios.get(API, {
            params: {
                roll: roll,
                curriculumId: "diploma_in_engineering"
            },
            timeout: 15000
        });

        const json = response.data;

        console.log(JSON.stringify(json, null, 2));

        if (!json.success || !json.data || json.data.length === 0) {

            return ctx.telegram.editMessageText(
                ctx.chat.id,
                loading.message_id,
                undefined,
                "❌ Result not found."
            );

        }

        const student = json.data[0];

        let semesterText = "";

        if (student.latestResults) {

            student.latestResults.forEach(r => {

                semesterText +=
`📘 Semester : ${r.semester}
⭐ GPA : ${r.gpa}
📅 Date : ${r.date.substring(0,10)}

`;

            });

        }

        const text =
`🎓 <b>BTEB Student Result</b>

🆔 <b>Roll:</b> ${student.roll}

🏫 <b>Institute:</b>
${student.institute.name}

📍 <b>District:</b>
${student.institute.district}

📚 <b>Regulation:</b>
${student.regulation}

━━━━━━━━━━━━━━

${semesterText}`;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            loading.message_id,
            undefined,
            text,
            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🌐 Open Website",
                                url: `https://btebresultszone.com/results?roll=${student.roll}`
                            }
                        ]
                    ]
                }
            }
        );

    } catch (err) {

        console.error(err.response?.data || err.message);

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            loading.message_id,
            undefined,
            "❌ Server Error."
        );

    }

}

bot.command("result", (ctx) => {

    const args = ctx.message.text.trim().split(/\s+/);

    if (args.length < 2) {
        return ctx.reply("Usage:\n/result 240363");
    }

    getResult(ctx, args[1]);

});

bot.on("text", (ctx) => {

    const text = ctx.message.text.trim();

    if (/^\d+$/.test(text)) {

        getResult(ctx, text);

    } else {

        ctx.reply("❌ Please send a valid Board Roll.");

    }

});

bot.telegram.getMe()
.then((me)=>{
    console.log("✅ Logged in as:", me.username);
})
.catch((err)=>{
    console.error("❌ Telegram Error:", err.message);
});

bot.launch();

console.log("🚀 SDPI Bot Started");

bot.launch().then(() => {
    console.log("🤖 Bot Started Successfully");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// Railway health check
const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
    res.writeHead(200);
    res.end("SDPI Bot is running");
}).listen(PORT, () => {
    console.log(`Health server listening on ${PORT}`);
});