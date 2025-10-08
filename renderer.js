class PomodoroTimer {
    constructor() {
        this.minutes = 0;
        this.seconds = 0;
        this.isRunning = false;
        this.interval = null;
        this.originalTime = 0;
        this.isMinimized = false;
        this.isPaused = false;
        this.koiAnimationId = null;
        this.koiAngle = 0;
        this.koiSpeed = 0.02; // Velocidad de animación (radianes por frame)
        this.pomodoroQueue = [];
        this.currentBlock = null;
        this.isBreak = false;
        this.bgSoundMuted = false;
        this.muteBgSoundBtn = document.getElementById('muteBgSound');

        // Define los ángulos de inicio en radianes
        this.koi1StartAngle = 100 * Math.PI / 180;
        this.koi2StartAngle = -250 * Math.PI / 180;

        // Elementos de la vista inicial
        this.setupView = document.querySelector('.setup-view');
        this.countdownView = document.querySelector('.countdown-view');
        this.minutesElement = document.getElementById('minutes');
        this.statusText = document.getElementById('statusText');
        this.arrowUpBtn = document.getElementById('arrowUp');
        this.arrowDownBtn = document.getElementById('arrowDown');
        this.startBtn = document.getElementById('startBtn');

        // Elementos de la vista de cuenta regresiva
        this.countdownTime = document.getElementById('countdownTime');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.pauseIcon = this.pauseBtn.querySelector('img');
        this.koi1 = document.querySelector('.koi1');
        this.koi2 = document.querySelector('.koi2');
        this.circleTimer = document.querySelector('.circle-timer');
        this.breakLabel = null;

        this.backgroundAudio = new Audio('assets/fondo.mp3');
        this.backgroundAudio.loop = true;

        if (this.muteBgSoundBtn) {
            this.muteBgSoundBtn.addEventListener('click', () => this.toggleBgSound());
        }

        this.bindEvents();
        this.updateDisplay();
        this.setKoiInitialPosition();
    }

    bindEvents() {
        this.arrowUpBtn.addEventListener('click', () => this.addTime());
        this.arrowDownBtn.addEventListener('click', () => this.subtractTime());
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.pauseBtn.addEventListener('click', () => this.togglePausePlay());
        this.resetBtn.addEventListener('click', () => this.resetTimer());
        document.addEventListener('keydown', (e) => {
            if (!this.isRunning) {
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.addTime();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.subtractTime();
                }
            }
        });
    }

    setKoiInitialPosition() {
        this.setKoiPosition(Math.PI * 1.5, 0);
        this.setKoiPosition(Math.PI * 0.5, 1);
    }

    setKoiPosition(angle, koiIndex) {
        const circle = this.circleTimer;
        if (!circle) return;
        const rect = circle.getBoundingClientRect();
        const r = rect.width / 2 - 20;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        let deg = angle * 180 / Math.PI + 90;
        if (koiIndex === 0) {
            deg += 75;
        } else {
            deg -= 100;
        }
        const mirror = ' scaleX(-1)';
        const koi = koiIndex === 0 ? this.koi1 : this.koi2;
        if (koi) {
            koi.style.left = `${x}px`;
            koi.style.top = `${y}px`;
            koi.style.transform = `translate(-50%, -50%) rotate(${deg}deg)${mirror}`;
        }
    }

    animateKoi() {
        if (!this.isRunning || this.isPaused) return;
        this.koiAngle += this.koiSpeed;
        this.setKoiPosition(this.koiAngle, 0);
        this.setKoiPosition(this.koiAngle + Math.PI, 1);
        this.koiAnimationId = requestAnimationFrame(() => this.animateKoi());
    }

    stopKoiAnimation() {
        if (this.koiAnimationId) {
            cancelAnimationFrame(this.koiAnimationId);
            this.koiAnimationId = null;
        }
    }

    showCountdownView() {
        this.setupView.style.display = 'none';
        this.countdownView.style.display = 'block';
        this.setKoiInitialPosition();
    }
    showSetupView() {
        this.setupView.style.display = 'block';
        this.countdownView.style.display = 'none';
        this.pauseIcon.src = 'assets/pause.png';
        this.isPaused = false;
        this.stopKoiAnimation();
        this.setKoiInitialPosition();
        this.removeBreakLabel();
        this.isBreak = false;
    }

    addTime() {
        if (!this.isRunning) {
            this.minutes += 5;
            this.originalTime = this.minutes;
            this.updateDisplay();
            this.updateStatus('Tiempo configurado: ' + this.minutes + ' minutos');
        }
    }

    subtractTime() {
        if (!this.isRunning && this.minutes >= 5) {
            this.minutes -= 5;
            this.originalTime = this.minutes;
            this.updateDisplay();
            this.updateStatus('Tiempo configurado: ' + this.minutes + ' minutos');
        } else if (this.minutes < 5) {
            this.updateStatus('El tiempo mínimo es 0 minutos');
        }
    }

    buildPomodoroQueue() {
        this.pomodoroQueue = [];
        let total = this.minutes;
        if (total < 25) {
            this.pomodoroQueue.push({ type: 'work', minutes: total });
        } else {
            let blocks = Math.floor(total / 25);
            let remainder = total % 25;
            for (let i = 0; i < blocks; i++) {
                this.pomodoroQueue.push({ type: 'work', minutes: 25 });
                if (i < blocks - 1) {
                    this.pomodoroQueue.push({ type: 'break', minutes: 5 });
                }
            }
            if (blocks > 0 && remainder > 0) {
                this.pomodoroQueue.push({ type: 'break', minutes: 5 });
                this.pomodoroQueue.push({ type: 'work', minutes: remainder });
            } else if (blocks > 0 && remainder === 0) {
                // No break after last block
            }
        }
    }

    startTimer() {
        if (this.minutes === 0 && this.seconds === 0) {
            this.updateStatus('Configura un tiempo antes de iniciar');
            return;
        }
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.arrowUpBtn.disabled = true;
            this.arrowDownBtn.disabled = true;
            this.buildPomodoroQueue();
            this.showCountdownView();
            setTimeout(() => {
                this.resizeWindow(100, 200);
                this.isMinimized = true;
                document.body.classList.add('small-window');
            }, 100);
            this.nextPomodoroBlock();
            this.pauseIcon.src = 'assets/pause.png';
            this.koiAngle = Math.PI * 1.5;
            this.animateKoi();
            this.backgroundAudio.currentTime = 0;
            this.backgroundAudio.play();
        }
    }

    nextPomodoroBlock() {
        if (this.pomodoroQueue.length === 0) {
            this.timerComplete(true);
            return;
        }
        this.currentBlock = this.pomodoroQueue.shift();
        this.minutes = this.currentBlock.minutes;
        this.seconds = 0;
        this.isBreak = this.currentBlock.type === 'break';
        this.updateCountdownDisplay();
        this.updateBreakLabel();
        clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.tick();
        }, 1000);
        if (!this.bgSoundMuted) {
            this.backgroundAudio.currentTime = 0;
            this.backgroundAudio.play();
        }
    }

    updateBreakLabel() {
        this.removeBreakLabel();
        if (this.isBreak) {
            if (!this.breakLabel) {
                this.breakLabel = document.createElement('div');
                this.breakLabel.textContent = 'Break';
                this.breakLabel.className = 'break-label handwrite';
                this.breakLabel.style.fontSize = '1.2rem';
                this.breakLabel.style.textAlign = 'center';
                this.breakLabel.style.marginTop = '8px';
            }
            this.countdownTime.parentNode.appendChild(this.breakLabel);
        }
    }

    removeBreakLabel() {
        if (this.breakLabel && this.breakLabel.parentNode) {
            this.breakLabel.parentNode.removeChild(this.breakLabel);
        }
    }

    togglePausePlay() {
        if (this.isRunning && !this.isPaused) {
            this.isPaused = true;
            clearInterval(this.interval);
            this.pauseIcon.src = 'assets/play.png';
            this.stopKoiAnimation();
            this.backgroundAudio.pause();
        } else if (this.isRunning && this.isPaused) {
            this.isPaused = false;
            this.interval = setInterval(() => {
                this.tick();
            }, 1000);
            this.pauseIcon.src = 'assets/pause.png';
            this.animateKoi();
            if (!this.bgSoundMuted) {
                this.backgroundAudio.play();
            }
        }
    }

    resetTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.minutes = this.originalTime;
        this.seconds = 0;
        this.arrowUpBtn.disabled = false;
        this.arrowDownBtn.disabled = false;
        this.showSetupView();
        setTimeout(() => {
            this.resizeWindow(400, 400);
            this.isMinimized = false;
            document.body.classList.remove('small-window');
        }, 100);
        clearInterval(this.interval);
        this.updateDisplay();
        this.updateStatus('Temporizador reiniciado');
        this.stopKoiAnimation();
        this.pomodoroQueue = [];
        this.currentBlock = null;
        this.backgroundAudio.pause();
        this.backgroundAudio.currentTime = 0;
    }

    tick() {
        if (this.isPaused) return;
        if (this.seconds > 0) {
            this.seconds--;
        } else if (this.minutes > 0) {
            this.minutes--;
            this.seconds = 59;
        } else {
            // Fin de bloque
            if (this.isBreak) {
                this.playNotificationSound('bloque');
            } else if (this.pomodoroQueue.length > 0) {
                this.playNotificationSound('bloque');
            }
            this.nextPomodoroBlock();
        }
        this.updateCountdownDisplay();
    }

    timerComplete(isPomodoro = false) {
        this.isRunning = false;
        this.isPaused = false;
        this.arrowUpBtn.disabled = false;
        this.arrowDownBtn.disabled = false;
        this.showSetupView();
        setTimeout(() => {
            this.resizeWindow(400, 400);
            this.isMinimized = false;
            document.body.classList.remove('small-window');
        }, 100);
        clearInterval(this.interval);
        this.updateDisplay();
        this.updateStatus('¡Tiempo completado!');
        this.stopKoiAnimation();
        this.backgroundAudio.pause();
        this.backgroundAudio.currentTime = 0;
        if (isPomodoro) {
            this.playNotificationSound('terminado');
        } else {
            this.playNotificationSound();
        }
    }

    updateDisplay() {
        this.minutesElement.textContent = this.minutes.toString().padStart(2, '0');
        if (this.countdownTime) {
            this.countdownTime.textContent = `${this.minutes.toString().padStart(2, '0')} min`;
        }
    }
    updateCountdownDisplay() {
        if (this.countdownTime) {
            if (this.seconds === 0) {
                this.countdownTime.textContent = `${this.minutes.toString().padStart(2, '0')} min`;
            } else {
                this.countdownTime.textContent = `${this.minutes.toString().padStart(2, '0')}:${this.seconds.toString().padStart(2, '0')}`;
            }
        }
    }
    updateStatus(message) {
        this.statusText.textContent = message;
    }
    resizeWindow(width, height) {
        try {
            if (window.require) {
                const { ipcRenderer } = require('electron');
                ipcRenderer.send('resize-window', { width, height });
            }
        } catch (error) {
            console.log('Error al redimensionar ventana:', error);
        }
    }
    playNotificationSound(type) {
        if (type === 'bloque') {
            const audio = new Audio('assets/bloque.mp3');
            audio.play();
        } else if (type === 'terminado') {
            const audio = new Audio('assets/terminado.mp3');
            audio.play();
        } else {
            // beep simple
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    }
    toggleBgSound() {
        this.bgSoundMuted = !this.bgSoundMuted;
        if (this.bgSoundMuted) {
            this.backgroundAudio.pause();
            this.muteBgSoundBtn.style.opacity = 0.3;
            this.muteBgSoundBtn.title = 'Activar sonido de fondo';
        } else {
            if (this.isRunning && !this.isPaused) {
                this.backgroundAudio.play();
            }
            this.muteBgSoundBtn.style.opacity = 0.7;
            this.muteBgSoundBtn.title = 'Desactivar sonido de fondo';
        }
    }
}

if ('Notification' in window) {
    Notification.requestPermission();
}
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
}); 