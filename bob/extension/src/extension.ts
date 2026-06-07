// File: bob/extension/src/extension.ts | Date: 2026-05-31 | v1.0.0

import * as vscode from 'vscode';
import fetch from 'node-fetch';

const BOB_BASE = 'http://localhost:4000'; // Maps to the standard intelligence server port

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('bob.runCicTests', async () => {
      vscode.window.showInformationMessage('Running CIC tests via BOB...');
      await callBob('/playbook/simulate');
    }),

    vscode.commands.registerCommand('bob.openDashboard', async () => {
      const uri = vscode.Uri.parse(`${BOB_BASE}/health`);
      await vscode.env.openExternal(uri);
    }),

    vscode.commands.registerCommand('bob.triggerIngestion', async () => {
      vscode.window.showInformationMessage('Triggering ingestion job via BOB...');
      await callBob('/playbook/evolve');
    })
  );
}

async function callBob(path: string) {
  try {
    const res = await fetch(`${BOB_BASE}${path}`, { method: 'POST' });
    if (!res.ok) {
      vscode.window.showErrorMessage(`BOB call failed: ${res.status}`);
    } else {
      vscode.window.showInformationMessage('BOB call succeeded.');
    }
  } catch (err) {
    vscode.window.showErrorMessage(`BOB call error: ${err.message}`);
  }
}

export function deactivate() {}
