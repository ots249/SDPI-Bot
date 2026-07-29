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

        const response = await axios.get(`${API}?roll=${encodeURIComponent(roll)}`);
        const json = response.data;

        console.log(JSON.stringify(json, null, 2));

        if (!json.success || !json.data) {
            return ctx.telegram.editMessageText(
                ctx.chat.id,
                loading.message_id,
                undefined,
                "❌ Result not found."
            );
        }

        const s = json.data;

        const caption = `
🎓 <b>SDPI Student Information</b>

👤 <b>Name:</b> ${s.name}
📝 <b>বাংলা নাম:</b> ${s.nameBn}

🏗 <b>Department:</b> ${s.dept}
🆔 <b>Roll:</b> ${s.roll}
📄 <b>Registration:</b> ${s.reg}
📚 <b>Session:</b> ${s.session}
🌅 <b>Shift:</b> ${s.shift}

🩸 <b>Blood Group:</b> ${s.bloodGroup}

👨 <b>Father:</b> ${s.fatherBn}
👩 <b>Mother:</b> ${s.motherBn}

🏠 <b>Address:</b>
${s.village}
${s.post}
${s.upazila}, ${s.district}

📌 <b>Status:</b> ${s.status}
`;

        await ctx.deleteMessage(loading.message_id);

        if (s.photoUrl && s.photoUrl.startsWith("http")) {

            await ctx.replyWithPhoto(
                s.photoUrl,
                {
                    caption,
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "🌐 SDPI Website",
                                    url: "https://sdpi.pro.bd"
                                }
                            ]
                        ]
                    }
                }
            );

        } else {

            await ctx.reply(caption, {
                parse_mode: "HTML"
            });

        }

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

    const roll = ctx.message.text.trim();

    if (/^\d+$/.test(roll)) {
        getResult(ctx, roll);
    }

});

bot.launch();

console.log("✅ SDPI Bot Running...");