phina.globalize();

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
            fill: "gray",
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
            checkClearCondition();
        });

        let cells = [[0,0,0,0,0,0,0,0,0,0],
                        [0,0,0,0,0,0,0,0,0,0],
                        [0,1,1,1,1,1,1,1,0,0],
                        [0,1,2,2,2,2,2,2,1,0],
                        [0,1,2,2,2,2,2,1,0,0],
                        [0,0,1,2,2,2,2,1,0,0],
                        [0,0,1,2,2,2,2,1,0,0],
                        [0,1,2,2,2,2,2,1,0,0],
                        [0,1,2,2,2,2,1,1,1,0],
                        [0,1,2,1,2,2,1,0,0,0],
                        [0,0,1,2,2,2,1,0,0,0],
                        [0,0,1,1,2,2,2,1,0,0],
                        [0,1,1,1,1,1,1,1,0,0],
                        [0,0,0,0,0,0,0,0,0,0],
                        [0,0,0,0,0,0,0,0,0,0],
        ];


        function newGame() {
            let holdStonesCount = 0;

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
                        putStone(j, i);
                    } 
                    if (cells[i][j] === 2) {
                        putGrass(j, i);
                    }
                }
            }
        }

        // 石を置く関数
        function putStone(x, y) {
            const stone = Sprite("stone").addChildTo(fieldLayer).setPosition(fieldLayer.gridX.span(x), fieldLayer.gridY.span(y));
            cells[y][x] = 1;
            stone.setInteractive(true);
            stone.on("pointstart", () => {
                stone.remove();
                holdStonesCount++;
                holdStonesLabel.text = String(holdStonesCount);
                putGrass(x, y);
            });
        }

        // 草を置く関数
        function putGrass(x, y) {
            const grass = Sprite("grass").addChildTo(fieldLayer).setPosition(fieldLayer.gridX.span(x), fieldLayer.gridY.span(y));
            cells[y][x] = 2;
            grass.setInteractive(true);
            grass.on("pointstart", () => {
                if (holdStonesCount === 0) {
                    holdStonesBox.tweener
                        .rotateTo(10, 50)
                        .rotateTo(-10, 50)
                        .rotateTo(5, 50)
                        .rotateTo(-5, 50)
                        .rotateTo(0, 50)
                        .play();

                    return;
                }
                grass.remove();
                holdStonesCount--;
                holdStonesLabel.text = String(holdStonesCount);
                putStone(x, y);
            });
        }

        // クリア条件を満たしているか
        function checkClearCondition() {

            // ホールドしている石の数が0でない場合はクリア失敗
            if (holdStonesCount !== 0) {
                alert("クリア失敗０！ 石をすべて使い切ってください！");
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
                alert("クリア失敗１！ 草地が長方形になっていません！");
                return false;
            }

            // 長方形でないグループが複数ある場合はクリア失敗
            if (nonRectangularGroups.length > 1) {
                alert("クリア失敗２！ 草地が長方形になっていません！");
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
                alert("クリア失敗３！ 草地のセルの数が10の倍数になっていません！");
                return false;
            }

            // セルの数が10の倍数でないグループが１つだけで、そのセルの数が10以上の場合はクリア失敗
            if (nonMultipleOfTenGroups.length === 1) {
                const targetGroupId = nonMultipleOfTenGroups[0];
                const cellCount = countCellsInGroup(groupingCells, targetGroupId);
                if (cellCount >= 10) {
                    alert("クリア失敗４！ 10の倍数になっていない領域が大きすぎます！");
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

            
            alert("クリア成功！ おめでとうございます！");
            return true;
        }


        // 問題を作る
        function createProblem() {
            // ベースとなるフィールドを作成
            cells = [
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,2,2,2,2,2,2,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0],
            ];

            // 上辺にランダムに凸凹を作成
            let topHeight = Math.floor(Math.random() * 3) + 2;
            for (let i = 0; i < topHeight; i++) {
                cells[i][Math.floor(Math.random() * 10)] = 1;
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

ASSETS = {
    image: {
        "water": "water.png",
        "grass": "grass.png",
        "stone": "stone.png",
    }
};

phina.main(function() {
    App = GameApp({
        assets: ASSETS,
        startLabel: 'GameScene',
        scenes: [
            // {
            //     label: 'TitleScene',
            //     className: 'TitleScene',
            // },
            {
                label: 'GameScene',
                className: 'GameScene',
            },
        ],
    });

    App.fps = 60;

    App.run();

});
