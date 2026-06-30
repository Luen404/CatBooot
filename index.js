const { Client, Collection, Events, GatewayIntentBits, IntentsBitField } = require('discord.js');
const client = new Client({intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
]});
require('dotenv').config()

client.commands = new Collection();

require('./Handler/eventHandler')(client);

client.login(process.env.DSC_T);