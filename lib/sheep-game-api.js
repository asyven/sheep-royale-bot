const connect = require("./socket-io-core");
const {sleep, getUnitSize, unitToEmoji, createLobbyUrl} = require("./utils");

const CHECK_TIMER_DELAY = 120;

class SheepGameApi {
    constructor(token, id, config = {}) {
        this.id = id;
        this.token = token;
        this.proxy = config.proxy || null;
        this.connection = null;
        this.plaingTimer = null;
        this.state = {
            team: 0, line: 275,
        };
        this.loseGame = false;
        this.phase = null;

        this.initBuild = null;
        this.build = {
            deck: [], structure: [], def: {units: []}, push: {units: []},
        };

        this.config = {...config}
    }

    connect(url, lobby) {
        if (this.connection && this.connection.connected) {
            this.connection.removeAllListeners()
            this.disconnect();
            this.state = {
                team: 0, line: 275,
            };
        }

        console.log(`[${this.id}] Connecting to lobby: ${createLobbyUrl(url)}`)
        let socketUrl = url.replace("https", "wss");
        this.connection = connect(socketUrl.replace("https", "wss"), this.proxy, {
            auth: {params: this.token},
        });

        this.addListeners(url, lobby);
    }

    setBuild(build) {
        this.initBuild = build;
    }

    sync() {
        this.connection.emit("extraSync");
    }

    joinLobby(id) {
        this.connection.emit("lobbyJoin", id);
    }

    spawnUnit(unit, position) {
        if (!position) {
            this.connection.emit("spawnUnit", unit);
            return;
        }

        this.connection.emit("spawnUnit", unit, position);
    }

    disconnect() {
        if (this.plaingTimer) {
            clearInterval(this.plaingTimer);
            this.plaingTimer = null;
        }

        if (this.connection.connected) {
            this.connection.disconnect();
        }

        this.connection = null;
    }

    addListeners(url, lobby) {
        this.connection.on('connect', async (...args) => {
            // console.log(`[${this.id}] Connected to the game`);
            if (lobby) {
                this.joinLobby(lobby);
            }
        });

        this.connection.on('disconnect', async (data) => {
            console.log(`[${this.id}] disconnect`, data);
            this.disconnect();
        });

        this.connection.on('close', async (data) => {
            console.log(`[${this.id}] closing...`, data);
            this.disconnect();
        });

        this.connection.on('error', async (data) => {
            console.log(`[${this.id}] error...`, data);
            this.disconnect();
        });

        this.connection.on("*", async (event, data) => {
            // console.log(`[${this.id}] ${event}`);
            switch (event) {
                case "extraSync":
                case "setGame":
                    this.state.users = data.users || [];
                    this.state.units = data.units || [];

                    if (!this.state.team) {
                        let me = data.users.find(({id}) => id == this.id);
                        if (me) {
                            this.state.team = me.team;
                        }

                        this.build = {...this.initBuild};
                        if (me.team === 1) {
                            this.build.structure = this.build.structure.map(([u, {x, y}]) => ([u, {
                                x: 300 - x,
                                y: 550 - y
                            }]));
                        }
                    }

                    this.state.line = ((data.units || []).find(u => u.unitType === "line") || {}).y || 275;
                    this.phase = this.getPhaseByLinePosition();

                    return;
                case "spawnUnits":
                    this.state.units = [...this.state.units || [], ...data];
                    return;
                case "gameFinished":
                    console.log(`[${this.id}] GameFinished, result: `, JSON.stringify(data));
                    if (this.config.loopGame) {
                        console.log(`[${this.id}] Finding next game...`);
                        const SheepApi = require("./sheep-api");
                        let accountApi = new SheepApi(this.token, this.config);
                        let waitRoomUrl = await accountApi.getWaitRoom();
                        this.connect(waitRoomUrl);
                        this.playGameWithBuild();
                    } else {
                        this.disconnect();
                    }
                    return;
                case "gameStarted":
                    console.log(`[${this.id}] GameStarted, redirect connection. ${createLobbyUrl(data)}`);
                    this.connect(data.url || url);
                    this.playGameWithBuild();
                    return;
            }
        });
    }

    playGameWithBuild() {
        if (this.plaingTimer) {
            clearInterval(this.plaingTimer);
            this.plaingTimer = null;
        }

        this.plaingTimer = setInterval(async () => {
            if (this.loseGame) return;
            try {
                switch (this.phase) {
                    case "build":
                        let next = this.getNextStructure();
                        if (next) {
                            let [unit, pos] = next;
                            this.spawnUnit(unit, pos);
                        }
                        break;
                    case "def":
                        this.build.def.units.map((u) => {
                            this.spawnUnit(u)
                        });
                        break;
                    case "push":
                        this.build.push.units.map((u) => {
                            this.spawnUnit(u)
                        });
                        break;
                }
                this.sync();
                if (this.config?.showGame) {
                    this._renderUnits();
                }
            } catch (e) {
                console.log(e);
            }
        }, CHECK_TIMER_DELAY);
    }


    getPhaseByLinePosition() {
        let {team, line} = this.state;
        let next = this.getNextStructure();
        let [unit, pos] = next || [];

        let defThreshold = this.build?.def?.threshold || 275;
        let defMinThreshold = this.build?.def?.minThreshold || 125;

        let pushThreshold = this.build?.push?.threshold || 275;
        let pushMinThreshold = this.build?.push?.minThreshold || 101;

        if (team == 1) {
            if (line > defThreshold && pos.y - line < defMinThreshold) {
                return "def"
            }
            if (line <= pushThreshold) {
                if (!next || pos.y - line < pushMinThreshold) {
                    return "push"
                } else {
                    return "build";
                }
            }
        }

        if (team == 2) {
            if (line < defThreshold && line - pos.y < defMinThreshold) {
                return "def"
            }
            if (line >= pushThreshold) {
                if (!next || line - pos.y < pushMinThreshold) {
                    return "push"
                } else {
                    return "build";
                }
            }
        }

        return "build";
    }

    getNextStructure() {
        for (let [sUnit, s] of this.build.structure) {
            // if (this.state.line - s.y < 25) return null;
            let alreadyOnDeck = (this.state.units || []).find((u) => {
                let {team, unitType, x, y} = u;
                if (team === this.state.team && x == s.x && y == s.y && unitType == sUnit) return true;
            });

            if (!alreadyOnDeck) return [sUnit, {x: s.x, y: s.y}];
        }
    }


    _renderUnits() {
        let board = new Array(11).fill(new Array(7).fill(null));
        board = JSON.parse(JSON.stringify(board));

        // {x: 150, y: 275, team: 1, unitType: "line", id: 1, lastUpdate: 1672441405396}
        ((this.state || {}).units || []).map(unit => {
            if (["farm", "pasture", "doubleFarm", "deadFarm"].includes(unit.unitType)) {
                let unitSize = getUnitSize(unit.unitType);

                for (let x = 0; x < unitSize[0]; x++) {
                    for (let y = 0; y < unitSize[1]; y++) {
                        let j = Math.floor((unit.x - (25 * x)) / 50);
                        let i = Math.floor((unit.y - (25 * y)) / 50);

                        if (typeof board[i] != "undefined" && typeof board[i][j] != "undefined") {
                            let emoji = unitToEmoji(unit.unitType);
                            board[i][j] = emoji;

                            if (unit.x % 50 === 0) {
                                board[i][j - 1] = emoji;
                            }

                            if (unit.y % 50 === 0) {
                                board[i - 1][j] = emoji;
                            }
                        }


                    }
                }
            }

            if (unit.unitType === "line") {
                let i = parseInt(Math.floor((unit.y - 25) / 50));
                let j = 6;
                if (typeof board[i][j] !== "undefined") {
                    board[i][j] = unitToEmoji(unit.unitType);
                }
            }
        });

        console.table(this.state.team == 1 ? board : board.reverse());
        console.log(((this.state || {}).users || []).map(u => (`@id${u.id} [${u.deck.map(d => unitToEmoji(d)).join(",")}]: ${u.balance.toFixed(0)}`)).join(" | "));
    }
}

module.exports = SheepGameApi;