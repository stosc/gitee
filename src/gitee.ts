import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as axios from "axios";



export class GiteeReopProvider implements vscode.TreeDataProvider<GiteeReop | ReopItem> {

  giteeId: string = '';
  giteePwd: string = '';
  giteeToken: string = '';
  giteeRefreshToker: string = '';
  personalReops: GiteeReop[] = [];
  enterpriseReops: GiteeReop[] = [];
  organizationReops: GiteeReop[] = [];

  createEntReop() {
    throw new Error("Method not implemented.");
  }
  createOrgReop() {
    throw new Error("Method not implemented.");
  }
  createReop() {
    this.createWebView('新建代码仓库', this.getCreateReopHtml());
  }

  private createWebView(title: string, content: string) {
    const panel = vscode.window.createWebviewPanel('createReop', title, vscode.ViewColumn.One, {
      enableScripts: true
    });
    panel.webview.html = content;
  }

  private getCreateReopHtml(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="http://cdn.clouddeep.cn/amazeui/1.0.1/css/amazeui.min.css">
        <title>新建仓库</title>
    </head>
    <body>  
    <style>
    body,input,legend{
      background:var(--vscode-editor-background);
      color:var(--vscode-editor-foreground);
    }
    .am-form{
      background:var(--vscode-editor-background);
    }
    </style>      
        <form class="am-form">
          <fieldset>
            <legend>新建仓库</legend>

            <div class="am-form-group">
              <label for="doc-ipt-email-1">仓库名称</label>
              <input type="text" name="name" class="" id="doc-ipt-email-1" placeholder="输入仓库名称">
            </div>

            <div class="am-form-group">
              <label for="doc-ipt-email-1">仓库描述</label>
              <input type="text" name="description" class="" id="doc-ipt-email-1" placeholder="输入仓库描述">
            </div>

            <div class="am-form-group">
              <label for="doc-select-1">允许提Issue与否</label>
              <select name="has_issues">
                <option value="true">提供Issue</option>
                <option value="false">不提供Issue</option>                
              </select>
              <span class="am-form-caret"></span>
            </div>

            <div class="am-form-group">
              <label for="doc-select-1">提供Wiki与否</label>
              <select name="has_wiki">
                <option value="true">提供Wiki</option>
                <option value="false">不提供Wiki</option>                
              </select>
              <span class="am-form-caret"></span>
            </div>
            <div class="am-form-group">
              <label for="doc-select-1">仓库私有</label>
              <select name="private">
              <option value="false">仓库私有</option>
                <option value="true">仓库公开</option>                                
              </select>
              <span class="am-form-caret"></span>
            </div>
            <p><button type="submit" class="am-btn am-btn-default">提交</button></p>
          </fieldset>
        </form>
        <script>
            
        </script>
    </body>
    </html>
    `;

  }

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

  private async getReops(): Promise<void> {
    this.personalReops = [];
    this.enterpriseReops = [];
    this.organizationReops = [];

    axios.default.get(`https://gitee.com/api/v5/user/repos?access_token=${this.giteeToken}&sort=full_name&page=1&per_page=1000`).then(res => {
      res.data.forEach((e: { name: string; html_url: string; namespace: { type: string }; }) => {
        const r = new GiteeReop(e.name, e.html_url, vscode.TreeItemCollapsibleState.None);
        switch (e.namespace.type) {
          case "enterprise":
            this.enterpriseReops.push(r);
            break;
          case "organization":
            this.organizationReops.push(r);
            break;
          default:
            this.personalReops.push(r);
            break;
        }
      });
      this._onDidChangeTreeData.fire();
      return Promise.resolve();

    }).catch(err => {
      vscode.window.showErrorMessage('Gitee id or password is error!');
      return Promise.reject();
    });

  }


  private _onDidChangeTreeData: vscode.EventEmitter<GiteeReop | ReopItem | undefined> = new vscode.EventEmitter<GiteeReop | ReopItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<GiteeReop | ReopItem | undefined> = this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string | undefined) { }

  async refresh(): Promise<void> {
    await this.getReops();

  }

  getTreeItem(element: GiteeReop | ReopItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GiteeReop): Thenable<GiteeReop[] | ReopItem[]> {
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

export class ReopItem extends vscode.TreeItem {

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
    return `${this.fullName}-${this.htmlUrl}`;
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
