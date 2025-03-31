// taken from https://git.gay/Lycanea/ttfcBot/src/branch/main/commands/user/meow.js

// reverse engineered from ping.js (i know jackshit about discord and js modules)
const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("path");

let randomSelect = (arr) => arr.at(Math.floor(Math.random() * arr.length)); // select random element of array
let randomInt = (min, max) => Math.floor(Math.random() * (max - min) + min); // get random int from range (shit)

const meowData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "meowData.json"), "utf8")
);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("meow")
    .setDescription("Meows and mrrps! :3"),
  async execute(interaction) {
    let message = "";

    meowData.forEach((phrase) => {
      let word = randomSelect(phrase);
      word.forEach((syllableContainer) => {
        let primedSyllable = randomSelect(syllableContainer.at(0));
        let repeatCount = randomInt(
          syllableContainer.at(1).at(0),
          syllableContainer.at(1).at(1)
        );
        let finishedSyllable = primedSyllable.repeat(repeatCount);

        message += finishedSyllable;
      });
    });

    await interaction.reply(message);
  },
};
