const Discord = require("discord.js")

const client = new Discord.Client()

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.on("message", msg => {
  if (msg.content === "test") {
    msg.reply("Pong!")
  }
})

client.login(process.env.BOT_TOKEN)