const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk';

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        createRoomBtn: document.getElementById('createRoomBtn'),
        joinRoomBtn: document.getElementById('joinRoomBtn'),
        roomCodeInput: document.getElementById('roomCodeInput'),
        notificationArea: document.getElementById('notification-area'),
        actionPanel: document.getElementById('action-panel'),
        waitingPanel: document.getElementById('waiting-panel'),
        displayRoomCode: document.getElementById('displayRoomCode'),
        copyCodeBtn: document.getElementById('copyCodeBtn'),
        copyFeedback: document.getElementById('copy-feedback'),
    };

    const showNotification = (message, type = 'error', duration = 3500) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        ui.notificationArea.innerHTML = '';
        ui.notificationArea.appendChild(notification);
        setTimeout(() => {
            notification.remove();
        }, duration);
    };
    
    const generateRoomCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const initializeAblyConnection = () => {
        const realtime = new Ably.Realtime({ 
            key: ABLY_API_KEY,
            recover: (lastConnectionDetails, cb) => cb(true) 
        });

        realtime.connection.on('connected', () => {
            console.log('✅ Ably connection established.');
        });

        realtime.connection.on('failed', (error) => {
            console.error('Ably connection failed:', error);
            showNotification(`连接实时服务器失败: ${error.reason.message}`);
        });

        return realtime;
    };
    
    const handleCreateRoom = async (realtime) => {
        ui.createRoomBtn.disabled = true;
        ui.createRoomBtn.innerHTML = '<div class="spinner"></div> 创建中...';
        
        const roomCode = generateRoomCode();
        const channel = realtime.channels.get(`xiangqi:${roomCode}`);

        try {
            await channel.presence.enter({ player: 'red' });
            
            localStorage.setItem('xiangqi_room', roomCode);
            localStorage.setItem('xiangqi_color', 'red');

            ui.displayRoomCode.textContent = roomCode;
            ui.actionPanel.classList.add('hidden');
            ui.waitingPanel.classList.remove('hidden');

            channel.presence.subscribe('enter', (member) => {
                if (member.data.player === 'black') {
                    window.location.href = `game.html?room=${roomCode}`;
                }
            });
        } catch (error) {
            console.error('Error creating room:', error);
            showNotification('创建房间失败，请刷新页面重试。');
            ui.createRoomBtn.disabled = false;
            ui.createRoomBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i>创建新对局';
        }
    };

    const handleJoinRoom = async (realtime) => {
        const roomCode = ui.roomCodeInput.value.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
            showNotification('请输入有效的6位房间码。');
            return;
        }

        ui.joinRoomBtn.disabled = true;
        ui.joinRoomBtn.innerHTML = '<div class="spinner"></div>';

        const channel = realtime.channels.get(`xiangqi:${roomCode}`);
        
        try {
            const presence = await channel.presence.get();

            if (presence.length === 0) {
                showNotification('房间不存在或已过期。');
            } else if (presence.length === 1 && presence[0].data.player === 'red') {
                localStorage.setItem('xiangqi_room', roomCode);
                localStorage.setItem('xiangqi_color', 'black');
                await channel.presence.enter({ player: 'black' });
                window.location.href = `game.html?room=${roomCode}`;
            } else {
                showNotification('房间已满或无法加入。');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            showNotification('加入房间时发生网络错误。');
        } finally {
            ui.joinRoomBtn.disabled = false;
            ui.joinRoomBtn.textContent = '加入';
        }
    };
    
    const handleCopyCode = () => {
        navigator.clipboard.writeText(ui.displayRoomCode.textContent).then(() => {
            ui.copyFeedback.textContent = '已复制到剪贴板！';
            setTimeout(() => { ui.copyFeedback.textContent = ''; }, 2000);
        }).catch(err => {
            console.error('Failed to copy code:', err);
            ui.copyFeedback.textContent = '复制失败';
        });
    };

    const realtime = initializeAblyConnection();
    
    ui.createRoomBtn.addEventListener('click', () => handleCreateRoom(realtime));
    ui.joinRoomBtn.addEventListener('click', () => handleJoinRoom(realtime));
    ui.copyCodeBtn.addEventListener('click', handleCopyCode);
    ui.roomCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoinRoom(realtime);
    });
    ui.roomCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
});