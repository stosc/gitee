import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as axios from "axios";



export class GiteeReopProvider implements vscode.TreeDataProvider<GiteeReop> {
  giteeId: string = '';
  giteePwd: string = '';
  giteeToken: string = '';
  giteeRefreshToker: string = '';
  personalReops: GiteeReop[] = [];
  enterpriseReops: GiteeReop[] = [];
  organizationReops: GiteeReop[] = [];
  async loginGitee() {
    const options = {
      ignoreFocusOut: true,
      password: false,
      prompt: '请输入你的gitee账户用户名/电话/e-mail'
    };
    const pwdoptions = {
      ignoreFocusOut: true,
      password: true,
      prompt: '请输入gitee的登陆密码'
    };

    let value = await vscode.window.showInputBox(options);
    if (!value) {
      vscode.window.showErrorMessage('没有获取到gitee账户用户名/电话/e-mail');
      return;
    } else {
      this.giteeId = value.trim();
    }
    value = await vscode.window.showInputBox(pwdoptions);
    if (!value) {
      vscode.window.showErrorMessage('没有获取到gitee的登陆密码');
      return;
    } else {
      this.giteePwd = value.trim();
    }
    axios.default.post('https://gitee.com/oauth/token', `grant_type=password&username=${this.giteeId}&password=${this.giteePwd}&client_id=f08290536f267056e6a89ea254eabb9c32d4df0f7fbf869c1fb950938054a49f&client_secret=718ce76856951418792c020ff91a582e23c5e4e9202275bd71b56bf12419f3c6&scope=user_info projects pull_requests issues notes keys hook groups gists enterprises`).then(res => {
      this.giteeToken = res.data.access_token;
      this.giteeRefreshToker = res.data.refresh_token;
      this.refresh();
    }).catch(err => {
      vscode.window.showErrorMessage('Gitee id or password is error!');
    });
  }

  private async getReops():Promise<void> {
    this.personalReops = [];
    this.enterpriseReops = [];
    this.organizationReops = [];

    axios.default.get(`https://gitee.com/api/v5/user/repos?access_token=${this.giteeToken}&sort=full_name&page=1&per_page=1000`).then(res => {
      res.data.forEach((e: { name: string; html_url: string; namespace: string; }) => {
        const r = new GiteeReop(e.name, e.html_url, vscode.TreeItemCollapsibleState.None);
        switch (e.namespace) {
          case "personal":
            this.personalReops.push(r);
          case "enterprise":
            this.enterpriseReops.push(r);
          case "organization":
            this.organizationReops.push(r);
        }        
      });
      this._onDidChangeTreeData.fire();
      return Promise.resolve();

    }).catch(err => {
      vscode.window.showErrorMessage('Gitee id or password is error!');
      return Promise.reject();
    });

  }


  private _onDidChangeTreeData: vscode.EventEmitter<GiteeReop | undefined> = new vscode.EventEmitter<GiteeReop | undefined>();
  readonly onDidChangeTreeData: vscode.Event<GiteeReop | undefined> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string | undefined) { }

  async refresh(): Promise<void> {
    await this.getReops();
    
  }

  getTreeItem(element: GiteeReop): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GiteeReop): Thenable<GiteeReop[]> {
    if (this.giteeToken === '') {
      vscode.window.showInformationMessage("请先登陆你的gitee账号");
      return Promise.resolve([]);
    }
    if (element) {
      switch (element.fullName) {
        case "个人项目":
            return Promise.resolve(this.personalReops);
        case "企业项目":
            return Promise.resolve(this.enterpriseReops);
        case "组织项目":
            return Promise.resolve(this.organizationReops);
      }     
    } else {
      return Promise.resolve([
        new GiteeReop("个人项目", "", vscode.TreeItemCollapsibleState.Collapsed),
        new GiteeReop("企业项目", "", vscode.TreeItemCollapsibleState.Collapsed),
        new GiteeReop("组织项目", "", vscode.TreeItemCollapsibleState.Collapsed)
      ]);
    }
    return Promise.resolve([]);
  }

  private getReposForGitee(): GiteeReop[] {
    return [new GiteeReop("XiZhaoIP/AlbbAdmin", "", vscode.TreeItemCollapsibleState.None)];
  }

  /**
   * Given the path to package.json, read all its dependencies and devDependencies.
   */
  private getDepsInPackageJson(packageJsonPath: string): GiteeReop[] {
    if (this.pathExists(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const toDep = (moduleName: string, version: string): GiteeReop => {
        if (
          this.pathExists(
            path.join(this.workspaceRoot ? this.workspaceRoot : '', "node_modules", moduleName)
          )
        ) {
          return new GiteeReop(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.Collapsed
          );
        } else {
          return new GiteeReop(
            moduleName,
            version,
            vscode.TreeItemCollapsibleState.None,
            {
              command: "extension.openPackageOnNpm",
              title: "",
              arguments: [moduleName]
            }
          );
        }
      };

      const deps = packageJson.dependencies
        ? Object.keys(packageJson.dependencies).map(dep =>
          toDep(dep, packageJson.dependencies[dep])
        )
        : [];
      const devDeps = packageJson.devDependencies
        ? Object.keys(packageJson.devDependencies).map(dep =>
          toDep(dep, packageJson.devDependencies[dep])
        )
        : [];
      return deps.concat(devDeps);
    } else {
      return [];
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }



}

export class GiteeReop extends vscode.TreeItem {
  constructor(
    public readonly fullName: string,
    private htmlUrl: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(fullName, collapsibleState);
  }

  get tooltip(): string {
    return `${this.label}-${this.htmlUrl}`;
  }

  get description(): string {
    return this.htmlUrl;
  }

  iconPath = {
    light: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "light",
      "dependency.svg"
    ),
    dark: path.join(
      __filename,
      "..",
      "..",
      "resources",
      "dark",
      "dependency.svg"
    )
  };

  contextValue = "dependency";
}


export class GiteeCmd {


  reopProvider: GiteeReopProvider;

  constructor(reopProvider: GiteeReopProvider) {
    this.reopProvider = reopProvider;
  }


}
