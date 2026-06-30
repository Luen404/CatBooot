const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

module.exports = async (client) => {
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    const commandsData = [];

    //~for (const file of commandFiles) {
        //const filePath = path.join(commandsPath, file);
        //const command = require(filePath);

        //if ('data' in command && 'execute' in command) {
            //client.commands.set(command.data.name, command);
            //commandsData.push(command.data.toJSON());
        //} else {
            //console.log(`${filePath}에 data || execute 미포함`);
        //}
    //}
    for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (!command.data || !command.execute) continue;

    const json = command.data.toJSON();

    if (!json.name || !json.description) {
        console.log('❌ 잘못된 커맨드:', file, json);
        continue;
    }

    console.log('✅ 정상:', json.name);

    commandsData.push(json);
}

    const rest = new REST({ version: '10' }).setToken(process.env.DSC_T);

    console.log('슬래시 커맨드 등록 시작');
try {
    const res = await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commandsData },
    );

    console.log('등록 완료!');
    console.log(res);
} catch (error) {
    console.log('에러 발생:', error);
}
}