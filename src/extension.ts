"use strict";
import * as vscode from "vscode";
import { GiteeReopProvider, GiteeReop,GiteeCmd } from "./gitee";

export function activate(context: vscode.ExtensionContext) {
  //gitee
  
  const giteeReopProvider = new GiteeReopProvider(vscode.workspace.rootPath);
  vscode.window.registerTreeDataProvider("myGitee", giteeReopProvider);
  
  //gitee command
  vscode.commands.registerCommand("gitee.login", () =>{
    vscode.window.showInformationMessage(`Successfully called login gitee.`);
    giteeReopProvider.loginGitee();    
  }
    
  );



  vscode.commands.registerCommand("nodeDependencies.refreshEntry", () =>
    giteeReopProvider.refresh()
  );
  vscode.commands.registerCommand("extension.openPackageOnNpm", moduleName =>
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)
    )
  );
  vscode.commands.registerCommand("nodeDependencies.addEntry", () =>
    vscode.window.showInformationMessage(`Successfully called add entry.`)
  );
  vscode.commands.registerCommand(
    "nodeDependencies.editEntry",
    (node: GiteeReop) =>
      vscode.window.showInformationMessage(
        `Successfully called edit entry on ${node.label}.`
      )
  );
  vscode.commands.registerCommand(
    "nodeDependencies.deleteEntry",
    (node: GiteeReop) =>
      vscode.window.showInformationMessage(
        `Successfully called delete entry on ${node.label}.`
      )
  );

}
