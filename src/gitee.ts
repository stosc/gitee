import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as axios from "axios";
import * as execa from 'execa';



export class GiteeReposProvider implements vscode.TreeDataProvider<GiteeRepos | ReposItem> {
  async test() {
    //const r = await this.checkExistence(vscode.Uri.file(process.cwd()));
    //const r = await this.addRemote("https://gitee.com/zkzyrz/test");
    try {
      const filename = `${os.homedir}\\.ssh\\id_rsa_${Date.now().toString()}`;
      const r = await execa(`ssh-keygen -t rsa -N "${this.giteePwd}" -C "${this.giteeId}" -f ${filename}`);
      
      var contentText = fs.readFileSync(`${filename}.pub`,'utf-8');
      
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
  outChannel:vscode.OutputChannel = vscode.window.createOutputChannel("gitee");


  createEntReposView() {
    this.createWebView('新建企业代码仓库', this.getWebViewContent('src/view/createEntRepos.html'), this.enterpriseList);
  }
  createOrgReposView() {
    this.createWebView('新建组织代码仓库', this.getWebViewContent('src/view/createOrgRepos.html'), this.organizationList);
  }
  createReposView() {
    this.createWebView('新建代码仓库', this.getWebViewContent('src/view/createRepos.html'));
  }

  async addRemote(addr:string):Promise<{statue:boolean,msg:string}> {
    let url = this.getWorkspaceUrl();
    if(url){
      let s = await this.checkExistence(url);
      if(!s){
        return {statue:false,msg:`没有安装Git`};
      }
      let r = await this.checkExistRepository(url);
      if(!r){
        return {statue:false,msg:`没有初始化git仓库！`};
      }
      let a = await this.execute(`git remote -v`, url);
      if(a.stdout !== ""){        
        return {statue:false,msg:`已经存在以下远程仓库${a.stdout}`};
      }
      let ar = await this.execute(`git remote add origin ${addr}`, url);
      return {statue:true,msg:``};

    }else{
      return {statue:false,msg:`没有打开的工作区`};
    }    
  }

  private getWorkspaceUrl():vscode.Uri | undefined{
    if(vscode.workspace.rootPath){
      return vscode.Uri.parse(vscode.workspace.rootPath);
    }else{
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

  private async execute(cmd: string,uri: vscode.Uri): Promise<{ stdout: string; stderr: string }> {
    const [git, ...args] = cmd.split(' ');
    this.outChannel.show();
    this.outChannel.appendLine(`${git} ${args.join(' ')}`);
    return execa(git, args, { cwd: uri.fsPath }) ;
}

  private createRepos(url:string,data:string){
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

    panel.webview.onDidReceiveMessage(message => {
      switch (message.category) {
        case "getData":
          panel.webview.postMessage(postData);
          break;
        case "person":          
          this.createRepos("https://gitee.com/api/v5/user/repos",message.data);
          break;
        case "group":
          this.createRepos(`https://gitee.com/api/v5/orgs/${message.path}/repos`,message.data);
          break;
        case "ent":
          this.createRepos(`https://gitee.com/api/v5/enterprises/${message.path}/repos`,message.data);
          break;
      }
      if (message.category === "getData") {
        panel.webview.postMessage(postData);
      }
    }, undefined, this.context.subscriptions);

    panel.webview.html = content;
  }


  async loginGitee() {
    this.giteeId = this.context.globalState.get("gitee_id");
    this.giteePwd = this.context.globalState.get("gitee_pwd");
    if(!(this.giteeId&&this.giteePwd)){
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
      this.context.globalState.update("gitee_id",this.giteeId);
      this.context.globalState.update("gitee_pwd",this.giteePwd);
      this.refresh();
    }).catch(err => {
      this.giteeId = undefined;
      this.giteePwd = undefined;
      vscode.window.showErrorMessage('Gitee id or password is error!');
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
      res.data.forEach((e: { name: string; html_url: string; namespace: { type: string, path: string }; }) => {
        const r = new GiteeRepos(e.name, e.html_url, vscode.TreeItemCollapsibleState.None,{command:'gitee.clone',title:'clone',arguments:[e.html_url]});
        switch (e.namespace.type) {
          case "enterprise":
            this.enterpriseRepos.push(r);
            if (this.enterpriseList.indexOf(e.namespace.path) < 0) {
              this.enterpriseList.push(e.namespace.path);
            }
            break;
          case "group":
            this.organizationRepos.push(r);
            if (this.organizationList.indexOf(e.namespace.path) < 0) {
              this.organizationList.push(e.namespace.path);
            }
            break;
          default:
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
    await this.getRepos();

  }

  getTreeItem(element: GiteeRepos | ReposItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: GiteeRepos): Thenable<GiteeRepos[] | ReposItem[]> {
    if (this.giteeToken === '') {
      vscode.window.showInformationMessage("请先登陆你的gitee账号");
      return Promise.resolve([]);
    }
    if (element) {
      switch (element.fullName) {
        case "个人项目":
          return Promise.resolve(this.personalRepos);
        case "企业项目":
          return Promise.resolve(this.enterpriseRepos);
        case "组织项目":
          return Promise.resolve(this.organizationRepos);
      }
    } else {
      return Promise.resolve([
        new GiteeRepos("个人项目", "", vscode.TreeItemCollapsibleState.Collapsed),
        new GiteeRepos("企业项目", "", vscode.TreeItemCollapsibleState.Collapsed),
        new GiteeRepos("组织项目", "", vscode.TreeItemCollapsibleState.Collapsed)
      ]);
    }
    return Promise.resolve([]);
  }

}

export class ReposItem extends vscode.TreeItem {

}


export class GiteeRepos extends vscode.TreeItem {
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
