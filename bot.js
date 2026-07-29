
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

async function getResult(ctx,roll){
 const wait=await ctx.reply("🔍 Searching...");
 try{
   const {data}=await axios.get(`${API}?roll=${roll}`);
   if(!data.success||!data.data){
      return ctx.telegram.editMessageText(ctx.chat.id,wait.message_id,undefined,"❌ Result not found.");
   }
   const s=data.data;
   const caption=
`🎓 <b>SDPI Student Information</b>

👤 <b>Name:</b> ${s.name}
📝 <b>বাংলা নাম:</b> ${s.nameBn}
🎓 <b>Department:</b> ${s.dept}
🆔 <b>Roll:</b> ${s.roll}
📄 <b>Registration:</b> ${s.reg}
📚 <b>Session:</b> ${s.session}
🌅 <b>Shift:</b> ${s.shift}
🩸 <b>Blood:</b> ${s.bloodGroup}
👨 <b>Father:</b> ${s.fatherBn}
👩 <b>Mother:</b> ${s.motherBn}
🏠 <b>Address:</b>
${s.village}
${s.post}
${s.upazila}, ${s.district}

📌 <b>Status:</b> ${s.status}`;
   await ctx.telegram.deleteMessage(ctx.chat.id,wait.message_id);
   const opts={parse_mode:"HTML",reply_markup:{inline_keyboard:[[{text:"🌐 SDPI Website",url:"https://sdpi.pro.bd"}]]}};
   if(s.photoUrl){
      await ctx.replyWithPhoto({url:s.photoUrl},{caption,...opts});
   }else{
      await ctx.reply(caption,opts);
   }
 }catch(e){
   await ctx.telegram.editMessageText(ctx.chat.id,wait.message_id,undefined,"❌ Server Error.");
 }
}

bot.command("result",(ctx)=>{
 const a=ctx.message.text.split(/\s+/);
 if(a.length<2)return ctx.reply("Usage:\n/result 240363");
 getResult(ctx,a[1]);
});

bot.on("text",(ctx)=>{
 const t=ctx.message.text.trim();
 if(/^\d+$/.test(t)) getResult(ctx,t);
});

bot.launch();
console.log("SDPI Bot Running");
