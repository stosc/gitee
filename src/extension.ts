"use strict";

import * as vscode from "vscode";

import { JsonOutlineProvider } from "./jsonOutline";
import { GiteeReopProvider, GiteeReop } from "./gitee";

export function activate(context: vscode.ExtensionContext) {
  //gitee
  const giteeReopProvider = new GiteeReopProvider(vscode.workspace.rootPath);
  vscode.window.registerTreeDataProvider("giteeReops", giteeReopProvider);
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

  // Samples of `window.registerTreeDataProvider`

  const jsonOutlineProvider = new JsonOutlineProvider(context);
  vscode.window.registerTreeDataProvider("jsonOutline", jsonOutlineProvider);
  vscode.commands.registerCommand("jsonOutline.refresh", () =>
    jsonOutlineProvider.refresh()
  );
  vscode.commands.registerCommand("jsonOutline.refreshNode", offset =>
    jsonOutlineProvider.refresh(offset)
  );
  vscode.commands.registerCommand("jsonOutline.renameNode", offset =>
    jsonOutlineProvider.rename(offset)
  );
  vscode.commands.registerCommand("extension.openJsonSelection", range =>
    jsonOutlineProvider.select(range)
  );
}
