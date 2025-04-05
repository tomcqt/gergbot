const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toggleicon")
    .setDescription(
      "Toggles if the server icon should be updated every 10 minutes. (Admin only)"
    ),
  async execute(interaction) {
    interaction.reply("something went wrong");
  },
};
