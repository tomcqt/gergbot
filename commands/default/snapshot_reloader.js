const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("snapshot")
    .setDescription("Gets a snapshot of the current canvas."),
  async execute(interaction) {
    interaction.reply("something went wrong");
  },
};
