#!/usr/bin/env node
import process from 'node:process';
import {createServer} from 'node:http';
import * as p from '@clack/prompts';
import open from 'open';
import getPort from 'get-port';
import pDefer from 'p-defer';
import path from 'path';
import 'dotenv/config';
import { sendRefreshToken } from './api-sender.js';

if (typeof fetch !== 'function') {
	throw new TypeError('This script requires Node.js 18.0 or newer because it relies on the global `fetch` function.');
}

const approvalCode = pDefer();
const port = await getPort();
const localhost = '127.0.0.1';

// TODO: Remove after https://github.com/natemoo-re/clack/issues/181
const tasks = async tasks => {
	for (const task of tasks) {
		if (task.enabled === false) {
			continue;
		}

		const s = p.spinner();
		s.start(task.title);
		// eslint-disable-next-line no-await-in-loop -- Sequential
		const result = await task.task(s.message);
		s.stop(result || task.title);
	}
};

const server = createServer((request, response) => {
	const {searchParams} = new URL(request.url, serverUrl);
	if (searchParams.has('code')) {
		approvalCode.resolve(searchParams.get('code'));
		// Html header
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.end('You can close this tab now. <script>window.close()</script>');
		server.close();
		return;
	}

	response.writeHead(400, {'Content-Type': 'text/plain'});
	response.end('No `code` found in the URL. WHO R U?');
});

server.listen(port, localhost);

const serverUrl = `http://${localhost}:${port}`;

function required(input) {
	if (input.trim() === '') {
		return 'Required';
	}
}

async function getRefreshToken() {
	const request = await fetch('https://accounts.google.com/o/oauth2/token', {
		method: 'POST',
		body: new URLSearchParams([
			['client_id', group.clientId.trim()],
			['client_secret', group.clientSecret.trim()],
			['code', code],
			['grant_type', 'authorization_code'],
			['redirect_uri', serverUrl], // Unused but required
		]),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	});

	if (!request.ok) {
		throw new Error('Error while getting the refresh token: ' + request.statusText);
	}

	const response = await request.json();

	if (response.error) {
		throw new Error('Error while getting the refresh token: ' + response.error);
	}

	return response.refresh_token;
}

function getLoginUrl(clientId) {
	const url = new URL('https://accounts.google.com/o/oauth2/auth');
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('access_type', 'offline');
	url.searchParams.set('client_id', clientId.trim());
	url.searchParams.set('scope', 'https://www.googleapis.com/auth/chromewebstore');
	url.searchParams.set('redirect_uri', serverUrl);
	return url.href;
}

p.intro('Follow the steps at this URL to generate the API keys, then enter them below to generate the refresh token.\n   https://github.com/fregante/chrome-webstore-upload-keys');

const clientId = process.env.GOOGLE_CLOUD_API_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLOUD_API_CLIENT_SECRET;
const gitLabToken = process.env.GIT_LAB_ACCESS_TOKEN;

if (!clientId || !clientSecret) {
	console.error('Error: GOOGLE_CLOUD_API_CLIENT_ID and GOOGLE_CLOUD_API_CLIENT_SECRET environment variables are required');
	console.error('Please set them in your .env file');
	process.exit(1);
}

if (!gitLabToken) {
	console.error('Error: GIT_LAB_ACCESS_TOKEN environment variable is required');
	console.error('Please set it in your .env file');
	process.exit(1);
}

const group = {
	clientId,
	clientSecret,
	open: true
};

let code;
let refreshToken;

await tasks([
	{
		title: 'Opening the login page in the browser',
		async task() {
			const instructions = 'Complete the process in the browser. Follow its steps and warnings (this is your own personal app)';
			if (group.open) {
				await open(getLoginUrl(group.clientId));
				return instructions;
			}

			return instructions + '\n\n   ' + getLoginUrl(group.clientId);
		},
	},
	{
		title: 'Waiting for you in the browser',
		async task() {
			code = await approvalCode.promise;
			return 'Approval code received from Google';
		},
	},
	{
		title: 'Asking Google for the refresh token',
		async task() {
			refreshToken = await getRefreshToken();
			// Adicionar o refresh token às variáveis de ambiente para ser enviado junto
			process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN = refreshToken;
			return `Refresh token obtained successfully`;
		},
	},
	{
		title: 'Enviando GOOGLE_CLOUD_API_CLIENT_ID para o GitLab',
		async task() {
			const result = await sendRefreshToken(gitLabToken, process.env.GOOGLE_CLOUD_API_CLIENT_ID, 'GOOGLE_CLOUD_API_CLIENT_ID');
			return result;
		},
	},
	{
		title: 'Enviando GOOGLE_CLOUD_API_CLIENT_SECRET para o GitLab',
		async task() {
			const result = await sendRefreshToken(gitLabToken, process.env.GOOGLE_CLOUD_API_CLIENT_SECRET, 'GOOGLE_CLOUD_API_CLIENT_SECRET');
			return result;
		},
	},
	{
		title: 'Enviando GOOGLE_CLOUD_API_REFRESH_TOKEN para o GitLab',
		async task() {
			const result = await sendRefreshToken(gitLabToken, process.env.GOOGLE_CLOUD_API_REFRESH_TOKEN, 'GOOGLE_CLOUD_API_REFRESH_TOKEN');
			return result;
		},
	},
	{
		title: 'Finalizando procedimento',
		async task() {
			return '✨ Processo concluído com sucesso! Todas as variáveis Google foram enviadas para o GitLab.';
		},
	}
]);

// Finaliza o processo após completar todas as tarefas
process.exit(0);
