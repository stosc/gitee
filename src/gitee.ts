import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as axios from "axios";
import * as execa from 'execa';
import * as shell from 'shelljs';
import { removeListener } from "cluster";



export class GiteeReposProvider implements vscode.TreeDataProvider<GiteeRepos | ReposItem> {
  async clone(node: GiteeRepos) {
    let items: vscode.QuickPickItem[] = [];
    items.push({ label: "克隆到...", detail: `克隆项目${node.fullName}到你选择的文件夹中，并在新的vscode实例中打开。` });
    if (vscode.workspace.rootPath) {
      items.push({ label: "克隆", detail: `克隆项目${node.fullName}到当前vscode已经打开的文件夹中。` });
    }
    const chosen: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(items);
    if (chosen) {
      let path: string;
      if (chosen.label === "克隆到...") {
        const f = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: "选择克隆到的文件夹" });
        path = f ? f[0].path : "";
      } else {
        const f = await vscode.window.showWorkspaceFolderPick();
        path = f ? f.uri.path : "";
      }
      if (path !== "") {
        this.giteeStatusBarItem.text = `$(pulse) 正在clone代码库...`;
        this.giteeStatusBarItem.show();
        //此处clong项目并为项目添加ssh-key
        //const sshkey = await this.getSSHKey();
       // const p = await this.setSSHKeyToRepo(sshkey.name, sshkey.key, node.owner, node.repo);
        let uri = vscode.Uri.file(path);
        const c = this.execByShell(`git clone ${node.sshUrl}`,uri);
       // let c = await this.execute(`git clone ${node.sshUrl}`, vscode.Uri.parse(path));
        await vscode.commands.executeCommand('vscode.openFolder', uri);
        this.giteeStatusBarItem.hide();
      }
    }
  }

  private execByShell(cmd:string,workDir:vscode.Uri){   
    this.outChannel.show();
    this.outChannel.appendLine(cmd);    
    switch(os.type()){
      case "Windows_NT":
          let cmds = `start cmd /c "cd /d "${workDir.fsPath}" & ${cmd}"`;
          shell.exec(cmds);
          break;
      case "Linux":
          
          break;
        case "Darwin":
          let shpath=`${os.tmpdir()}/gitee_run.sh`;
          shell.exec(`echo "#/bin/sh \n cd ${workDir.fsPath} \n ${cmd}" > ${shpath}`);
          shell.exec(`chmod +x ${shpath}`,{silent:true});
          shell.exec(`open -a Terminal ${shpath}`);
          break;
    }
    
  }



  async setSSHKey() {
    try {
      const sshkey = await this.getSSHKey();
      let reqConfig: axios.AxiosRequestConfig = {
        method: "post",
        url: `https://gitee.com/api/v5/user/keys`,
        data: `{"access_token":"${this.giteeToken}","key":"${sshkey.key.trim()}","title":"${sshkey.name}"}`,
        headers: {
          "Content-Type": "application/json"
        }
      };
      let dr = await axios.default.request(reqConfig);
      vscode.window.showInformationMessage(`SSH Key 注册成功！`);
    } catch (err) {
      //console.log(err);
      vscode.window.showErrorMessage("设置远程仓库失败");
    }
  }

  

  async  setRemote(node: GiteeRepos) {
    // 初始化选项列表清单
    let url = vscode.workspace.rootPath?vscode.workspace.rootPath:"";
    let remoteUrl = node.sshUrl;
    this.execByShell(`git remote add origin ${remoteUrl}`,vscode.Uri.parse(url));

  }
  
  

  async getSSHKey(): Promise<{ name: string, key: string }> {
    try {
      const filename = `${os.homedir}/.ssh/id_rsa`;
      const pubFile = `${filename}.pub`;
      if (!fs.existsSync(pubFile)) {
        const c = this.execByShell(`echo 一路回车按到底 & ssh-keygen -t rsa -C "${this.giteeId}"`,vscode.Uri.parse(os.homedir()));
        //const c = shell.exec(`start cmd /c "echo 一路回车按到底 & ssh-keygen -t rsa -C "${this.giteeId}" -f ${filename}"`);
        //const r = await this.execute(`start ${this.getTerminal()} /c "ssh-keygen -t rsa -C "${this.giteeId}" -f ${filename}"`, vscode.Uri.parse(process.execPath));
      }
      var contentText = fs.readFileSync(`${filename}.pub`, 'utf-8');
      return Promise.resolve({ name: `${this.giteeId}_${os.hostname()}_vscode`, key: `${contentText}` });
    } catch (error) {
      return Promise.resolve(error);
    }
  }
  async test(node: any) {
    //const r = await this.checkExistence(vscode.Uri.file(process.cwd()));
    //const r = await this.addRemote("https://gitee.com/zkzyrz/test");
    if (node) {

    }
    try {
      const filename = `${os.homedir}\\.ssh\\id_rsa_${Date.now().toString()}`;
      const r = await execa(`ssh-keygen -t rsa -N "${this.giteePwd}" -C "${this.giteeId}" -f ${filename}`);

      var contentText = fs.readFileSync(`${filename}.pub`, 'utf-8');

    } catch (error) {

    }

    // vscode.window.showInformationMessage(r.msg);
  }

  giteeId?: string = '';
  giteePwd?: string = '';
  giteeToken: string = '';
  giteeRefreshToker: string = '';
  personalRepos: GiteeRepos[] = [];
  enterpriseRepos: GiteeRepos[] = [];
  organizationRepos: GiteeRepos[] = [];
  context!: vscode.ExtensionContext;
  enterpriseList: string[] = [];
  organizationList: string[] = [];
  outChannel: vscode.OutputChannel = vscode.window.createOutputChannel("gitee");
  selectedRepos?: SshInfo = undefined;
  persionIconPath = {
    light: path.join(__filename, "..", "..", "resources", "light", "personal.png"),
    dark: path.join(__filename, "..", "..", "resources", "dark", "personal.png")
  };
  entIconPath = {
    light: path.join(__filename, "..", "..", "resources", "light", "ent.png"),
    dark: path.join(__filename, "..", "..", "resources", "dark", "ent.png")
  };
  orgIconPath = {
    light: path.join(__filename, "..", "..", "resources", "light", "group.png"),
    dark: path.join(__filename, "..", "..", "resources", "dark", "group.png")
  };

  giteeStatusBarItem: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1000);



  setSelectedRepos(ssh: SshInfo) {
    if (ssh.name === "") {
      this.selectedRepos = undefined;
    } else {
      this.selectedRepos = ssh;
    }

    vscode.window.showInformationMessage(`选择了【${this.selectedRepos ? this.selectedRepos.name : ""}】`);
  }
  createEntReposView() {
    this.createWebView('新建企业代码仓库', this.getWebViewContent('src/view/createEntRepos.html'), this.enterpriseList);
  }
  createOrgReposView() {
    this.createWebView('新建组织代码仓库', this.getWebViewContent('src/view/createOrgRepos.html'), this.organizationList);
  }
  createReposView() {
    this.createWebView('新建代码仓库', this.getWebViewContent('src/view/createRepos.html'));
  }

  async addRemote(addr: string): Promise<{ statue: boolean, msg: string }> {
    let url = this.getWorkspaceUrl();
    if (url) {
      let s = await this.checkExistence(url);
      if (!s) {
        return { statue: false, msg: `没有安装Git` };
      }
      let r = await this.checkExistRepository(url);
      if (!r) {
        return { statue: false, msg: `没有初始化git仓库！` };
      }
      let a = await this.execute(`git remote -v`, url);
      if (a.stdout !== "") {
        return { statue: false, msg: `已经存在以下远程仓库${a.stdout}` };
      }
      let ar = await this.execute(`git remote add origin ${addr}`, url);
      return { statue: true, msg: `` };

    } else {
      return { statue: false, msg: `没有打开的工作区` };
    }
  }

  private getWorkspaceUrl(): vscode.Uri | undefined {
    if (vscode.workspace.rootPath) {
      return vscode.Uri.parse(vscode.workspace.rootPath);
    } else {
      return undefined;
    }
  }


  async checkExistRepository(uri: vscode.Uri): Promise<boolean> {
    try {
      await this.execute('git status', uri);
      return true;
    } catch (e) {
      return false;
    }
  }

  async checkExistence(uri: vscode.Uri): Promise<boolean> {
    try {
      await this.execute('git --version', uri);
      return true;
    } catch (e) {
      return false;
    }
  }

  private async execute(cmd: string, uri: vscode.Uri): Promise<{ stdout: string; stderr: string }> {
    const [git, ...args] = cmd.split(' ');
    this.outChannel.show();
    this.outChannel.appendLine(`${git} ${args.join(' ')}`);
    return execa(git, args, { cwd: uri.fsPath });
  }

  private createRepos(url: string, data: string) {
    axios.default.post(url, `access_token=${this.giteeToken}&${data}`).then(res => {
      vscode.window.showInformationMessage("仓库创建成功！");
      this.refresh();
    }).catch(err => {
      vscode.window.showErrorMessage(err.response.data.error.namespace_path[0]);
    });
    const gitSCM = vscode.scm.createSourceControl('git', "Git");

  }

  private getWebViewContent(templatePath: string) {
    const resourcePath = path.join(this.context.extensionPath, templatePath);
    const dirPath = path.dirname(resourcePath);
    let html = fs.readFileSync(resourcePath, 'utf-8');
    // html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
    //   return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
    // });
    return html;
  }

  private createWebView(title: string, content: string, postData: any = undefined) {
    const panel = vscode.window.createWebviewPanel('createRepos', title, vscode.ViewColumn.One, {
      enableScripts: true
    });

    panel.webview.onDidReceiveMessage((message: { category: string; data: string; path: any; }) => {
      switch (message.category) {
        case "getData":
          panel.webview.postMessage(postData);
          break;
        case "person":
          this.createRepos("https://gitee.com/api/v5/user/repos", message.data);
          break;
        case "group":
          this.createRepos(`https://gitee.com/api/v5/orgs/${message.path}/repos`, message.data);
          break;
        case "ent":
          this.createRepos(`https://gitee.com/api/v5/enterprises/${message.path}/repos`, message.data);
          break;
      }
      if (message.category === "getData") {
        panel.webview.postMessage(postData);
      }
    }, undefined, this.context.subscriptions);

    panel.webview.html = content;
  }

  // async setSSHKey() {
  //   try {
  //     const filename = `${os.homedir}\\.ssh\\id_rsa_${Date.now().toString()}`;
  //     const r = await execa(`ssh-keygen -t rsa -N "${this.giteePwd}" -C "${this.giteeId}" -f ${filename}`);
  //     const key = fs.readFileSync(`${filename}.pub`, 'utf-8');
  //   } catch (error) {

  //   }
  // }

  async loginGitee() {
    this.giteeStatusBarItem.text = "$(pulse) 正在尝试登陆Gitee...";
    this.giteeStatusBarItem.tooltip = "gitee插件";
    this.giteeStatusBarItem.show();
    this.giteeId = this.context.globalState.get("gitee_id");
    this.giteePwd = this.context.globalState.get("gitee_pwd");
    if (!(this.giteeId && this.giteePwd)) {
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
    }
    axios.default.post('https://gitee.com/oauth/token', `grant_type=password&username=${this.giteeId}&password=${this.giteePwd}&client_id=f08290536f267056e6a89ea254eabb9c32d4df0f7fbf869c1fb950938054a49f&client_secret=718ce76856951418792c020ff91a582e23c5e4e9202275bd71b56bf12419f3c6&scope=user_info projects pull_requests issues notes keys hook groups gists enterprises`).then(res => {
      this.giteeToken = res.data.access_token;
      this.giteeRefreshToker = res.data.refresh_token;
      this.context.globalState.update("gitee_id", this.giteeId);
      this.context.globalState.update("gitee_pwd", this.giteePwd);
      this.refresh();
      this.setSSHKey();

    }).catch(err => {

      if (err.toString() === "Error: Request failed with status code 401") {
        this.giteeId = undefined;
        this.giteePwd = undefined;
        this.context.globalState.update("gitee_id", this.giteeId);
        this.context.globalState.update("gitee_pwd", this.giteePwd);
        vscode.window.showErrorMessage('登陆失败，检查用户名或密码！');
      } else {
        vscode.window.showErrorMessage('登陆失败，检查网络链接！');
      }
      this.giteeStatusBarItem.hide();
    });
  }

  private pushDataToArray(array: string[], item: string) {

  }

  private async getRepos(): Promise<void> {
    this.personalRepos = [];
    this.enterpriseRepos = [];
    this.organizationRepos = [];
    this.enterpriseList = [];
    this.organizationList = [];

    axios.default.get(`https://gitee.com/api/v5/user/repos?access_token=${this.giteeToken}&sort=full_name&page=1&per_page=1000`).then(res => {
      res.data.forEach((e: { name: string; html_url: string; ssh_url: string; description: string; path: string; namespace: { type: string, path: string }; }) => {
        const r = new GiteeRepos(e.name, e.html_url, e.ssh_url, e.description, e.namespace.path, e.path, vscode.TreeItemCollapsibleState.None, { command: 'gitee.selectedRepos', title: 'selected', arguments: [] });
        switch (e.namespace.type) {
          case "enterprise":
            r.iconPath = this.entIconPath;
            r.category = "企业项目";
            this.enterpriseRepos.push(r);
            if (this.enterpriseList.indexOf(e.namespace.path) < 0) {
              this.enterpriseList.push(e.namespace.path);
            }
            break;
          case "group":
            r.iconPath = this.orgIconPath;
            r.category = "组织项目";
            this.organizationRepos.push(r);
            if (this.organizationList.indexOf(e.namespace.path) < 0) {
              this.organizationList.push(e.namespace.path);
            }
            break;
          default:
            r.iconPath = this.persionIconPath;
            this.personalRepos.push(r);
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


  private _onDidChangeTreeData: vscode.EventEmitter<GiteeRepos | ReposItem | undefined> = new vscode.EventEmitter<GiteeRepos | ReposItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<GiteeRepos | ReposItem | undefined> = this._onDidChangeTreeData.event;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async refresh(): Promise<void> {
    this.giteeStatusBarItem.text = `$(pulse) 正在刷新代码长裤信息...`;
    this.giteeStatusBarItem.show();
    await this.getRepos();
    this.giteeStatusBarItem.hide();
  }

  getTreeItem(element: GiteeRepos | ReposItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GiteeRepos): Thenable<GiteeRepos[] | ReposItem[]> {
    if (this.giteeToken === '') {
      vscode.window.showInformationMessage("请先登陆你的gitee账号");
      return Promise.resolve([]);
    } else {
      return Promise.resolve(this.personalRepos.concat(this.enterpriseRepos).concat(this.organizationRepos));
    }
    // if (element) {
    //   switch (element.fullName) {
    //     case "个人项目":
    //       return Promise.resolve(this.personalRepos.concat(this.enterpriseRepos).concat(this.organizationRepos));
    //     case "企业项目":
    //       return Promise.resolve(this.enterpriseRepos);
    //     case "组织项目":
    //       return Promise.resolve(this.organizationRepos);
    //   }
    // } else {
    //   return Promise.resolve([
    //     new ReposItem("个人项目", vscode.TreeItemCollapsibleState.Collapsed, { command: 'gitee.selectedRepos', title: 'selected', arguments: [new SshInfo("")] }),
    //     new ReposItem("企业项目", vscode.TreeItemCollapsibleState.Collapsed, { command: 'gitee.selectedRepos', title: 'selected', arguments: [new SshInfo("")] }),
    //     new ReposItem("组织项目", vscode.TreeItemCollapsibleState.Collapsed, { command: 'gitee.selectedRepos', title: 'selected', arguments: [new SshInfo("")] })
    //   ]);
    // }
    // return Promise.resolve([]);
  }

}

export class SshInfo {
  constructor(
    public name: string,
    public sshUrl: string = "",
    public owner: string = "",
    public repo: string = "",
    public key: string = "",
    public title: string = ""

  ) {

  }

}

export class ReposItem extends vscode.TreeItem {
  constructor(
    public readonly fullName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(fullName, collapsibleState);
  }
}


export class GiteeRepos extends vscode.TreeItem {
  constructor(
    public readonly fullName: string,
    public htmlUrl: string,
    public sshUrl: string,
    public desc: string,
    public owner: string,
    public repo: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public category: string = "个人项目"

  ) {
    super(fullName, collapsibleState);
  }

  get tooltip(): string {
    return this.desc;
  }

  get description(): string {
    return `${this.category}`;
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

  contextValue = "giteeRepos";
}
