
require("dotenv").config();
const {Telegraf,Markup}=require("telegraf");
const axios=require("axios");
const bot=new Telegraf(process.env.BOT_TOKEN);
const API=process.env.API_URL;

bot.start((ctx)=>ctx.reply(
`🎓 Welcome to SDPI Bot

Send your Board Roll
or
/result 240363`,
Markup.inlineKeyboard([[Markup.button.url("🌐 SDPI Website","https://sdpi.pro.bd")]])
));

bot.help((ctx)=>ctx.reply("/result <roll>\n\nExample:\n/result 240363"));

async function getResult(ctx, roll) {
    const loading = await ctx.reply("🔍 Searching...");

    try {
        const response = await axios.get(`${API}?roll=${encodeURIComponent(roll)}`);
        const data = response.data;

        console.log("API Response:", JSON.stringify(data, null, 2));

        if (!data || data.success !== true || !data.data) {
            return await ctx.telegram.editMessageText(
                ctx.chat.id,
                loading.message_id,
                undefined,
                "❌ Result not found."
            );
        }

        const s = data.data;

        const message = `
🎓 <b>SDPI Student Information</b>

👤 <b>Name:</b> ${s.name || "N/A"}
📝 <b>বাংলা নাম:</b> ${s.nameBn || "N/A"}

🏗 <b>Department:</b> ${s.dept || "N/A"}
🆔 <b>Roll:</b> ${s.roll || "N/A"}
📄 <b>Registration:</b> ${s.reg || "N/A"}
📚 <b>Session:</b> ${s.session || "N/A"}
🌅 <b>Shift:</b> ${s.shift || "N/A"}

🩸 <b>Blood Group:</b> ${s.bloodGroup || "N/A"}

👨 <b>Father:</b> ${s.fatherBn || "N/A"}
👩 <b>Mother:</b> ${s.motherBn || "N/A"}

🏠 <b>Address:</b>
${s.village || ""}
${s.post || ""}
${s.upazila || ""}, ${s.district || ""}

📌 <b>Status:</b> ${s.status || "N/A"}
`;

        await ctx.telegram.deleteMessage(ctx.chat.id, loading.message_id);

        if (s.photoUrl) {
            await ctx.replyWithPhoto(
                { url: s.photoUrl },
                {
                    caption: message,
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
            await ctx.reply(message, {
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