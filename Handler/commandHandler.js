    const fs = require('node:fs');
    const path = require('node:path');
    const { REST, Routes } = require('discord.js');
    require('dotenv').config();

    module.exports = async (client) => {
        const commandsPath = path.join(__dirname, '../commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        const commandsData = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commandsData.push(command.data.toJSON());
            } else {
                console.log(`${filePath}에 data || execute 미포함`)
            }
        }
        const rest = new REST({ version: '10'}).setToken(process.env.DSC_T);
        try {
            console.log('슬래시 커맨드 등록중');
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {body:commandsData},
            )
        } catch (error) {
            console.log('슬래시 커맨드 등록중 오류발생', error);
        }
        console.log('커맨드 등록 완료');
    }