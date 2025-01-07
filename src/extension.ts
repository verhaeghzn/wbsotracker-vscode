// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { exec } from "child_process";
import axios from "axios";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context: vscode.ExtensionContext) {
  let token: string | null | undefined = null;
  token = context.workspaceState.get("token", null);

  // Command to set the token
  let setTokenDisposable = vscode.commands.registerCommand(
    "wbsotracker-vscode.set-token",
    () => {
      vscode.window
        .showInputBox({
          prompt: "Enter your API token",
        })
        .then((value) => {
          context.workspaceState.update("token", value);
          token = value;
          vscode.window.showInformationMessage("Token saved successfully!");
        });
    }
  );

  // Command to get the token
  let getTokenDisposable = vscode.commands.registerCommand(
    "wbsotracker-vscode.get-token",
    () => {
      token = context.workspaceState.get("token", null);
      vscode.window.showInformationMessage(
        "Token: " + (token || "No token set")
      );
    }
  );

  let onSaveDisposable = vscode.workspace.onDidSaveTextDocument((document) => {
    vscode.window.showInformationMessage(`File saved: ${document.fileName}`);
    getGitRepoName(document.fileName).then((repoName) => {
      if (repoName && token) {
        handleFileSave(token, document, repoName);
      }
    });
  });

  context.subscriptions.push(setTokenDisposable);
  context.subscriptions.push(getTokenDisposable);
  context.subscriptions.push(onSaveDisposable);
}

// Function to handle the file save event
function handleFileSave(
  token: string,
  document: vscode.TextDocument,
  repoName: string | null
) {
  const fileName = document.fileName;

  // Call the pingTracker function to send the request
  pingTracker(token, fileName, repoName);
}

// Function to check if the file belongs to a Git repo and get the repo name
function getGitRepoName(filePath: string): Promise<string | null> {
  return new Promise((resolve) => {
    const folderPath = path.dirname(filePath);
    exec(
      `git rev-parse --show-toplevel`,
      { cwd: folderPath },
      (error, stdout) => {
        if (error) {
          resolve(null); // Not a Git repo
        } else {
          const repoPath = stdout.trim();
          const repoName = path.basename(repoPath); // Get the last folder name as the repo name
          resolve(repoName);
        }
      }
    );
  });
}

// Function to ping the tracker service
async function pingTracker(
  token: string,
  fileName: string,
  repoName: string | null
) {
  const apiUrl = "https://wbsotracker.ddev.site/api/vscode-ext/heartbeat";
  const data = {
    fileName: fileName,
    repoName: repoName || "Unknown Repository",
  };

  try {
    const response = await axios.post(apiUrl, data, {
      headers: {
        Authorization: `Bearer ${token}`, // Bearer token authorization
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      vscode.window.showErrorMessage(`Ping failed: ${error.message}`);
    } else {
      vscode.window.showErrorMessage(`Ping failed: ${String(error)}`);
    }
  }
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
