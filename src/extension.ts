"use strict";
import * as vscode from "vscode";
import { GiteeReposProvider, GiteeRepos, SshInfo } from "./gitee";

export function activate(context: vscode.ExtensionContext) {
  //gitee
  
  vscode.workspace.onDidChangeWorkspaceFolders(e=>{
    vscode.window.showInformationMessage(`folderchange event received:${e}`);
  });

  vscode.workspace.onDidOpenTextDocument(e=>{
    vscode.window.showInformationMessage(`Text event received:${e}`);

  });
  const giteeReposProvider = new GiteeReposProvider(context);
  vscode.window.registerTreeDataProvider("myGiteeAll", giteeReposProvider);
  //gitee command
  vscode.commands.registerCommand("gitee.login", () => { giteeReposProvider.loginGitee(); });
 
  vscode.commands.registerCommand("gitee.createRepos", () => { giteeReposProvider.createReposView(); });
  vscode.commands.registerCommand("gitee.createEntRepos", () => { giteeReposProvider.createEntReposView(); });
  vscode.commands.registerCommand("gitee.createOrgRepos", () => { giteeReposProvider.createOrgReposView(); });
  vscode.commands.registerCommand("gitee.test", (node: any) => { giteeReposProvider.test(node); });
  vscode.commands.registerCommand("gitee.clone", (node: GiteeRepos) => giteeReposProvider.clone(node));
  vscode.commands.registerCommand("gitee.selectedRepos", (ssh: SshInfo) => { giteeReposProvider.setSelectedRepos(ssh); });

  //vscode.commands.registerCommand("gitee.cloneTo", () => { giteeReposProvider.cloneTo(); });
  vscode.commands.registerCommand("gitee.setRemote", (node: GiteeRepos) => { giteeReposProvider.setRemote(node); });

  context.subscriptions.push( vscode.commands.registerCommand("gitee.refresh", () => { giteeReposProvider.refresh(); }));
  vscode.window.onDidOpenTerminal(terminal => {
		console.log("Terminal opened. Total count: " + (<any>vscode.window).terminals.length);

		(<any>terminal).onDidWriteData((data: any) => {
			console.log("Terminal data: ", data);
		});
	});

  giteeReposProvider.loginGitee();

}
