const { SlashCommandBuilder } = require("discord.js");
var fs = require("fs"),
  request = require("request");

var download = function (uri, filename, callback) {
  request.head(uri, function (err, res, body) {
    console.log("content-type:", res.headers["content-type"]);
    console.log("content-length:", res.headers["content-length"]);

    request(uri).pipe(fs.createWriteStream(filename)).on("close", callback);
  });
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("updateicon")
    .setDescription("Updates the icon of the server."),
  async execute(interaction) {
    download(
      "https://i3.ytimg.com/vi/rabTWiIdStA/maxresdefault.jpg",
      "icon.jpg",
      function () {
        console.log("downloaded icon.jpg");
        interaction.guild.setIcon("icon.jpg").then(() => {
          interaction.reply("Icon set successfully.");
        });
      }
    );
  },
};
