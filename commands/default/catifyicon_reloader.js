const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("catifyicon")
    .setDescription(
      "Turns the server's icon into a random cat picture. (Admin only)"
    ),
  async execute(interaction) {
    interaction.reply("something went wrong");
  },
};
