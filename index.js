const yargs = require('yargs/yargs')
const {hideBin} = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const SheepApi = require("./lib/sheep-api");
const {sleep} = require("./lib/utils");
const fs = require('fs').promises;
const prompts = require('prompts');

let defaultConfig = {
    "showProfileInfo": true,
    "unlockChest": true,
    "watchChestAd": true,
    "openChest": true,
    "showGame": true,
    "loopGame": false,
    "proxy": null,
};

const ratingMode = async (accounts, builds) => {
    for (const account of accounts) {
        let config = account.config || {};
        account.api = new SheepApi(account.params, {...defaultConfig, loopGame: true, ...config});
        await account.api.init();
        let build = builds[account.build || 0];
        account.api.game.setBuild(build);
        // await Promise.all(build.cards.map((e, i) => (account.api.changeDeck(e, i+1))));
        // await Promise.all(build.cards.map((e, i) => (account.api.changeDeck(e, i+1))));

        let url, _id = null;

        if (account.api.profile.lobby) {
            url = account.api.profile.lobby.url;
            _id = account.api.profile.lobby._id || null;
        }

        if (!url) {
            url = await account.api.getWaitRoom();
        }

        account.api.game.connect(url, _id);
        await sleep(200);
    }
}

const lobbyMode = async (accounts, builds) => {
    let [account, twink] = accounts;

    account.api = new SheepApi(account.params, {...defaultConfig, ...account.config});
    twink.api = new SheepApi(twink.params, {...defaultConfig, ...twink.config});

    await account.api.init();
    await twink.api.init();

    account.api.game.setBuild(builds[account.build || 0]);
    twink.api.game.setBuild(builds[twink.build || 0]);

    //
    let url, _id = null;

    if (twink.api.profile.lobby) {
        url = twink.api.profile.lobby.url;
        _id = twink.api.profile.lobby._id || null;
    }

    if (!url) {
        let lobby = await twink.api.createLobby();
        url = lobby.url;
        _id = lobby._id || null;
    }

    console.log(`Created lobby: https://vk.com/app51491054#lobby${url}:${_id}`);
    twink.api.game.connect(url, _id);
    await sleep(2000);
    account.api.game.connect(url, _id);
}

const infoMode = async (accounts) => {
    for (const account of accounts) {
        let config = account.config || {};
        account.api = new SheepApi(account.params, {...defaultConfig, loopGame: true, ...config});
        await account.api.init();
        await sleep(200);
    }
}

(async () => {
    const response = argv.mode ? {mode: argv.mode} : await prompts([
        {
            type: 'select',
            name: 'mode',
            message: 'Pick a mode',
            choices: [
                {title: 'Rating', description: 'Starts rating matchmaking', value: 'rating'},
                {title: 'Lobby', description: 'Creates lobby and join from another account', value: 'lobby'},
                {title: 'Info', description: 'Just display account(s) info', value: 'info'},
            ],
        }
    ]);

    let builds = JSON.parse((await fs.readFile("./builds.json")).toString());
    let accounts = JSON.parse((await fs.readFile("./accounts.json")).toString());

    switch (response.mode) {
        case "rating":
            await ratingMode(accounts, builds)
            break;
        case "lobby":
            const accountsChoices = (accounts || []).map(((a) => ({
                title: `@id${a.id}`,
                description: `${a.params}`,
                value: a
            })))
            const lobbySettings = await prompts([
                {
                    type: 'multiselect',
                    name: 'lobbyAccounts',
                    message: 'Select acc',
                    choices: accountsChoices,
                    max: 2,
                    min: 2,
                    hint: '- Space to select. Return to submit. Max: 2'
                },
            ]);
            await lobbyMode(lobbySettings.lobbyAccounts, builds)
            break;
        case "info":
            await infoMode(accounts)
            break;
    }
})()