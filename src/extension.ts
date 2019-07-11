"use strict";
import * as vscode from "vscode";
import { GiteeReposProvider, GiteeRepos } from "./gitee";

export function activate(context: vscode.ExtensionContext) {
  //gitee
  
  const giteeReposProvider = new GiteeReposProvider(context);
  vscode.window.registerTreeDataProvider("myGitee", giteeReposProvider);  
  //gitee command
  vscode.commands.registerCommand("gitee.login", () => { giteeReposProvider.loginGitee(); });
  vscode.commands.registerCommand("gitee.refresh", () => { giteeReposProvider.refresh(); });
  vscode.commands.registerCommand("gitee.createRepos", () => { giteeReposProvider.createReposView(); });
  vscode.commands.registerCommand("gitee.createEntRepos", () => { giteeReposProvider.createEntReposView(); });
  vscode.commands.registerCommand("gitee.createOrgRepos", () => { giteeReposProvider.createOrgReposView(); });
  vscode.commands.registerCommand("gitee.clone", (node: string) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node}.`)
  );
  vscode.commands.registerCommand(
    "nodeDependencies.deleteEntry",
    (node: GiteeRepos) =>
      vscode.window.showInformationMessage(
        `Successfully called delete entry on ${node.fullName}.`
      )
  );

  giteeReposProvider.loginGitee();

}
