module.exports = (client) => {
    console.log('EVENT LOADED'); // ← 이거 먼저 찍혀야 함

    client.on('interactionCreate', async (interaction) => {
        console.log('INTERACTION FIRED');
    });
};
