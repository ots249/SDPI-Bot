require("dotenv").config();

const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);
const API = process.env.API_URL;

bot.start((ctx) => {
    ctx.reply(
`🎓 Welcome to SDPI Bot

📌 Send your Board Roll

Example:
240363

Or use:
/result 240363`,
        Markup.inlineKeyboard([
            [Markup.button.url("🌐 SDPI Website", "https://sdpi.pro.bd")]
        ])
    );
});

bot.help((ctx) => {
    ctx.reply(`Commands

/result <roll>

Example:
/result 240363`);
});

async function getResult(ctx, roll) {

    const loading = await ctx.reply("🔍 Searching...");

    try {

        const { data } = await axios.get(API, {
            params: {
                roll: roll,
                curriculumId: "diploma_in_engineering"
            }
        });

        if (!data.success || !data.data || data.data.length === 0) {
            return ctx.telegram.editMessageText(
                ctx.chat.id,
                loading.message_id,
                undefined,
                "❌ Result not found."
            );
        }

        const s = data.data[0];

        let semesters = "";

        s.latestResults.forEach(r => {
            semesters += `📘 Semester ${r.semester}\n`;
            semesters += `⭐ GPA: ${r.gpa}\n`;
            semesters += `📅 ${r.date.substring(0,10)}\n\n`;
        });

        const message = `
🎓 <b>BTEB Student Result</b>

🆔 <b>Roll:</b> ${s.roll}

🏫 <b>Institute:</b>
${s.institute.name}

📍 <b>District:</b>
${s.institute.district}

📖 <b>Curriculum:</b>
${s.curriculumId}

📚 <b>Regulation:</b>
${s.regulation}

━━━━━━━━━━━━━━

${semesters}
`;

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
                                text: "🌐 Open Website",
                                url: `https://btebresultszone.com/results?roll=${roll}`
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