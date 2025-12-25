phina.globalize();

const version = "1.3";
const message = "操作性がよくなりました！\nドラッグして石を移動できます。"

phina.define('TitleScene', {
    superClass: 'DisplayScene',
    init: function(param/*{}*/) {
        this.superInit(param);

        const self = this;

        this.backgroundColor = "PeachPuff";

        Label({
            text: "せいち\nパズル",
            fontSize: 100,
            fill: "black",
            fontWeight: 800,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-2.5));

        Label({
            text: "version " + version,
            fontSize: 20,
            fill: "black",
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center());

        Sprite("panda").addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(2));

        Label({
            text: message,
            fontSize: 25,
            fill: "black",
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(5));

        this.on("pointstart", () => {
            self.exit("HowToScene");
        });
    },
});

phina.define('HowToScene', {
    superClass: 'DisplayScene',
    init: function(param/*{}*/) {
        this.superInit(param);

        const self = this;

        this.backgroundColor = "PeachPuff";

        Label({
            text: "ルール",
            fontSize: 50,
            fill: "black",
            fontWeight: 800,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-6.8));

        LabelArea({
            width: this.width - 100,
            text: "草地をブロックで区切って、長方形に整えるゲームです。\n\nただし、長方形の面積は、10の倍数にする必要があります。\n\n例外として、下の画像の3のように、少しだけ余ったものがあるのはOKです。",
            fontSize: 30,
            fill: "black",
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-3));
        
        Sprite("howto").addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(3.5));

        this.on("pointstart", () => {
            self.exit("GameScene");
        });
    },
});

phina.define('GameScene', {
    superClass: 'DisplayScene',
    init: function(param) {
        this.superInit(param);

        const self = this;

        this.backgroundColor = "white";

        let holdStonesCount = 0;

        const fieldLayer = RectangleShape({
            width: 64 * 10,
            height: 64 * 15,
            x: self.gridX.center(),
            y: self.gridY.center(),
            fill: "black",
            strokeWidth: 0,
        }).addChildTo(this);

        fieldLayer.gridX = Grid({
            width: fieldLayer.width,
            columns: 10,
            offset: fieldLayer.width / 2 * -1 + 32,
        });
        fieldLayer.gridY = Grid({
            width: fieldLayer.height,
            columns: 15,
            offset: fieldLayer.height / 2 * -1 + 32,
        });

        const effectLayer = RectangleShape({
            width: 64 * 10,
            height: 64 * 15,
            x: self.gridX.center(),
            y: self.gridY.center(),
            fill: "transparent",
            strokeWidth: 0,
        }).addChildTo(this);

        effectLayer.gridX = Grid({
            width: effectLayer.width,
            columns: 10,
            offset: effectLayer.width / 2 * -1 + 32,
        });
        effectLayer.gridY = Grid({
            width: effectLayer.height,
            columns: 15,
            offset: effectLayer.height / 2 * -1 + 32,
        });

        const holdStonesBox = RectangleShape({
            width: 200,
            height: 80,
            x: 530,
            y: 50,
            fill: "white",
            strokeWidth: 0,
        }).addChildTo(this);
        Sprite("stone").addChildTo(holdStonesBox).setPosition(-50, 0);
        Label({
            text: "×",
            fill: "black",
            fontWeight: 800,
            fontSize: 30,
        }).addChildTo(holdStonesBox).setPosition(0, 0);
        const holdStonesLabel = Label({
            text: "0",
            fill: "black",
            fontWeight: 800,
            fontSize: 40,
        }).addChildTo(holdStonesBox).setPosition(50, 0);

        // 判定ボタン
        const judgeButton = BasicButton({
            text: "判定する",
            width: 220,
            height: 50,
            primary: true,
        }).addChildTo(self).setPosition(self.gridX.center(), self.gridY.span(15));
        judgeButton.setInteractive(true);
        judgeButton.on("pointstart", function() {
            const ret = checkClearCondition();
            if (ret) {
                judgeButton.hide();
                stopButton.hide();
                App.pushScene(ClearScene1());
                self.one("resume", () => {
                    newGame();
                });
            }
        });

        // 中止ボタン
        const stopButton = BasicButton({
            text: "やめる",
            width: 100,
            height: 50,
            primary: false,
        }).addChildTo(self).setPosition(self.gridX.center(6), self.gridY.span(15));
        stopButton.setInteractive(true);
        stopButton.on("pointstart", function() {
            App.replaceScene(TitleScene());
        });

        let cells = [];

        function newGame() {
            let holdStonesCount = 0;
            judgeButton.show();
            stopButton.show();
            createProblem();
            drawField();
        }

        // cellsの値に応じて、フィールドにスプライトを配置する
        // 0: water 1: stone 2: grass
        function drawField() {
            fieldLayer.children.clear();
            for (let i = 0; i < cells.length; i++) {
                for (let j = 0; j < cells[i].length; j++) {
                    if (cells[i][j] === 0) {
                        Sprite("water").addChildTo(fieldLayer).setPosition(fieldLayer.gridX.span(j), fieldLayer.gridY.span(i));
                    } 
                    if (cells[i][j] === 1) {
                        putStone(j, i, {animation: true});
                    } 
                    if (cells[i][j] === 2) {
                        putGrass(j, i);
                    }
                }
            }
        }

        let actionType = null;

        self.on("pointstart", (e) => {
            actionType = null;
            action(e.pointer.x, e.pointer.y);
        });

        self.on("pointmove", (e) => {
            if (actionType === null) {
                return;
            }
            action(e.pointer.x, e.pointer.y);
        });

        function action(x, y) {
            // マウス座標をフィールドのセル座標に変換
            const cellX = Math.floor((x) / 64);
            const cellY = Math.floor((y) / 64);

            // fieldLayer.children.each((child) => {
            for (const child of fieldLayer.children) {
                if (child.hitTest(x, y)) {
                    if (cells[cellY][cellX] === 1) {
                        if (actionType === null) {
                            actionType = "putGrass";
                        } else if (actionType === "putStone") {
                            break;
                        }
                        child.tweener.to({x: holdStonesBox.position.x - fieldLayer.position.x, y: holdStonesBox.position.y - fieldLayer.position.y}, 200).call(() => {
                            child.remove();
                            holdStonesCount++;
                            holdStonesLabel.text = String(holdStonesCount);
                            putGrass(cellX, cellY);
                        }).play();
                    } else if (cells[cellY][cellX] === 2) {
                        if (actionType === null) {
                            actionType = "putStone";
                        } else if (actionType === "putGrass") {
                            break;
                        }

                        if (holdStonesCount === 0) {
                            if (holdStonesBox.tweener.playing) {
                                return;
                            }
                            holdStonesBox.tweener
                                .rotateTo(10, 50)
                                .rotateTo(-10, 50)
                                .rotateTo(5, 50)
                                .rotateTo(-5, 50)
                                .rotateTo(0, 50)
                                .play();
                            break;
                        }
                        holdStonesCount--;
                        holdStonesLabel.text = String(holdStonesCount);
                        putStone(cellX, cellY, {animation: true, callback: function() {child.remove();}});
                    }
                    break;
                }
            };
        }

        // 石を置く関数
        function putStone(x, y, options) {
            let kemuri = null;
            cells[y][x] = 1;
            if (options && options.animation) {
                kemuri = Sprite("kemuri").addChildTo(effectLayer).setPosition(effectLayer.gridX.span(x), effectLayer.gridY.span(y)).setScale(0.3).hide();
            }
            const stone = Sprite("stone").addChildTo(fieldLayer).setPosition(holdStonesBox.position.x - fieldLayer.position.x, holdStonesBox.position.y - fieldLayer.position.y);
            stone.tweener.to({x: fieldLayer.gridX.span(x), y: fieldLayer.gridY.span(y)}, 200)
            .call(() => {
                if (options && options.animation) {
                    stone.tweener
                        .rotateTo(20, 80)
                        .rotateTo(-20, 80)
                        .rotateTo(10, 50)
                        .rotateTo(-10, 50)
                        .rotateTo(0, 30)
                        .play();
                    // stone.tweener.scaleTo(0.5, 10).scaleTo(1, 30).scaleTo(0.7, 10).scaleTo(1, 30).play();
                    kemuri.show();
                    kemuri.tweener.to({
                        scaleX: 0.6, scaleY: 0.6,
                        alpha: 0,
                    }, 2000, "easeOutCirc").call(() => {
                        kemuri.remove();
                    }).play();
                }
                if (options && options.callback) {
                    options.callback();
                }
            })
            .play();
            // stone.setInteractive(true);
            // stone.on("pointstart", () => {
            //     putGrass(x, y);
            //     stone.tweener.to({x: holdStonesBox.position.x - fieldLayer.position.x, y: holdStonesBox.position.y - fieldLayer.position.y}, 200).call(() => {
            //         stone.remove();
            //         holdStonesCount++;
            //         holdStonesLabel.text = String(holdStonesCount);
            //     }).play();
            // });
        }

        // 草を置く関数
        function putGrass(x, y, options) {
            const grass = Sprite("grass").addChildTo(fieldLayer).setPosition(fieldLayer.gridX.span(x), fieldLayer.gridY.span(y));
            cells[y][x] = 2;
            // grass.setInteractive(true);
            // grass.on("pointstart", () => {
            //     if (holdStonesCount === 0) {
            //         holdStonesBox.tweener
            //             .rotateTo(10, 50)
            //             .rotateTo(-10, 50)
            //             .rotateTo(5, 50)
            //             .rotateTo(-5, 50)
            //             .rotateTo(0, 50)
            //             .play();
            //         return;
            //     }
            //     // grass.remove();
            //     holdStonesCount--;
            //     holdStonesLabel.text = String(holdStonesCount);
            //     putStone(x, y, {animation: true, callback: function() {grass.remove();}});
            // });
        }

        // クリア条件を満たしているか
        function checkClearCondition() {

            // ホールドしている石の数が0でない場合はクリア失敗
            if (holdStonesCount !== 0) {
                App.pushScene(FailedScene1({text: "使ってないブロックが残ってるよ！\nブロックはぜんぶ使ってね！"}));
                return false;
            }

            // 値が2のセルで隣接しているセルの集合を1つのグループとして、
            // それぞれのグループにユニークなIDを割り当てた2次元配列を作成する
            function groupCells(grid) {
                const directions = [
                    [-1, 0], // 上
                    [1, 0],  // 下
                    [0, -1], // 左
                    [0, 1]   // 右
                ];
                const rows = grid.length;
                const cols = grid[0].length;
                const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
                const result = Array.from({ length: rows }, () => Array(cols).fill(0));
                let groupId = 1;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (grid[i][j] === 2 && !visited[i][j]) {
                            const queue = [[i, j]];
                            visited[i][j] = true;
                            result[i][j] = groupId;
                            while (queue.length > 0) {
                                const [x, y] = queue.shift();
                                for (const [dx, dy] of directions) {
                                    const nx = x + dx;
                                    const ny = y + dy;
                                    if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && grid[nx][ny] === 2 && !visited[nx][ny]) {
                                        queue.push([nx, ny]);
                                        visited[nx][ny] = true;
                                        result[nx][ny] = groupId;
                                    }
                                }
                            }
                            groupId++;
                        }
                    }
                }
                return result;
            }

            const groupingCells = groupCells(cells);

            console.log(groupingCells);            
            
            // グループごとに、それが長方形であるかどうかを調べて、
            // 長方形ではない場合はそのグループIDを出力する
            function findNonRectangularGroups(grid) {
                const groupCellsMap = new Map();
                const rows = grid.length;
                const cols = grid[0].length;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const groupId = grid[i][j];
                        if (!groupCellsMap.has(groupId)) {
                            groupCellsMap.set(groupId, []);
                        }
                        groupCellsMap.get(groupId).push([i, j]);
                    }
                }
                const nonRectangularGroups = [];
                for (const [groupId, cells] of groupCellsMap) {
                    if (groupId === 0) continue; // グループIDが0は無視

                    // 最小の行・列と最大の行・列を調べる
                    const minRow = Math.min(...cells.map(cell => cell[0]));
                    const maxRow = Math.max(...cells.map(cell => cell[0]));
                    const minCol = Math.min(...cells.map(cell => cell[1]));
                    const maxCol = Math.max(...cells.map(cell => cell[1]));

                    let isNonRectangular = false;

                    // 全ての行について、最小列が等しいかを調べ、
                    // 異なる場合は長方形ではないと判断する
                    for (let i = minRow; i <= maxRow; i++) {
                        const rowCells = cells.filter(cell => cell[0] === i);
                        const rowMinCol = Math.min(...rowCells.map(cell => cell[1]));
                        const rowMaxCol = Math.max(...rowCells.map(cell => cell[1]));
                        if (rowMinCol !== minCol || rowMaxCol !== maxCol) {
                            nonRectangularGroups.push(groupId);
                            isNonRectangular = true;
                            break;
                        }
                    }
                    if (isNonRectangular) continue;
                    // 全ての列について、最小行が等しいかを調べ、
                    // 異なる場合は長方形ではないと判断する
                    for (let j = minCol; j <= maxCol; j++) {
                        const colCells = cells.filter(cell => cell[1] === j);
                        const colMinRow = Math.min(...colCells.map(cell => cell[0]));
                        const colMaxRow = Math.max(...colCells.map(cell => cell[0]));
                        if (colMinRow !== minRow || colMaxRow !== maxRow) {
                            nonRectangularGroups.push(groupId);
                            isNonRectangular = true;
                            break;
                        }
                    }
                    if (isNonRectangular) continue;
                }

                return nonRectangularGroups;
            }

            const nonRectangularGroups = findNonRectangularGroups(groupingCells);

            console.log("nonRectangularGroups", nonRectangularGroups);

            // グループの個数を求める
            function countGroups(grid) {
                const groupIds = new Set();
                const rows = grid.length;
                const cols = grid[0].length;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        if (grid[i][j] === 0) continue;
                        groupIds.add(grid[i][j]);
                    }
                }
                return groupIds.size;
            }

            // グループが１つしかなく、それが長方形ではない場合はクリア失敗
            if (countGroups(groupingCells) === 1 && nonRectangularGroups.length > 0) {
                App.pushScene(FailedScene1({text: "まだ長方形になっていないみたい。\n長方形を作ってみてね！"}));
                return false;
            }

            // 長方形でないグループが複数ある場合はクリア失敗
            if (nonRectangularGroups.length > 1) {
                App.pushScene(FailedScene1({text: "まだ長方形になっていないみたい。\n長方形を作ってみてね！"}));
                return false;
            }

            // グループごとに、セルの数を数えて、
            // セルの数が10の倍数でないグループIDを出力する
            function findNonMultipleOfTenGroups(grid) {
                const groupCounts = new Map();
                for (let i = 0; i < grid.length; i++) {
                    for (let j = 0; j < grid[0].length; j++) {
                        const groupId = grid[i][j];
                        // グループIDが0は無視
                        if (groupId === 0) continue;
                        if (!groupCounts.has(groupId)) {
                            groupCounts.set(groupId, 0);
                        }
                        groupCounts.set(groupId, groupCounts.get(groupId) + 1);
                    }
                }
                const nonMultipleOfTenGroups = [];
                for (const [groupId, count] of groupCounts) {
                    if (count % 10 !== 0) {
                        nonMultipleOfTenGroups.push(groupId);
                    }
                }
                return nonMultipleOfTenGroups;
            }
            const nonMultipleOfTenGroups = findNonMultipleOfTenGroups(groupingCells);

            console.log("nonMultipleOfTenGroups", nonMultipleOfTenGroups);

            // セルの数が10の倍数でないグループが複数ある場合はクリア失敗
            if (nonMultipleOfTenGroups.length > 1) {
                App.pushScene(FailedScene1({text: "長方形の面積は１０の倍数にしてね！"}));
                return false;
            }

            // セルの数が10の倍数でないグループが１つだけで、そのセルの数が10以上の場合はクリア失敗
            if (nonMultipleOfTenGroups.length === 1) {
                const targetGroupId = nonMultipleOfTenGroups[0];
                const cellCount = countCellsInGroup(groupingCells, targetGroupId);
                if (cellCount >= 10) {
                App.pushScene(FailedScene1({text: "面積が１０の倍数ではない長方形は\nもっと小さく分割しよう！"}));
                    return false;
                }
            }


            // 指定されたグループIDのセルの個数を返す
            function countCellsInGroup(grid, targetGroupId) {
                let count = 0;
                for (let i = 0; i < grid.length; i++) {
                    for (let j = 0; j < grid[0].length; j++) {
                        if (grid[i][j] === targetGroupId) {
                            count++;
                        }
                    }
                }
                return count;
            }

            // グループごとに、グループの中心座標とセルの個数を返す
            function getGroupInfo(grid) {
                const groupInfo = new Map();
                const rows = grid.length;
                const cols = grid[0].length;
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const groupId = grid[i][j];
                        // グループIDが0は無視
                        if (groupId === 0) continue;
                        if (!groupInfo.has(groupId)) {
                            groupInfo.set(groupId, { center: [0, 0], cellCount: 0 });
                        }
                        groupInfo.get(groupId).center[0] += i;
                        groupInfo.get(groupId).center[1] += j;
                        groupInfo.get(groupId).cellCount += 1;
                    }
                }
                for (const [groupId, info] of groupInfo) {
                    info.center[0] = info.center[0] / info.cellCount;
                    info.center[1] = info.center[1] / info.cellCount;
                }
                return groupInfo;
            }
            const groupInfo = getGroupInfo(groupingCells);
            console.log("groupInfo", groupInfo);

            // 各グループの中心に、セルの個数をLabelで表示する
            for (const [groupId, info] of groupInfo) {
                const label = new Label({
                    text: String(info.cellCount),
                    x: fieldLayer.gridX.span(info.center[1]),
                    y: fieldLayer.gridY.span(info.center[0]),
                    fill: "white",
                    fontSize: 120,
                    fontWeight: "bold",
                    stroke: "black",
                    strokeWidth: 20,
                });
                label.addChildTo(fieldLayer);

            }


            return true;
        }


        // 問題を作る
        function createProblem() {
            // ベースとなるフィールドを作成
            cells = [
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,2,2,2,2,2,2,2,2,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
            ];

            // 上辺にランダムに凸凹を作成
            for (let x = 1; x < 9; x++) {
                if (Math.random() < 0.5) {
                    cells[2][x] = 2;
                }
            }

            // 下辺にランダムに凸凹を作成
            for (let x = 1; x < 9; x++) {
                if (Math.random() < 0.5) {
                    cells[12][x] = 2;
                }
            }

            // 左辺にランダムに凸凹を作成
            for (let y = 3; y < 12; y++) {
                if (Math.random() < 0.5) {
                    cells[y][0] = 2;
                }
            }

            // 右辺にランダムに凸凹を作成
            for (let y = 3; y < 12; y++) {
                if (Math.random() < 0.5) {
                    cells[y][9] = 2;
                }
            }

            // まれに左辺に切り込みを入れる
            if (Math.random() < 0.3) {
                cells[8][0] = 0;
                cells[8][1] = 0;
                cells[8][2] = 0;
                cells[8][3] = 0;
            }

            // まれに右辺に切り込みを入れる
            if (Math.random() < 0.3) {
                cells[8][9] = 0;
                cells[8][8] = 0;
                cells[8][7] = 0;
            }

            // ごくまれに上辺に切り込みを入れる
            if (Math.random() < 0.2) {
                cells[2][5] = 0;
                cells[3][5] = 0;
                cells[4][5] = 0;
                cells[5][5] = 0;
            }

            // ごくまれに下辺に切り込みを入れる
            if (Math.random() < 0.2) {
                cells[10][5] = 0;
                cells[11][5] = 0;
                cells[12][5] = 0;
            }

            // 水に隣接している草地を石に変換
            for (let y = 1; y < cells.length - 1; y++) {
                for (let x = 0; x < cells[y].length; x++) {
                    if (cells[y][x] === 2) {
                        if (cells[y-1][x] === 0 || cells[y+1][x] === 0 || cells[y][x-1] === 0 || cells[y][x+1] === 0) {
                            cells[y][x] = 1;
                        }
                    }
                }
            }

            // 草地の20％を石に変換
            for (let y = 0; y < cells.length; y++) {
                for (let x = 0; x < cells[y].length; x++) {
                    if (cells[y][x] === 2) {
                        if (Math.random() < 0.2) {
                            cells[y][x] = 1;
                        }
                    }
                }
            }

        }

        newGame();
    }


});

// 汎用ボタン
phina.define('BasicButton', {
    superClass: 'RectangleShape',
    init: function(param) {
        const self = this;
        this.superInit({
            width: param.width,
            height: param.height,
            fill: "white",
            cornerRadius: 8,
            strokeWidth: 8,
            stroke: "black",
        });
        const label = Label({
            text: param.text,
            fontSize: 25,
            fontWeight: 800,
        }).addChildTo(self);
        self.setInteractive(true);

        if (param.primary) {
            this.strokeWidth = 11;
        }

        self.disable = function () {
            self.stroke = "gray";
            label.fill = "gray";
        };

        self.enable = function () {
            self.stroke = "black";
            label.fill = "black";
        };
    },
});

phina.define('FailedScene1', {
    superClass: 'DisplayScene',
    init: function(param) {
        this.superInit(param);
        const self = this;

        RectangleShape({
            width: this.width,
            height: this.height,
            fill: "rgba(0, 0, 0, 0.7)",
            strokeWidth: 0,
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center());

        LabelArea({
            width: this.width - 50,
            text: param.text,
            // text: "使ってないブロックが残ってるよ！\nブロックはぜんぶ使ってね！",
            fontSize: 32,
            fill: "white",
            fontWeight: 800,
            stroke: "black",
            strokeWidth: 10,
            align: "center",
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center());

        Sprite("panda").addChildTo(this).setPosition(this.gridX.center(), this.gridY.center());

        this.on("pointstart", () => {
            self.exit();
        });

    },
});

phina.define('ClearScene1', {
    superClass: 'DisplayScene',
    init: function(param) {
        this.superInit(param);
        const self = this;

        self.backgroundColor = "rgba(255, 255, 255, 0.7)";

        const label = LabelArea({
            width: this.width - 50,
            text: "CLEAR!!",
            fontSize: 120,
            fill: "white",
            fontWeight: 800,
            stroke: "black",
            strokeWidth: 30,
            align: "center",
        }).addChildTo(this).setPosition(this.gridX.center(), this.gridY.center(-1));

        const panda = Sprite("panda").addChildTo(this).setPosition(this.gridX.center(), this.gridY.center());

        this.on("pointstart", () => {
            nextStage();
        });

        function nextStage() {
            self.backgroundColor = "transparent";
            label.remove();
            panda.remove();

            // 次の問題
            const nextStageButton = BasicButton({
                text: "次の問題へ",
                width: 220,
                height: 50,
                primary: true,
            }).addChildTo(self).setPosition(self.gridX.center(), self.gridY.span(15));
            nextStageButton.setInteractive(true);
            nextStageButton.on("pointstart", function() {
                self.exit();
            });
        }

    },
});

ASSETS = {
    image: {
        "water": "water.png",
        "grass": "grass.png",
        "stone": "stone.png",
        "panda": "panda.png",
        "howto": "howto.png",
        "kemuri": "kemuri.png",
    }
};

phina.main(function() {
    App = GameApp({
        assets: ASSETS,
        startLabel: 'TitleScene',
        scenes: [
            {
                label: 'TitleScene',
                className: 'TitleScene',
            },
            {
                label: 'HowToScene',
                className: 'HowToScene',
            },
            {
                label: 'GameScene',
                className: 'GameScene',
            },
        ],
    });

    App.fps = 60;

    App.run();

});
