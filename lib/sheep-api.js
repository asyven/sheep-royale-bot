const axios = require('axios');
const SheepGameApi = require('./sheep-game-api');
const HttpsProxyAgent = require('https-proxy-agent');
const {chestToEmoji, unitToEmoji, createLobbyUrl} = require("./utils");

const BASE_URL = "https://pitergo.website:30000"


class SheepApi {
    constructor(token, config = {}) {
        this.id = Object.fromEntries(new URLSearchParams(token)).vk_user_id;
        this.token = token;
        this.base_url = BASE_URL;
        this.proxy = config.proxy || null;
        this.game = new SheepGameApi(token, this.id, config);
        this.profile = {};
        this.config = {...config};
    }

    async init() {
        await this.getUserProfile();
        await this.getLeaderboard();
        await this.useChest(this.config);
        await this.claimAllBonuses();
        this._printUserProfile();
    }

    async getUserProfile() {
        const profile = await this._sendRequest("/user/get");

        if (!profile.error) {
            this.profile = profile;
        }
        return profile;
    }

    async getOnline() {
        return await this._sendRequest("/user/online");
    }

    async getSeason() {
        return await this._sendRequest("/user/season");
    }

    async getLeaderboard() {
        const leaderBoard = await this._sendRequest("/user/rating");
        this.profile = {...this.profile, leaderBoard};
        return leaderBoard;
    }

    async getUsersRating(users) {
        return await this._sendRequest("/user/friendsRating", {list: users});
    }

    async getUserRating(user) {
        return await this.getUsersRating([user]);
    }

    /**
     * @param {string} bonus [daily,notificationBot,addToHomeScreen,joinChat,notificationApp,notificationBot,subGroup]
     */
    async claimBonus(bonus) {
        return await this._sendRequest("/user/Bonuses", {"methodName": bonus});
    }

    async claimAllBonuses() {
        let list = ["daily", "notificationBot", "addToHomeScreen", "joinChat", "notificationApp", "notificationBot", "subGroup"];
        if (typeof this.profile?.bonuses != "undefined") {
            for (let [bonusType, status] of Object.entries(this.profile.bonuses)) {
                if (status != true && (status === false || new Date().getTime() > status)) {
                    console.log(await this.claimBonus(bonusType).catch(console.log));
                }
            }
        } else {
            for (const bonusType of list) {
                console.log(await this.claimBonus(bonusType));
            }
        }
    }

    async createLobby() {
        return await this._sendRequest("/lobby/create", {ignoreChatId: 1});
    }

    async createLobbyUrl() {
        let {url, _id} = await this.createLobby();
        return createLobbyUrl({url, _id});
    }

    async changeCard(entity, position) {
        return await this._sendRequest("/user/replaceCard", {entity, position});
    }

    async changeDeck(cards) {
        if (!this.profile.deck) return;
        
        let currentDeck = this.profile.deck.map((e)=> (e?.entity || null))
        let cardsToReplace = cards.filter(c => currentDeck.includes(c));
        
        await Promise.all(cardsToReplace.map((e, i) => (this.changeCard(e, i + 1))));
        await Promise.all(cardsToReplace.map((e, i) => (this.changeCard(e, i + 1))));
    }

    async unlockChest(index) {
        return await this._sendRequest("/user/unlockChest", {index});
    }

    async watchChestAd(index) {
        return await this._sendRequest("/user/watchAd", {index});
    }

    async openChest(index) {
        return await this._sendRequest("/user/openChest", {index});
    }

    async useChest(config) {
        if (!this.profile || !(this.profile || {}).chests) {
            return;
        }

        // console.log(this.profile.chests);

        let {unlockChest, watchChestAd, openChest} = config;

        let openingChestIndex = this.profile.chests.findIndex((chest) => chest && chest.status === "opening");

        for (let [index, chest] of Object.entries(this.profile.chests)) {
            if (!chest) continue;
            index = Number(index);

            if (openingChestIndex === -1 && unlockChest) {
                await this.unlockChest(index);
                openingChestIndex = index;
            }

            if (openingChestIndex !== -1 && openingChestIndex === index) {
                if (watchChestAd) {
                    for (let i = 0; i < 3 - chest.adWatchedTimes || 0; i++) {
                        await this.watchChestAd(index);
                    }
                }

                if (openChest && chest.willOpenAt <= 0) {
                    await this.openChest(index);
                    await this.getUserProfile();
                    await this.useChest(config);
                }
            }
        }
    }

    async getWaitRoom() {
        return await this._sendRequest("/waitRoom/get");
    }

    _sendRequest(method, params, type = "get") {
        return new Promise(async (resolve, reject) => {
            let options = {};
            if (this.proxy) {
                options = {...options, httpsAgent: new HttpsProxyAgent(this.proxy)}
            }

            let urlParams = params ? "?" + (new URLSearchParams(params)).toString() : "";

            console.log(`[${this.id}] -> ${method} ${urlParams}`);

            axios({
                method: type,
                url: this.base_url + method + urlParams,
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Authorization': this.token
                },
                ...options,
            })
                .then(function (response) {
                    resolve(response.data);
                })
                .catch(function (error) {
                    resolve({error: error.code, message: error.message});
                });
        })
    }


    _printUserProfile() {
        if (!this.profile) return;

        let {_id, balance, chests, deck, rating, stats, collection, leaderBoard} = this.profile;
        console.table({
            "👤User": `@id${_id}`,
            "💰Coins": balance,
            "📦Chests": chests.map(c => c ? `${chestToEmoji(c.type)}${c.status === "idle" ? "" : "⏱"}` : "␀").join("|"),
            // "🃏Deck": deck.map(d => d && d.entity ? `${unitToEmoji(d.entity)}` : "␀").join(" "),
            "🃏Deck": deck.map(d => d && d.entity ? `${d.entity}` : "␀").join(" "),
            "🏆Rating": `${rating} top: #${leaderBoard?.user?.position || "100+"}`,
            "📊Stats": JSON.stringify(stats),
            "📊collection": [...deck || [], ...collection || []].map(c => (!c.blocked ? unitToEmoji(c.entity) : `${c.entity} ${c.part}/4`)).join(" "),

            // "User": 
        });
    }
}

module.exports = SheepApi;