const Discord = require("discord.js"); // discord.js!
require("dotenv").config(); // get the config file
const fs = require("node:fs"); // filesystem access
const path = require("node:path"); // path stuff
const WebSocket = require("ws"); // websocket
const { createCanvas } = require("@napi-rs/canvas"); // canvas
const request = require("request"); // request for downloading files

const Intents = Discord.GatewayIntentBits;

function splitStringIntoChunks(str, chunkSize) {
  const regex = new RegExp(`.{1,${chunkSize}}`, "g");
  return str.match(regex);
}

const client = new Discord.Client({
  intents: [Intents.Guilds, Intents.GuildMessages, Intents.MessageContent],
});

// Initialize client.commands as a Discord Collection
client.commands = new Discord.Collection();

let connectedws = 0; // amount of connected websockets
let usernameSet = false; // Flag to track if the username has been set
let autoUpdateIcon = true; // Flag to toggle server icon updates

async function setRandomProfilePicture() {
  try {
    const pfpsPath = path.join(__dirname, "pfps");
    const files = fs
      .readdirSync(pfpsPath)
      .filter((file) => file.endsWith(".png"));

    if (files.length === 0) {
      console.error("No PNG files found in the pfps folder.");
      return;
    }

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = path.join(pfpsPath, randomFile);

    await client.user.setAvatar(filePath);
    console.log(`Profile picture updated to: ${randomFile}`);

    const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
    const channel = await client.channels.fetch(channelId);

    channel.send("Updated profile picture!");
  } catch (error) {
    console.error("Failed to update profile picture:", error);
  }
}

async function toggleIconUpdates(interaction) {
  if (
    !interaction.member.permissions.has(
      Discord.PermissionsBitField.Flags.Administrator
    )
  ) {
    await interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  autoUpdateIcon = !autoUpdateIcon;
  const status = autoUpdateIcon ? "enabled" : "disabled";
  await interaction.reply(`Auto-update server icon has been ${status}.`);
}

async function catifyIcon(interaction) {
  if (
    !interaction.member.permissions.has(
      Discord.PermissionsBitField.Flags.Administrator
    )
  ) {
    await interaction.reply({
      content: "You do not have permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  try {
    const pfpsPath = path.join(__dirname, "pfps");
    const files = fs
      .readdirSync(pfpsPath)
      .filter((file) => file.endsWith(".png"));

    if (files.length === 0) {
      await interaction.reply("No PNG files found in the pfps folder.");
      return;
    }

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = path.join(pfpsPath, randomFile);

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply("This command can only be used in a server.");
      return;
    }

    await guild.setIcon(filePath);
    console.log(`Server icon updated to: ${randomFile}`);
    await interaction.reply(`Server icon updated to: ${randomFile}`);
  } catch (error) {
    console.error("Failed to update server icon:", error);
    await interaction.reply("Failed to update the server icon.");
  }
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  // Set a random profile picture on startup
  await setRandomProfilePicture();

  // Schedule profile picture updates every 30 minutes
  setInterval(setRandomProfilePicture, 30 * 60 * 1000);

  const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
  const channel = await client.channels.fetch(channelId);
  channel.send("GergBot is online!");

  // set user presence
  setstatusbasedonws();

  // Auto-update server icon every 10 minutes
  setInterval(async () => {
    if (!autoUpdateIcon) return; // Skip if auto-update is disabled
    try {
      const iconUrl = "https://i3.ytimg.com/vi/rabTWiIdStA/maxresdefault.jpg";
      const iconPath = path.join(__dirname, "icon.jpg");

      // Download the icon
      const download = (uri, filename) =>
        new Promise((resolve, reject) => {
          request.head(uri, (err, res) => {
            if (err) return reject(err);
            request(uri)
              .pipe(fs.createWriteStream(filename))
              .on("close", resolve)
              .on("error", reject);
          });
        });

      await download(iconUrl, iconPath);
      console.log("Downloaded icon.jpg");

      // Update the server icon
      await channel.guild.setIcon(iconPath);
      console.log("Server icon updated successfully.");
      channel.send("Auto-updated server icon!");
    } catch (error) {
      console.error("Failed to update server icon:", error);
      channel.send("Failed to auto-update the server icon.");
    }
  }, 10 * 60 * 1000); // 10 minutes in milliseconds

  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`command at ${filePath} is broken or misplaced.`);
      }
    }
  }
});

client.on(Discord.Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  // Handle the toggleicon command
  if (interaction.commandName === "toggleicon") {
    await toggleIconUpdates(interaction);
    return;
  }

  // Handle the catifyicon command
  if (interaction.commandName === "catifyicon") {
    await catifyIcon(interaction);
    return;
  }

  // console.log(command);

  if (command.data.name === "snapshot") {
    try {
      buffer = renderCanvas();
      const file = new Discord.AttachmentBuilder(buffer);
      if (interaction.channel.id == process.env.BOT_COMMANDS_CHANNEL_ID) {
        await interaction.reply({
          content: "Snapshot succeeded!",
          files: [file],
        });
      } else {
        // send it in the bot commands channel if it isnt already
        const botCommands = await client.channels.fetch(
          process.env.BOT_COMMANDS_CHANNEL_ID
        );
        botCommands.send({
          content: `<@${interaction.user.id}> Snapshot succeeded!\n-# Please use this channel for snapshots in the future.`,
          files: [file],
        });
        await interaction.reply({
          content: `Please use <#${process.env.BOT_COMMANDS_CHANNEL_ID}> in the future.`,
          flags: Discord.MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: Discord.MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: Discord.MessageFlags.Ephemeral,
        });
      }
    }
  } else {
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }
});

function setstatusbasedonws() {
  try {
    connectedws = (ws.readyState == 1 ? 1 : 0) + (ssws.readyState == 1 ? 1 : 0);
    if (connectedws == 0) {
      client.user.setPresence({
        activities: [
          {
            name: "over Youtube Draws",
            type: Discord.ActivityType.Watching,
          },
        ],
        status: Discord.PresenceUpdateStatus.DoNotDisturb,
      });
    } else if (connectedws == 1) {
      client.user.setPresence({
        activities: [
          {
            name: "over Youtube Draws",
            type: Discord.ActivityType.Watching,
          },
        ],
        status: Discord.PresenceUpdateStatus.Idle,
      });
    } else if (connectedws == 2) {
      client.user.setPresence({
        activities: [
          {
            name: "over Youtube Draws",
            type: Discord.ActivityType.Watching,
          },
        ],
        status: Discord.PresenceUpdateStatus.Online,
      });
    }
    console.log("Set status to " + connectedws);
  } catch (err) {
    console.log("Failed to set status.\n" + err);
  }
}

// chat forwarding
let ip = Math.floor(Math.random() * 1000); // random ip to reduce spam when logging in
var ws;

function connectWebSocket() {
  usernameSet = false;

  ws = new WebSocket(process.env.FORWARDING_WEBSOCKET_URL, {
    headers: {
      // secret sauce
      "X-Forwarded-For": ip,
      "X-Real-Ip": ip,
      Ip: ip,
    },
  }); // Replace with your WebSocket URL

  // Handle WebSocket connection open
  ws.on("open", async () => {
    // connectedws++;
    setstatusbasedonws();

    console.log("WebSocket connection established.");

    const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
    const channel = await client.channels.fetch(channelId);
    channel.send("Chat websocket connected.");
  });

  // Handle incoming WebSocket messages
  ws.on("message", async (data) => {
    console.log("WebSocket message received:", data);

    try {
      // Parse the incoming data as JSON
      const parsedData = JSON.parse(data);

      if (
        parsedData.type === "chat_message" &&
        parsedData.username !== process.env.FORWARDING_USERNAME &&
        usernameSet
      ) {
        if (!parsedData.message.startsWith("!")) {
          // Remove color codes (e.g., &l, &b, &d, etc.) from the username
          const cleanedUsername = parsedData.username.replace(
            /&[a-z0-9]/gi,
            ""
          );

          // Remove color codes from the message
          parsedData.message = parsedData.message.replace(/&[a-z0-9]/gi, "");

          // Remove @ pings from the message
          parsedData.message = parsedData.message.replace(/@/g, "@​");

          // Add a backslash before Discord formatting characters
          parsedData.message = parsedData.message.replace(/([_*~`])/g, "\\$1");

          // Construct the cleaned message
          const cleanedMessage = `${cleanedUsername}: ${parsedData.message}`;

          // Send the cleaned message to a specific Discord channel
          const channelId = process.env.FORWARDING_CHANNEL_ID; // Replace with your Discord channel ID
          const channel = await client.channels.fetch(channelId);

          if (channel && channel.isTextBased()) {
            channel.send(cleanedMessage);
          } else {
            console.error("Failed to fetch the channel or send a message.");
          }
        } else {
          console.log("Command found!");
          payload = {};
          if (
            parsedData.message ==
            process.env.NON_DISCORD_COMMAND_PREFIX + "discord"
          ) {
            payload = {
              type: "chat_message",
              message: process.env.DISCORD_LINK,
            };
          } else {
            payload = {
              type: "chat_message",
              message: "That command does not exist!",
            };
          }
          try {
            ws.send(JSON.stringify(payload));
          } catch (err) {
            console.log("An error occurred trying to run a command.\n" + err);
          }
        }
      } else if (parsedData.type === "chat_message" && !usernameSet) {
        console.log("Message withheld because username is not set.");
      } else if (parsedData.type === "system_message") {
        console.log("System message received:", parsedData.message);
        // Handle system messages if needed
        const channelId = process.env.FORWARDING_CHANNEL_ID; // Replace with your Discord channel ID
        const channel = await client.channels.fetch(channelId);
        parsedData.message = parsedData.message.replace(/&[a-z0-9]/gi, "");
        channel.send("**" + parsedData.message + "**"); // send system message and make it bold
      } else if (parsedData.type === "change_username") {
        console.log("Setting username...");
        const username = process.env.FORWARDING_USERNAME; // Replace with your desired username
        const payload = JSON.stringify({
          type: "change_username",
          username: username,
        });
        ws.send(payload);
        console.log("Username set:", username);
        usernameSet = true;
      } else {
        console.log("Unhandled message type:", parsedData.type);
      }
    } catch (error) {
      console.error("Failed to process WebSocket message:", error);
    }
  });

  // Handle WebSocket errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  // Handle WebSocket close
  ws.on("close", async () => {
    // connectedws--;
    setstatusbasedonws();
    console.log("WebSocket connection closed. Attempting to reconnect...");

    const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      channel.send("Chat websocket disconnected.");
    }

    setTimeout(connectWebSocket, 5000); // Adjust the delay as needed
  });
}

client.once(Discord.Events.ClientReady, () => {
  connectWebSocket();
});

client.on(Discord.Events.MessageCreate, async (message) => {
  // Ignore messages from the bot itself
  if (message.author.bot) return;

  // Check if the bot is mentioned
  if (message.mentions.has(client.user)) {
    try {
      const meowCommand = client.commands.get("meow");
      if (meowCommand) {
        // Simulate interaction for the /meow command
        await meowCommand.execute({
          reply: async (response) => {
            await message.reply({
              content: response,
              allowedMentions: { parse: [] }, // Disable pings
            });
          },
        });
      }
    } catch (error) {
      console.error("Failed to execute /meow command on mention:", error);
    }
  }

  // Specify the channel ID to listen for messages
  const forwardingChannelId = process.env.FORWARDING_CHANNEL_ID; // Replace with your Discord channel ID

  // Check if the message is from the specified channel
  if (message.channel.id === forwardingChannelId) {
    try {
      let messageContent = "";

      let roles = [];
      // Get topmost role and check it against the roles.json file
      const rolesFilePath = path.join(__dirname, "roles.json");
      const rolesData = JSON.parse(fs.readFileSync(rolesFilePath, "utf8"));
      const userRoles = message.member.roles.cache.map((role) => role.id);
      const topRole = message.member.roles.highest;

      // Check if the top role is in the roles.json file
      if (rolesData[topRole.id.toString()]) {
        roles.push(rolesData[topRole.id.toString()]);
      }

      // Recursively add roles below the top role if the include next flag is set to true
      let currentRole = topRole;
      while (rolesData[currentRole.id.toString()]?.send_next) {
        const nextRole = message.member.roles.cache
          .filter((role) => role.position < currentRole.position)
          .sort((a, b) => b.position - a.position)
          .first();

        if (nextRole && rolesData[nextRole.id]) {
          roles.push(rolesData[nextRole.id]);
          currentRole = nextRole;
        } else {
          break;
        }
      }

      // Construct the message content
      messageContent += "&r"; // Reset color codes
      // Add roles with colors

      roles.forEach((role) => {
        messageContent += `[${role.color}${role.name}&r] `;
      });

      // Add topmost role color
      messageContent += roles[0].color;

      // fix message content to avoid running slash commands
      message.content = message.content.replace(/\//g, "/‍");

      messageContent += message.member.displayName + "&r: " + message.content;

      // Split up the message
      messageContent = splitStringIntoChunks(messageContent, 98);
      messageContent.forEach((i, j) => {
        if (j !== 0) {
          messageContent[j] = "&f" + i;
        }
      });

      // Forward the message content to the WebSocket server
      messageContent.forEach((i) => {
        const payload = JSON.stringify({
          type: "chat_message",
          message: i,
        });

        ws.send(payload); // Send the message to the WebSocket server
        console.log("Message forwarded to WebSocket:", payload);
      });

      // Add check mark reaction to the message
      await message.react("✅");
    } catch (error) {
      console.error("Failed to forward message to WebSocket:", error);
    }
  }
});

// Silly /snapshot comand to take a snapshot of the canvas
const CANVAS_WIDTH = 192;
const CANVAS_HEIGHT = 108;

const colors = [
  "#FFFFFF",
  "#E4E4E4",
  "#888888",
  "#222222",
  "#FFA7D1",
  "#E50000",
  "#E59500",
  "#A06A42",
  "#E5D900",
  "#94E044",
  "#02BE01",
  "#00D3DD",
  "#0083C7",
  "#0000EA",
  "#CF6EE4",
  "#820080",
];

const uri = process.env.SNAPSHOT_WEBSOCKET_URL;

let ssws;

let canvasState = [];

for (let i = 0; i < CANVAS_WIDTH; i++) {
  canvasState[i] = [];
  for (let j = 0; j < CANVAS_HEIGHT; j++) {
    canvasState[i][j] = 0;
  }
}

function renderCanvas() {
  const canvas = createCanvas(CANVAS_WIDTH * 10, CANVAS_HEIGHT * 10);
  const ctx = canvas.getContext("2d");

  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      let color = canvasState[x][y];
      color = colors[color];

      ctx.fillStyle = color;
      ctx.fillRect(x * 10, y * 10, 10, 10);
    }
  }

  const buffer = canvas.toBuffer("image/png");
  // fs.writeFileSync('canvas.png', buffer);
  return buffer;
}

function connectSnapShotWebSocket() {
  ssws = new WebSocket(uri);
  ssws.binaryType = "arraybuffer";

  ssws.on("open", async () => {
    // connectedws++;
    setstatusbasedonws();

    console.log(`Snapshot Websocket Connected`);

    const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
    const channel = await client.channels.fetch(channelId);
    channel.send("Snapshot websocket connected.");
  });

  ssws.on("close", async () => {
    // connectedws--;
    setstatusbasedonws();

    console.log(`Snapshot WebSocket Disconnected, Reconnecting...`);

    const channelId = process.env.STATUS_CHANNEL_ID; // Replace with your Discord channel ID
    const channel = await client.channels.fetch(channelId);
    if (channel && channel.isTextBased()) {
      channel.send("Snapshot websocket disconnected.");
    }

    setTimeout(connectSnapShotWebSocket, 1500); // Reconnect after a delay
  });

  ssws.on("error", (error) => {
    console.error(`Snapshot Websocket Error: ${error.message}`);
    try {
      ssws.close();
    } catch (error) {
      console.error(`Snapshot Websocket Close Error: ${error.message}`);
    }
  });

  ssws.on("message", (data) => {
    const decoded = new Uint16Array(data);

    if (decoded.byteLength > 6) {
      let ind = 0;
      for (let i = 0; i < CANVAS_WIDTH; i++) {
        for (let j = 0; j < CANVAS_HEIGHT; j++) {
          canvasState[i][j] = decoded[ind++];
        }
      }
      // renderCanvas();
    } else {
      canvasState[decoded[0]][decoded[1]] = decoded[2];
      console.log("(" + decoded[0] + "," + decoded[1] + "): " + decoded[2]);
    }
  });
}

client.once(Discord.Events.ClientReady, () => {
  console.log("Connecting to WebSocket...");
  connectSnapShotWebSocket();
  console.log("WebSocket connected.");

  // Register the /toggleicon command
  const toggleIconCommand = {
    data: new Discord.SlashCommandBuilder()
      .setName("toggleicon")
      .setDescription("Toggle auto-updating the server icon every 10 minutes."),
    execute: toggleIconUpdates,
  };

  client.commands.set(toggleIconCommand.data.name, toggleIconCommand);

  // Register the /catifyicon command
  const catifyIconCommand = {
    data: new Discord.SlashCommandBuilder()
      .setName("catifyicon")
      .setDescription("Set a random cat picture as the server's icon."),
    execute: catifyIcon,
  };

  client.commands.set(catifyIconCommand.data.name, catifyIconCommand);
});

console.log("Logging in to Discord...");
client.login(process.env.TOKEN);
console.log("Discord logged in.");
