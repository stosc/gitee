"use strict";
import * as vscode from "vscode";
import { GiteeReposProvider, GiteeRepos, SshInfo } from "./gitee";

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
  vscode.commands.registerCommand("gitee.test", (node: any) => { giteeReposProvider.test(node); });
  vscode.commands.registerCommand("gitee.clone", (node: GiteeRepos) => giteeReposProvider.clone(node));
  vscode.commands.registerCommand("gitee.selectedRepos", (ssh: SshInfo) => { giteeReposProvider.setSelectedRepos(ssh); });

  //vscode.commands.registerCommand("gitee.cloneTo", () => { giteeReposProvider.cloneTo(); });
  vscode.commands.registerCommand("gitee.setRemote", (node: GiteeRepos) => { giteeReposProvider.setRemote(node); });

  giteeReposProvider.loginGitee();

}
