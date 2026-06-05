import '~/styles/main.scss';
import './misc/i18n';

// Must come before any module that transitively imports iconv-lite.
import './lib/buffer-polyfill';

import React from 'react';
import { createRoot } from 'react-dom/client';
import Modal from 'react-modal';

import App from './App';
import { registerAppBootstrap } from './app/bootstrap';
import * as geoip from './api/geoip';
import * as swRegistration from './swRegistration';

const rootEl = document.getElementById('app');
if (!rootEl) {
	throw new Error('Cannot find #app root element');
}

const root = createRoot(rootEl);

Modal.setAppElement(rootEl);

root.render(<App />);

swRegistration.register();

registerAppBootstrap(rootEl);

// Kick off the IP database load in parallel with app bootstrap. Failures
// are non-fatal: lookupIp() will simply return '' until init() retries.
geoip.init().catch((err) => {
	// eslint-disable-next-line no-console
	console.warn('[geoip] init failed:', err);
});
