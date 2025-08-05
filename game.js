const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk';
const BOARD_COLS = 9;
const BOARD_ROWS = 10;

const initialLayout = {
    0: { 0: 'r_chariot', 1: 'r_horse', 2: 'r_elephant', 3: 'r_advisor', 4: 'r_general', 5: 'r_advisor', 6: 'r_elephant', 7: 'r_horse', 8: 'r_chariot' },
    2: { 1: 'r_cannon', 7: 'r_cannon' },
    3: { 0: 'r_soldier', 2: 'r_soldier', 4: 'r_soldier', 6: 'r_soldier', 8: 'r_soldier' },
    6: { 0: 'b_soldier', 2: 'b_soldier', 4: 'b_soldier', 6: 'b_soldier', 8: 'b_soldier' },
    7: { 1: 'b_cannon', 7: 'b_cannon' },
    9: { 0: 'b_chariot', 1: 'b_horse', 2: 'b_elephant', 3: 'b_advisor', 4: 'b_general', 5: 'b_advisor', 6: 'b_elephant', 7: 'b_horse', 8: 'b_chariot' },
};

const pieceData = {
    r_general:  { text: '帅', type: 'general',  color: 'red' }, r_advisor:  { text: '仕', type: 'advisor',  color: 'red' }, r_elephant: { text: '相', type: 'elephant', color: 'red' },
    r_horse:    { text: '傌', type: 'horse',    color: 'red' }, r_chariot:  { text: '俥', type: 'chariot',  color: 'red' }, r_cannon:   { text: '炮', type: 'cannon',   color: 'red' },
    r_soldier:  { text: '兵', type: 'soldier',  color: 'red' }, b_general:  { text: '将', type: 'general',  color: 'black' }, b_advisor:  { text: '士', type: 'advisor',  color: 'black' },
    b_elephant: { text: '象', type: 'elephant', color: 'black' }, b_horse:    { text: '馬', type: 'horse',    color: 'black' }, b_chariot:  { text: '車', type: 'chariot',  color: 'black' },
    b_cannon:   { text: '砲', type: 'cannon',   color: 'black' }, b_soldier:  { text: '卒', type: 'soldier',  color: 'black' },
};

class GameState {
    constructor(playerColor) {
        this.playerColor = playerColor;
        this.board = this.createInitialBoard();
        this.currentTurn = 'red';
        this.gameActive = true;
        this.selectedPiece = null;
        this.moveHistory = [];
    }

    createInitialBoard() {
        const board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        for (const y in initialLayout) {
            for (const x in initialLayout[y]) {
                board[y][x] = initialLayout[y][x];
            }
        }
        return board;
    }

    getPiece(x, y) { return this.board[y]?.[x]; }
    isMyTurn() { return this.gameActive && this.currentTurn === this.playerColor; }

    movePiece(from, to) {
        const movedPieceId = this.getPiece(from.x, from.y);
        const capturedPieceId = this.getPiece(to.x, to.y);
        
        this.moveHistory.push({ from, to, movedPieceId, capturedPieceId });
        
        this.board[to.y][to.x] = movedPieceId;
        this.board[from.y][from.x] = null;
        
        this.currentTurn = this.currentTurn === 'red' ? 'black' : 'red';
        return { movedPieceId, capturedPieceId };
    }
    
    undoLastMove() {
        const lastMove = this.moveHistory.pop();
        if (!lastMove) return null;
        
        this.board[lastMove.from.y][lastMove.from.x] = lastMove.movedPieceId;
        this.board[lastMove.to.y][lastMove.to.x] = lastMove.capturedPieceId;
        this.currentTurn = this.currentTurn === 'red' ? 'black' : 'red';
        return lastMove;
    }
}

class GameLogic {
    static getValidMoves(board, fromX, fromY) {
        const moves = [];
        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                if (this.isValidMove(board, fromX, fromY, x, y)) {
                    moves.push({ x, y });
                }
            }
        }
        return moves;
    }

    static isValidMove(board, fromX, fromY, toX, toY) {
        const pieceId = board[fromY][fromX];
        if (!pieceId) return false;

        const piece = pieceData[pieceId];
        const targetPieceId = board[toY][toX];
        const targetPiece = targetPieceId ? pieceData[targetPieceId] : null;

        if (targetPiece && targetPiece.color === piece.color) return false;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (piece.type) {
            case 'general':
                if (toX < 3 || toX > 5 || (piece.color === 'red' ? (toY < 7 || toY > 9) : (toY < 0 || toY > 2))) return false;
                return absDx + absDy === 1;
            case 'advisor':
                if (toX < 3 || toX > 5 || (piece.color === 'red' ? (toY < 7 || toY > 9) : (toY < 0 || toY > 2))) return false;
                return absDx === 1 && absDy === 1;
            case 'elephant':
                if (piece.color === 'red' ? toY < 5 : toY > 4) return false;
                if (absDx !== 2 || absDy !== 2) return false;
                return !board[fromY + dy / 2][fromX + dx / 2];
            case 'horse':
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                if (absDx === 2) return !board[fromY][fromX + dx / 2];
                else return !board[fromY + dy / 2][fromX];
            case 'chariot':
                if (dx !== 0 && dy !== 0) return false;
                return this.countPiecesOnPath(board, fromX, fromY, toX, toY) === 0;
            case 'cannon':
                if (dx !== 0 && dy !== 0) return false;
                const pathPieces = this.countPiecesOnPath(board, fromX, fromY, toX, toY);
                return targetPiece ? pathPieces === 1 : pathPieces === 0;
            case 'soldier':
                const forward = piece.color === 'red' ? -1 : 1;
                if (dy === forward && dx === 0) return true;
                const hasCrossedRiver = piece.color === 'red' ? fromY < 5 : fromY > 4;
                return hasCrossedRiver && dy === 0 && absDx === 1;
        }
        return false;
    }

    static countPiecesOnPath(board, x1, y1, x2, y2) {
        let count = 0;
        if (x1 === x2) {
            for (let y = Math.min(y1, y2) + 1; y < Math.max(y1, y2); y++) if (board[y][x1]) count++;
        } else {
            for (let x = Math.min(x1, x2) + 1; x < Math.max(x1, x2); x++) if (board[y1][x]) count++;
        }
        return count;
    }
    
    static isCheckmate(board) {
        let redGeneral = false, blackGeneral = false;
        board.flat().forEach(p => {
            if (p === 'r_general') redGeneral = true;
            if (p === 'b_general') blackGeneral = true;
        });
        if (!redGeneral) return { over: true, winner: 'black' };
        if (!blackGeneral) return { over: true, winner: 'red' };
        return { over: false };
    }
}

class UIRenderer {
    constructor(chessboardEl, onCellClick) {
        this.elements = {
            chessboard: chessboardEl,
            roomCode: document.getElementById('roomCode'),
            playerColor: document.getElementById('playerColor'),
            gameStatus: document.getElementById('gameStatus'),
            undoBtn: document.getElementById('undoBtn'),
            surrenderBtn: document.getElementById('surrenderBtn'),
            modal: document.getElementById('game-modal'),
            modalContent: document.getElementById('modal-content'),
        };
        this.onCellClick = onCellClick;
        this.pieceElements = {};
    }
    
    initialize(room, color) {
        this.elements.roomCode.textContent = room;
        const colorEl = this.elements.playerColor;
        if (color === 'red') {
            colorEl.innerHTML = '<i class="fa-solid fa-sun"></i>红方';
            colorEl.classList.add('red');
        } else {
            colorEl.innerHTML = '<i class="fa-solid fa-moon"></i>黑方';
            colorEl.classList.add('black');
        }
    }

    renderBoard(board) {
        this.elements.chessboard.innerHTML = '<div class="river"><span>楚 河</span><span>漢 界</span></div>';
        this.pieceElements = {};
        
        for (let y = 0; y < BOARD_ROWS; y++) {
            for (let x = 0; x < BOARD_COLS; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.left = `${(x / (BOARD_COLS - 1)) * 100}%`;
                cell.style.top = `${(y / (BOARD_ROWS - 1)) * 100}%`;
                cell.addEventListener('click', () => this.onCellClick(x, y));
                this.elements.chessboard.appendChild(cell);

                const pieceId = board[y][x];
                if (pieceId) {
                    this.createPieceElement(pieceId, x, y);
                }
            }
        }
    }
    
    createPieceElement(pieceId, x, y) {
        const pData = pieceData[pieceId];
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${pData.color}`;
        pieceEl.textContent = pData.text;
        pieceEl.style.position = 'absolute';
        this.updateElementPosition(pieceEl, x, y);
        
        this.elements.chessboard.appendChild(pieceEl);
        this.pieceElements[`${x},${y}`] = pieceEl;
        return pieceEl;
    }

    updateElementPosition(element, x, y) {
        element.style.left = `${(x / (BOARD_COLS - 1)) * 100}%`;
        element.style.top = `${(y / (BOARD_ROWS - 1)) * 100}%`;
        element.style.transform = 'translate(-50%, -50%)';
    }

    movePiece(from, to, capturedPieceId) {
        const pieceEl = this.pieceElements[`${from.x},${from.y}`];
        if (!pieceEl) return;

        pieceEl.classList.add('moving');
        const targetX = (to.x / (BOARD_COLS - 1)) * 100;
        const targetY = (to.y / (BOARD_ROWS - 1)) * 100;
        pieceEl.style.transform = `translate(calc(-50% + ${targetX - parseFloat(pieceEl.style.left)}%), calc(-50% + ${targetY - parseFloat(pieceEl.style.top)}%))`;
        
        pieceEl.addEventListener('transitionend', () => {
            pieceEl.classList.remove('moving');
            this.updateElementPosition(pieceEl, to.x, to.y);
            
            if (capturedPieceId) {
                const capturedEl = this.pieceElements[`${to.x},${to.y}`];
                if (capturedEl) capturedEl.remove();
            }
            
            delete this.pieceElements[`${from.x},${from.y}`];
            this.pieceElements[`${to.x},${to.y}`] = pieceEl;
            
            this.clearHighlights();
            this.highlightLastMove(from, to);
        }, { once: true });
    }

    updateStatus(message, type) {
        this.elements.gameStatus.textContent = message;
        this.elements.gameStatus.className = type;
    }
    
    updateButtonStates(gameState) {
        this.elements.undoBtn.disabled = !gameState.isMyTurn() || gameState.moveHistory.length === 0;
        this.elements.surrenderBtn.disabled = !gameState.gameActive;
    }
    
    clearHighlights() {
        document.querySelectorAll('.selected, .move-indicator, .last-move-highlight').forEach(el => el.remove());
    }

    highlightSelected(x, y) {
        this.clearHighlights();
        const pieceEl = this.pieceElements[`${x},${y}`];
        if(pieceEl) pieceEl.classList.add('selected');
    }

    highlightValidMoves(moves) {
        moves.forEach(move => {
            const indicator = document.createElement('div');
            indicator.className = 'move-indicator';
            const cell = document.querySelector(`.cell[style*="left: ${(move.x / (BOARD_COLS - 1)) * 100}%; top: ${(move.y / (BOARD_ROWS - 1)) * 100}%"]`);
            if (cell) cell.appendChild(indicator);
        });
    }

    highlightLastMove(from, to) {
        const fromHighlight = document.createElement('div');
        fromHighlight.className = 'last-move-highlight';
        const fromCell = document.querySelector(`.cell[style*="left: ${(from.x / (BOARD_COLS - 1)) * 100}%; top: ${(from.y / (BOARD_ROWS - 1)) * 100}%"]`);
        if(fromCell) fromCell.appendChild(fromHighlight);

        const toHighlight = document.createElement('div');
        toHighlight.className = 'last-move-highlight';
        const toCell = document.querySelector(`.cell[style*="left: ${(to.x / (BOARD_COLS - 1)) * 100}%; top: ${(to.y / (BOARD_ROWS - 1)) * 100}%"]`);
        if(toCell) toCell.appendChild(toHighlight);
    }
    
    showModal(content) {
        this.elements.modalContent.innerHTML = content;
        this.elements.modal.showModal();
    }
    
    hideModal() {
        this.elements.modal.close();
    }
}

class NetworkController {
    constructor(roomId, onMessage) {
        this.ably = new Ably.Realtime({ key: ABLY_API_KEY });
        this.channel = this.ably.channels.get(`xiangqi:${roomId}`);
        this.onMessage = onMessage;

        this.ably.connection.on('connected', () => console.log('✅ Ably connection established for game.'));
        this.ably.connection.on('failed', (err) => console.error('Ably connection failed.', err));
    }
    
    subscribe() {
        this.channel.subscribe(msg => this.onMessage(msg.name, msg.data));
    }
    
    publish(name, data) {
        this.channel.publish(name, data);
    }
}

class GameController {
    constructor() {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomId = urlParams.get('room');
        const playerColor = localStorage.getItem('xiangqi_color');
        
        if (!this.roomId || !playerColor) {
            window.location.href = 'index.html';
            return;
        }

        this.gameState = new GameState(playerColor);
        this.ui = new UIRenderer(document.getElementById('chessboard'), this.handleCellClick.bind(this));
        this.network = new NetworkController(this.roomId, this.handleNetworkMessage.bind(this));

        this.initialize();
    }

    initialize() {
        this.ui.initialize(this.roomId, this.gameState.playerColor);
        this.ui.renderBoard(this.gameState.board);
        this.network.subscribe();
        this.addEventListeners();
        this.updateGameStatus();
    }
    
    addEventListeners() {
        this.ui.elements.undoBtn.addEventListener('click', () => this.requestUndo());
        this.ui.elements.surrenderBtn.addEventListener('click', () => this.confirmSurrender());
    }

    updateGameStatus() {
        if (!this.gameState.gameActive) return;

        if (this.gameState.isMyTurn()) {
            this.ui.updateStatus('你的回合，请走棋', 'gameStatus play');
        } else {
            this.ui.updateStatus('等待对手走棋...', 'gameStatus wait');
        }
        this.ui.updateButtonStates(this.gameState);
    }
    
    handleCellClick(x, y) {
        if (!this.gameState.isMyTurn()) return;

        const pieceId = this.gameState.getPiece(x, y);
        
        if (this.gameState.selectedPiece) {
            const from = this.gameState.selectedPiece;
            const to = { x, y };

            if (from.x === to.x && from.y === to.y) {
                this.gameState.selectedPiece = null;
                this.ui.clearHighlights();
                return;
            }

            if (GameLogic.isValidMove(this.gameState.board, from.x, from.y, to.x, to.y)) {
                this.performMove(from, to, true);
            } else {
                this.gameState.selectedPiece = null;
                this.ui.clearHighlights();
            }
        } else {
            if (pieceId && pieceData[pieceId].color === this.gameState.playerColor) {
                this.gameState.selectedPiece = { x, y };
                this.ui.highlightSelected(x, y);
                const validMoves = GameLogic.getValidMoves(this.gameState.board, x, y);
                this.ui.highlightValidMoves(validMoves);
            }
        }
    }

    performMove(from, to, isLocal) {
        const { capturedPieceId } = this.gameState.movePiece(from, to);
        this.ui.movePiece(from, to, capturedPieceId);
        this.gameState.selectedPiece = null;
        
        if (isLocal) {
            this.network.publish('move', { from, to });
            const check = GameLogic.isCheckmate(this.gameState.board);
            if (check.over) {
                this.network.publish('game-over', { winner: check.winner });
                this.endGame(check.winner);
            }
        }
        
        this.updateGameStatus();
    }
    
    endGame(winner) {
        if (!this.gameState.gameActive) return;
        this.gameState.gameActive = false;
        
        const isWinner = winner === this.gameState.playerColor;
        this.ui.updateStatus(isWinner ? '你获胜了！' : '你失败了', isWinner ? 'gameStatus win' : 'gameStatus lose');
        this.ui.updateButtonStates(this.gameState);

        this.ui.showModal(`
            <h2 style="color: ${isWinner ? '#15803d' : '#991b1b'}">${isWinner ? '恭喜获胜！' : '惜败'}</h2>
            <p>本局游戏已结束。</p>
            <div class="modal-actions">
                <button onclick="window.location.href='index.html'" class="btn btn-primary">返回首页</button>
            </div>
        `);
    }

    handleNetworkMessage(name, data) {
        switch (name) {
            case 'move':
                if (!this.gameState.isMyTurn()) this.performMove(data.from, data.to, false);
                break;
            case 'undo:request':
                if (this.gameState.isMyTurn()) this.handleUndoRequest();
                break;
            case 'undo:response':
                if (!this.gameState.isMyTurn()) this.handleUndoResponse(data.accepted);
                break;
            case 'game-over':
                this.endGame(data.winner);
                break;
        }
    }
    
    requestUndo() {
        this.ui.updateStatus('已发送悔棋请求...', 'gameStatus info');
        this.network.publish('undo:request');
        this.ui.elements.undoBtn.disabled = true;
    }
    
    handleUndoRequest() {
        this.ui.showModal(`
            <h2>悔棋请求</h2>
            <p>对手请求悔棋，你是否同意？</p>
            <div class="modal-actions">
                <button id="rejectUndo" class="btn btn-danger">拒绝</button>
                <button id="acceptUndo" class="btn btn-primary">同意</button>
            </div>
        `);
        document.getElementById('acceptUndo').onclick = () => {
            this.network.publish('undo:response', { accepted: true });
            this.undoLastMove();
            this.ui.hideModal();
        };
        document.getElementById('rejectUndo').onclick = () => {
            this.network.publish('undo:response', { accepted: false });
            this.ui.hideModal();
        };
    }
    
    handleUndoResponse(accepted) {
        if (accepted) {
            this.ui.updateStatus('对方同意悔棋', 'gameStatus info');
            this.undoLastMove();
        } else {
            this.ui.updateStatus('对方拒绝了你的请求', 'gameStatus info');
            this.ui.updateButtonStates(this.gameState);
        }
    }
    
    undoLastMove() {
        const lastMove = this.gameState.undoLastMove();
        if (lastMove) {
            this.ui.renderBoard(this.gameState.board);
            this.ui.highlightLastMove(lastMove.from, lastMove.to);
            this.updateGameStatus();
        }
    }
    
    confirmSurrender() {
        this.ui.showModal(`
            <h2>确认认输</h2>
            <p>你确定要认输吗？这将结束本局游戏。</p>
            <div class="modal-actions">
                <button id="cancelSurrender" class="btn btn-tertiary">取消</button>
                <button id="confirmSurrenderBtn" class="btn btn-danger">确认认输</button>
            </div>
        `);
        document.getElementById('confirmSurrenderBtn').onclick = () => this.doSurrender();
        document.getElementById('cancelSurrender').onclick = () => this.ui.hideModal();
    }
    
    doSurrender() {
        this.ui.hideModal();
        const winner = this.gameState.playerColor === 'red' ? 'black' : 'red';
        this.network.publish('game-over', { winner, reason: 'surrender' });
        this.endGame(winner);
    }
}

new GameController();