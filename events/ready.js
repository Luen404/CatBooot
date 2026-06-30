const fs = require('fs');
const path = require('path');
const loadCommands = require('../Handler/commandHandler');

module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`로그인 => ${client.user.tag}`);

        const dataDir = path.join(process.cwd(), 'data');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log('data 폴더 생성');
        }

        const defaultData = {
    'Inventory.json': {},
    'Percent.json': {"items":[]},
    'PointConfig.json': {},
    'users.json': {},
    'Shop.json' : {"items":[]}
};

        for (const [file, data] of Object.entries(defaultData)) {
            const filePath = path.join(dataDir, file);

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(
                    filePath,
                    JSON.stringify(data, null, 4),
                    'utf8'
                );

                console.log(`${file} 생성`);
            }
        }

        await loadCommands(client);

        const commandData = [];

const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commandData.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.DSC_T);

(async () => {
    try {

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commandData }
        );
        console.log("성공")
    } catch (error) {
        console.log('실패', error)
        }
})();
    },
};
