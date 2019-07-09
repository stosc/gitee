"use strict";
import * as vscode from "vscode";
import { GiteeReopProvider, GiteeReop, GiteeCmd } from "./gitee";

export function activate(context: vscode.ExtensionContext) {
  //gitee

  const giteeReopProvider = new GiteeReopProvider(context);
  vscode.window.registerTreeDataProvider("myGitee", giteeReopProvider);

  //gitee command
  vscode.commands.registerCommand("gitee.login", () => { giteeReopProvider.loginGitee(); });

  vscode.commands.registerCommand("gitee.refresh", () => { giteeReopProvider.refresh(); });




  vscode.commands.registerCommand("gitee.createReop", () => { giteeReopProvider.createReop(); });
  vscode.commands.registerCommand("gitee.createEntReop", () => { giteeReopProvider.createEntReop(); });
  vscode.commands.registerCommand("gitee.createOrgReop", () => { giteeReopProvider.createOrgReop(); });
  vscode.commands.registerCommand("gitee.clone", (node: GiteeReop) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.fullName}.`)
  );
  vscode.commands.registerCommand(
    "nodeDependencies.deleteEntry",
    (node: GiteeReop) =>
      vscode.window.showInformationMessage(
        `Successfully called delete entry on ${node.fullName}.`
      )
  );

}
