const swishAudio = new Audio('/sounds/swish.mp3');
const meowAudio = new Audio('/sounds/meow.mp3');
const meow2Audio = new Audio('/sounds/meow2.mp3');
const winAudio = new Audio('/sounds/win.mp3');
const loseAudio = new Audio('/sounds/lose.mp3');

export const playSwish = () => {
    swishAudio.currentTime = 0;
    swishAudio.play().catch(e => console.log('Audio play failed:', e));
};

export const playMeow = () => {
    meowAudio.currentTime = 0;
    meowAudio.play().catch(e => console.log('Audio play failed:', e));
};

export const playReplyMeow = () => {
    meow2Audio.currentTime = 0;
    meow2Audio.play().catch(e => console.log('Audio play failed:', e));
};

export const playWin = () => {
    winAudio.currentTime = 0;
    winAudio.play().catch(e => console.log('Audio play failed:', e));
};

export const playLose = () => {
    loseAudio.currentTime = 0;
    loseAudio.play().catch(e => console.log('Audio play failed:', e));
};
