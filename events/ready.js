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
    },
};
