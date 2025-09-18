        let gameState = {
            isPlaying: false,
            score: 0,
            timeLeft: 60,
            fishCaught: {},
            gameTimer: null,
            spawnTimer: null,
            circleTimer: null,
            fishTimers: [], // 魚のタイマーIDを保存
            effectTimers: [] // エフェクトのタイマーIDを保存
        };

        const fishTypes = [
            { name: 'キンメダイ', points: 10, rare: false, image: 'kinmedai.png', speed: 4000 },
            { name: 'サバ', points: 15, rare: false, image: 'saba.png', speed: 3500 },
            { name: 'イワシ', points: 8, rare: false, image: 'iwashi.png', speed: 3000 },
            { name: 'タイ', points: 25, rare: false, image: 'tai.png', speed: 5000 },
            { name: 'ヒラメ', points: 30, rare: false, image: 'hirame.png', speed: 4000 },
            { name: 'カニ', points: 20, rare: false, image: 'kani.png', speed: 8000 },
            { name: 'フグ', points: 12, rare: false, image: 'hugu.png', speed: 7000 },
            { name: 'イカ', points: 18, rare: false, image: 'ika.png', speed: 4500 },
            { name: 'タコ', points: 22, rare: false, image: 'tako.png', speed: 5500 },
            { name: 'マグロ', points: 100, rare: true, image: 'maguro.png', speed: 2000 }
        ];

        function createFishSVG(fishType) {
            // フォールバック用のSVG（png画像が読み込めない場合）
            const isRare = fishType.rare;
            const baseColor = '#87CEEB'; // デフォルト色
            
            return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">
                ${isRare ? '<defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' : ''}
                <ellipse cx="50" cy="25" rx="25" ry="15" fill="${baseColor}" ${isRare ? 'filter="url(#glow)"' : ''}/>
                <polygon points="20,25 5,15 5,35" fill="${baseColor}"/>
                <polygon points="60,20 75,10 70,25 75,40 60,30" fill="${baseColor}"/>
                <circle cx="60" cy="20" r="3" fill="black"/>
                <circle cx="62" cy="18" r="1" fill="white"/>
                ${isRare ? '<circle cx="45" cy="25" r="2" fill="gold" opacity="0.8"/>' : ''}
            </svg>`;
        }

        function moveCircle() {
            const circle = document.getElementById('fishingCircle');
            const container = document.getElementById('gameContainer');
            
            const maxX = container.clientWidth - 140;
            const containerHeight = container.clientHeight;
            const topQuarter = containerHeight / 4; // 上部1/4を除外
            const maxY = containerHeight - 200;
            const minY = topQuarter + 50; // 上部1/4より下に配置
            
            const newX = Math.random() * maxX;
            const newY = minY + Math.random() * (maxY - minY);
            
            circle.style.left = newX + 'px';
            circle.style.top = newY + 'px';
        }

        function spawnFish() {
            if (!gameState.isPlaying) return;
            
            const container = document.getElementById('gameContainer');
            const fish = document.createElement('div');
            fish.className = 'fish';
            
            // レア魚の出現確率（特定時間帯で確率UP）
            const currentTime = new Date();
            const hour = currentTime.getHours();
            const isGoldenTime = (hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19);
            
            let rareChance = isGoldenTime ? 0.15 : 0.05;
            const isRare = Math.random() < rareChance;
            
            let selectedFish;
            if (isRare) {
                selectedFish = fishTypes.find(f => f.rare);
                fish.classList.add('rare-fish');
            } else {
                const normalFish = fishTypes.filter(f => !f.rare);
                selectedFish = normalFish[Math.floor(Math.random() * normalFish.length)];
            }
            
            fish.dataset.fishType = selectedFish.name;
            fish.dataset.points = selectedFish.points;
            
            const img = document.createElement('img');
            img.src = selectedFish.image;
            img.alt = selectedFish.name;
            img.onerror = function() {
                // 画像が読み込めない場合のフォールバック
                console.log(`画像が見つかりません: ${selectedFish.image}`);
                this.src = createFishSVG(selectedFish);
            };
            fish.appendChild(img);
            
            // 魚の初期位置（画面右側から出現、上部1/4を除外）
            const containerHeight = container.clientHeight;
            const topQuarter = containerHeight / 4; // 上部1/4に変更
            const maxY = containerHeight - 150;
            const minY = topQuarter + 50; // 上部1/4より下から出現
            
            fish.style.top = minY + Math.random() * (maxY - minY) + 'px';
            fish.style.left = container.clientWidth + 'px'; // 常に右側から出現
            fish.style.transform = 'scaleX(1)'; // 反転なし
            
            container.appendChild(fish);
            
            // 魚を曲線的に移動（レア魚は直線移動）
            let startTime = Date.now();
            let animationId = null; // アニメーションIDを保存
            const initialY = parseFloat(fish.style.top);
            
            // 魚をクリック・タップした時の処理
            function handleFishTouch(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // マウスとタッチイベントで座標の取得方法を分ける
                let clientX, clientY;
                if (e.type.startsWith('touch')) {
                    const touch = e.changedTouches[0];
                    clientX = touch.clientX;
                    clientY = touch.clientY;
                } else {
                    clientX = e.clientX;
                    clientY = e.clientY;
                }
                
                console.log('魚がクリックされました:', selectedFish.name);
                
                // 魚が円の中にいるか && クリック位置が円の中かを両方チェック
                if (isFishInCircle(fish) && isClickInCircle(clientX, clientY)) {
                    console.log('円の中の魚を円の中でクリック - 釣り上げます！');
                    catchFish(fish, selectedFish);
                } else {
                    console.log('釣れませんでした');
                    const missEffect = document.createElement('div');
                    missEffect.className = 'catch-effect';
                    missEffect.textContent = 'MISS!';
                    missEffect.style.color = '#FF6B6B';
                    const fishRect = fish.getBoundingClientRect();
                    missEffect.style.left = `${fishRect.left + fishRect.width / 2}px`;
                    missEffect.style.top = `${fishRect.top + fishRect.height / 2}px`;
                    
                    document.getElementById('gameContainer').appendChild(missEffect);
                    
                    // エフェクトタイマーを記録して管理
                    const effectTimerId = setTimeout(() => {
                        if (missEffect.parentNode) {
                            missEffect.parentNode.removeChild(missEffect);
                        }
                        // タイマーIDを配列から削除
                        const index = gameState.effectTimers.indexOf(effectTimerId);
                        if (index > -1) {
                            gameState.effectTimers.splice(index, 1);
                        }
                    }, 1000);
                    gameState.effectTimers.push(effectTimerId);
                }
            }
            
            fish.addEventListener('click', handleFishTouch);
            fish.addEventListener('touchstart', handleFishTouch);
            
            // 魚の削除処理を改善
            let fishDeletionTimerId = null;
            function removeFish() {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
                if (fishDeletionTimerId) {
                    clearTimeout(fishDeletionTimerId);
                    const index = gameState.fishTimers.indexOf(fishDeletionTimerId);
                    if (index > -1) {
                        gameState.fishTimers.splice(index, 1);
                    }
                    fishDeletionTimerId = null;
                }
                if (fish.parentNode) {
                    // イベントリスナーを削除
                    fish.removeEventListener('click', handleFishTouch);
                    fish.removeEventListener('touchstart', handleFishTouch);
                    fish.parentNode.removeChild(fish);
                }
            }
            
            if (selectedFish.rare) {
                // レア魚は直線移動（右から左へ）
                const moveTimerId = setTimeout(() => {
                    if (!fish.parentNode) return;
                    fish.style.transition = `all ${selectedFish.speed}ms linear`;
                    fish.style.left = '-120px';
                    // タイマーIDを配列から削除
                    const index = gameState.fishTimers.indexOf(moveTimerId);
                    if (index > -1) {
                        gameState.fishTimers.splice(index, 1);
                    }
                }, 100);
                gameState.fishTimers.push(moveTimerId);
                
                // レア魚の削除タイマー
                fishDeletionTimerId = setTimeout(removeFish, selectedFish.speed + 1000);
                gameState.fishTimers.push(fishDeletionTimerId);
            } else {
                // 通常魚は曲線移動（sin波を使った自然な動き）
                const waveAmplitude = 30 + Math.random() * 40; // 波の振幅
                const waveFrequency = 0.002 + Math.random() * 0.003; // 波の周波数
                
                function animateFish() {
                    if (!fish.parentNode || !gameState.isPlaying) {
                        removeFish();
                        return;
                    }
                    
                    const currentTime = Date.now();
                    const elapsed = currentTime - startTime;
                    const progress = elapsed / selectedFish.speed;
                    
                    if (progress >= 1) {
                        removeFish();
                        return;
                    }
                    
                    // 水平移動（右から左へ）
                    const newLeft = container.clientWidth - (container.clientWidth + 240) * progress;
                    fish.style.left = newLeft + 'px';
                    
                    // 垂直方向の波状動き
                    const waveY = Math.sin(elapsed * waveFrequency) * waveAmplitude;
                    fish.style.top = (initialY + waveY) + 'px';
                    
                    animationId = requestAnimationFrame(animateFish);
                }
                
                const animationStartTimerId = setTimeout(() => {
                    if (fish.parentNode) {
                        fish.style.transition = 'none'; // transitionを無効化してアニメーションを制御
                        animateFish();
                    }
                    // タイマーIDを配列から削除
                    const index = gameState.fishTimers.indexOf(animationStartTimerId);
                    if (index > -1) {
                        gameState.fishTimers.splice(index, 1);
                    }
                }, 100);
                gameState.fishTimers.push(animationStartTimerId);
                
                // 通常魚の削除タイマー（フォールバック）
                fishDeletionTimerId = setTimeout(removeFish, selectedFish.speed + 1000);
                gameState.fishTimers.push(fishDeletionTimerId);
            }
        }

        function isFishInCircle(fishElement) {
            const circle = document.getElementById('fishingCircle');
            const circleRect = circle.getBoundingClientRect();
            const fishRect = fishElement.getBoundingClientRect();
            
            const circleCenterX = circleRect.left + circleRect.width / 2;
            const circleCenterY = circleRect.top + circleRect.height / 2;
            const fishCenterX = fishRect.left + fishRect.width / 2;
            const fishCenterY = fishRect.top + fishRect.height / 2;
            const circleRadius = circleRect.width / 2;
            
            const distance = Math.sqrt(
                Math.pow(circleCenterX - fishCenterX, 2) + 
                Math.pow(circleCenterY - fishCenterY, 2)
            );
            
            // 魚が円の範囲内にある場合true
            return distance < circleRadius - 10; // 少し余裕を持たせて判定
        }

        function isClickInCircle(clickX, clickY) {
            const circle = document.getElementById('fishingCircle');
            const circleRect = circle.getBoundingClientRect();
            
            const circleCenterX = circleRect.left + circleRect.width / 2;
            const circleCenterY = circleRect.top + circleRect.height / 2;
            const circleRadius = circleRect.width / 2;
            
            const distance = Math.sqrt(
                Math.pow(circleCenterX - clickX, 2) + 
                Math.pow(circleCenterY - clickY, 2)
            );
            
            // クリック位置が円の中にある場合true
            return distance < circleRadius;
        }

        function catchFish(fishElement, fishType) {
            const points = parseInt(fishElement.dataset.points);
            gameState.score += points;
            
            // 釣った魚をカウント
            if (!gameState.fishCaught[fishType.name]) {
                gameState.fishCaught[fishType.name] = 0;
            }
            gameState.fishCaught[fishType.name]++;
            
            // エフェクト表示
            const effect = document.createElement('div');
            effect.className = 'catch-effect';
            effect.textContent = `+${points} ${fishType.name}`;
            effect.style.left = fishElement.style.left;
            effect.style.top = fishElement.style.top;
            
            document.getElementById('gameContainer').appendChild(effect);
            
            // エフェクトを確実に削除（タイマー管理）
            const effectTimerId = setTimeout(() => {
                if (effect && effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
                // タイマーIDを配列から削除
                const index = gameState.effectTimers.indexOf(effectTimerId);
                if (index > -1) {
                    gameState.effectTimers.splice(index, 1);
                }
            }, 1000);
            gameState.effectTimers.push(effectTimerId);
            
            // 魚を確実に削除（イベントリスナーも含めて）
            if (fishElement && fishElement.parentNode) {
                // すべてのイベントリスナーをクローンで削除
                const newFish = fishElement.cloneNode(true);
                fishElement.parentNode.replaceChild(newFish, fishElement);
                newFish.parentNode.removeChild(newFish);
            }
            
            updateScore();
        }

        function updateScore() {
            document.getElementById('score').textContent = gameState.score;
        }

        function updateTimer() {
            document.getElementById('timer').textContent = gameState.timeLeft;
            gameState.timeLeft--;
            
            if (gameState.timeLeft < 0) {
                endGame();
            }
        }

        function startGame() {
            gameState.isPlaying = true;
            gameState.score = 0;
            gameState.timeLeft = 60;
            gameState.fishCaught = {};
            
            // タイマー配列をリセット
            gameState.fishTimers = [];
            gameState.effectTimers = [];
            
            document.getElementById('startScreen').style.display = 'none';
            document.getElementById('gameOver').style.display = 'none';
            
            updateScore();
            moveCircle();
            
            gameState.gameTimer = setInterval(updateTimer, 1000);
            gameState.spawnTimer = setInterval(() => {
                // 同時に3-5匹の魚を出現させる
                const fishCount = Math.floor(Math.random() * 3) + 3;
                for (let i = 0; i < fishCount; i++) {
                    const spawnTimerId = setTimeout(() => spawnFish(), i * 200);
                    gameState.fishTimers.push(spawnTimerId);
                }
            }, 2000);
            gameState.circleTimer = setInterval(moveCircle, 5000);
        }

        function endGame() {
            gameState.isPlaying = false;
            
            // すべてのタイマーをクリア
            clearInterval(gameState.gameTimer);
            clearInterval(gameState.spawnTimer);
            clearInterval(gameState.circleTimer);
            
            // 魚関連のすべてのタイマーをクリア
            gameState.fishTimers.forEach(timerId => {
                clearTimeout(timerId);
            });
            gameState.fishTimers = [];
            
            // エフェクト関連のすべてのタイマーをクリア
            gameState.effectTimers.forEach(timerId => {
                clearTimeout(timerId);
            });
            gameState.effectTimers = [];
            
            // 残っている魚を強制削除（メモリリーク防止）
            const fishes = document.querySelectorAll('.fish');
            fishes.forEach(fish => {
                if (fish.parentNode) {
                    // イベントリスナーを含めて完全削除
                    const clonedFish = fish.cloneNode(true);
                    fish.parentNode.replaceChild(clonedFish, fish);
                    clonedFish.parentNode.removeChild(clonedFish);
                }
            });
            
            // 残っているエフェクトも削除
            const effects = document.querySelectorAll('.catch-effect');
            effects.forEach(effect => {
                if (effect.parentNode) {
                    effect.parentNode.removeChild(effect);
                }
            });
            
            showGameOver();
        }

        function showGameOver() {
            document.getElementById('finalScore').textContent = gameState.score;
            
            const summary = document.getElementById('catchSummary');
            let summaryText = '<div style="margin-top: 10px; text-align: left; max-width: 300px; max-height: 200px; overflow-y: auto;">';
            summaryText += '<h3 style="font-size: 16px; margin: 5px 0;">釣った魚:</h3>';
            
            if (Object.keys(gameState.fishCaught).length === 0) {
                summaryText += '<p style="font-size: 14px; margin: 2px 0;">魚が釣れませんでした...</p>';
            } else {
                for (const [fishName, count] of Object.entries(gameState.fishCaught)) {
                    const fishType = fishTypes.find(f => f.name === fishName);
                    const totalPoints = count * fishType.points;
                    summaryText += `<p style="font-size: 14px; margin: 2px 0; line-height: 1.3;">${fishName}: ${count}匹 (${totalPoints}点)</p>`;
                }
            }
            summaryText += '</div>';
            
            summary.innerHTML = summaryText;
            
            // スコアによって画像を選択
            let fishImageSrc, fishColor, altText;
            if (gameState.score >= 300) {
                // 高スコア（300点以上）
                fishImageSrc = 'high_score_fish.png';
                fishColor = '#FFD700'; // 金色
                altText = '高得点魚';
            } else if (gameState.score >= 100) {
                // 中スコア（100-299点）
                fishImageSrc = 'mid_score_fish.png';
                fishColor = '#C0C0C0'; // 銀色
                altText = '中得点魚';
            } else {
                // 低スコア（99点以下）
                fishImageSrc = 'low_score_fish.png';
                fishColor = '#CD7F32'; // 銅色
                altText = '頑張れ魚';
            }
            
            // ゲーム終了画面に泳ぐ魚を追加
            const gameOverScreen = document.getElementById('gameOver');
            const gameOverFish = document.createElement('img');
            gameOverFish.className = 'game-over-fish';
            gameOverFish.src = fishImageSrc;
            gameOverFish.alt = altText;
            
            // 画像が読み込めない場合のフォールバック（スコア別の色）
            gameOverFish.onerror = function() {
                console.log(`ゲームオーバー魚画像が見つかりません: ${fishImageSrc}`);
                // SVGでフォールバック魚を作成（スコア別の色）
                this.src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">
                    <ellipse cx="30" cy="25" rx="25" ry="15" fill="${fishColor}"/>
                    <polygon points="55,25 70,15 70,35" fill="${fishColor}"/>
                    <polygon points="10,20 0,10 5,25 0,40 10,30" fill="${fishColor}"/>
                    <circle cx="20" cy="20" r="3" fill="black"/>
                    <circle cx="18" cy="18" r="1" fill="white"/>
                    ${gameState.score >= 300 ? '<circle cx="25" cy="25" r="2" fill="white" opacity="0.8"/>' : ''}
                </svg>`;
            };
            
            // 「ゲーム終了！」テキストと同じ高さに配置
            const gameOverTitle = gameOverScreen.querySelector('h2');
            const titleRect = gameOverTitle.getBoundingClientRect();
            const screenRect = gameOverScreen.getBoundingClientRect();
            const relativeTop = titleRect.top - screenRect.top;
            
            gameOverFish.style.position = 'absolute';
            gameOverFish.style.top = relativeTop + 'px';
            
            gameOverScreen.appendChild(gameOverFish);
            document.getElementById('gameOver').style.display = 'flex';
        }

        function resetGame() {
            // ゲーム終了画面の泳ぐ魚を削除
            const gameOverFish = document.querySelector('.game-over-fish');
            if (gameOverFish) {
                gameOverFish.remove();
            }
            
            // すべてのタイマーをリセット
            gameState.fishTimers = [];
            gameState.effectTimers = [];
            
            document.getElementById('startScreen').style.display = 'flex';
            document.getElementById('gameOver').style.display = 'none';
            
            gameState.score = 0;
            gameState.timeLeft = 60;
            updateScore();
            document.getElementById('timer').textContent = '60';
        }

        // 初期位置設定
        window.addEventListener('load', function() {
            moveCircle();
        });
        
        // 円の範囲内をクリックした時の処理（魚以外の場所）
        document.getElementById('gameContainer').addEventListener('click', function(e) {
            if (!gameState.isPlaying) return;
            if (e.target.closest('.fish')) return; // 魚がクリックされた場合は無視
            
            let clientX, clientY;
            if (e.type.startsWith('touch')) {
                const touch = e.changedTouches[0];
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            // 円の中をクリックしたかチェック
            if (isClickInCircle(clientX, clientY)) {
                // 円の中に魚がいるかチェック
                const allFish = document.querySelectorAll('.fish');
                let caughtFish = false;
                
                for (let fishElement of allFish) {
                    if (isFishInCircle(fishElement)) {
                        // 魚の種類を取得
                        const fishTypeName = fishElement.dataset.fishType;
                        const fishType = fishTypes.find(f => f.name === fishTypeName);
                        console.log('円の中の魚を円内クリックで釣り上げ:', fishTypeName);
                        catchFish(fishElement, fishType);
                        caughtFish = true;
                        break; // 1匹だけ釣る
                    }
                }
                
                if (!caughtFish) {
                    console.log('円の中に魚がいません');
                }
            }
        });
        
        // タッチイベント版も追加
        document.getElementById('gameContainer').addEventListener('touchstart', function(e) {
            if (!gameState.isPlaying) return;
            if (e.target.closest('.fish')) return;
            
            const touch = e.changedTouches[0];
            const clientX = touch.clientX;
            const clientY = touch.clientY;
            
            if (isClickInCircle(clientX, clientY)) {
                const allFish = document.querySelectorAll('.fish');
                let caughtFish = false;
                
                for (let fishElement of allFish) {
                    if (isFishInCircle(fishElement)) {
                        const fishTypeName = fishElement.dataset.fishType;
                        const fishType = fishTypes.find(f => f.name === fishTypeName);
                        console.log('円の中の魚をタッチで釣り上げ:', fishTypeName);
                        catchFish(fishElement, fishType);
                        caughtFish = true;
                        break;
                    }
                }
            }
        });