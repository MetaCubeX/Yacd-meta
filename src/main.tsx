import '~/styles/main.scss';
import './misc/i18n';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Modal from 'react-modal';

import App from './App';
import * as swRegistration from './swRegistration';

const rootEl = document.getElementById('app');
const root = createRoot(rootEl);

Modal.setAppElement(rootEl);

root.render(<App />);

swRegistration.register();

// eslint-disable-next-line no-console
console.log('Checkout the repo: https://github.com/MetaCubeX/yacd');
// eslint-disable-next-line no-console
console.log('Version:', __VERSION__);

window.onload = function startup() {
  const el = document.getElementById('app');
  el.addEventListener('touchstart', onTouchStart, false);
  el.addEventListener('touchmove', onTouchMove, false);
  el.addEventListener('touchend', onTouchEnd, false);
};

const touchData = { touching: false, trace: [] };

function onTouchStart(evt) {
  if (evt.touches.length !== 1) {
    touchData.touching = false;
    touchData.trace = [];
    return;
  }
  touchData.touching = true;
  touchData.trace = [{ x: evt.touches[0].screenX, y: evt.touches[0].screenY }];
}

function onTouchMove(evt) {
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
  handleTouch(trace); //判断touch类型并调用适当回调
}

function handleTouch(trace) {
  const tags = ['/', '/proxies', '/rules', '/connections', '/configs', '/logs'];
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
