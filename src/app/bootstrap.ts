type TouchPoint = {
  x: number;
  y: number;
};

type TouchData = {
  touching: boolean;
  trace: TouchPoint[];
};

const tags = ['/', '/proxies', '/rules', '/connections', '/configs', '/logs'];
const touchData: TouchData = { touching: false, trace: [] };

export function registerAppBootstrap(rootEl: HTMLElement | null) {
  if (!rootEl) return;

  rootEl.addEventListener('touchstart', onTouchStart, { passive: true });
  rootEl.addEventListener('touchmove', onTouchMove, false);
  rootEl.addEventListener('touchend', onTouchEnd, false);

   
  console.log('Checkout the repo: https://github.com/MetaCubeX/yacd');
   
  console.log('Version:', __VERSION__);
}

function onTouchStart(evt: TouchEvent) {
  if (evt.touches.length !== 1) {
    touchData.touching = false;
    touchData.trace = [];
    return;
  }

  touchData.touching = true;
  touchData.trace = [{ x: evt.touches[0].screenX, y: evt.touches[0].screenY }];
}

function onTouchMove(evt: TouchEvent) {
  if (!touchData.touching) return;

  touchData.trace.push({
    x: evt.touches[0].screenX,
    y: evt.touches[0].screenY,
  });
}

function onTouchEnd() {
  if (!touchData.touching) return;

  const trace = touchData.trace;
  touchData.touching = false;
  touchData.trace = [];
  handleTouch(trace);
}

function handleTouch(trace: TouchPoint[]) {
  const start = trace[0];
  const end = trace[trace.length - 1];
  const tag = window.location.hash.slice(1);
  const index = tags.indexOf(tag);

   
  console.log(index, tag, tags.length);

  if (index === 3) return;

  if (end.x - start.x > 200 && index > 0) {
    window.location.hash = tags[index - 1];
  } else if (end.x - start.x < -200 && index < tags.length - 1) {
    window.location.hash = tags[index + 1];
    if (index === -1) {
      window.location.hash = tags[index + 2];
    }
  }
}
