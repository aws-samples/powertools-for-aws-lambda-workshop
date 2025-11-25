import { Stack, type StackProps, Tags } from 'aws-cdk-lib';
import {
  BlockDeviceVolume,
  Instance,
  InstanceType,
  MachineImage,
  Port,
  SubnetType,
  UserData,
  type Vpc,
} from 'aws-cdk-lib/aws-ec2';
import type { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { InstanceIdTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import type { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  idePort,
  nodeVersion,
  osPackages,
  pythonVersion,
  whoamiUser,
  workshopDirectory,
  zshrcTemplateUrl,
} from './constants.js';

interface ComputeConstructProps extends StackProps {
  /**
   * The VPC to deploy the compute resources into.
   */
  vpc: Vpc;
  /**
   * The vscode password from CfnParameter.
   */
  vscodePassword: string;
  /**
   * Assets for the workshop.
   */
  workshopAssets: Asset;
  /**
   * Workshop Studio asset prefix. Used only in Workshop Studio, not during development.
   */
  wsAssetPrefix: string;
  /**
   * Workshop Studio asset bucket. Used only in Workshop Studio, not during development.
   */
  wsAssetBucket: string;
}

export class ComputeConstruct extends Construct {
  public readonly instance: Instance;
  public readonly target: InstanceIdTarget;

  public constructor(
    scope: Construct,
    id: string,
    props: ComputeConstructProps
  ) {
    super(scope, id);

    const {
      vpc,
      vscodePassword,
      workshopAssets,
      wsAssetBucket,
      wsAssetPrefix,
    } = props;

    const userData = UserData.forLinux();
    userData.addCommands(
      'yum clean all',
      // Install general dependencies
      `yum install -y --downloadonly  ${osPackages.join(' ')}`,
      'sleep 20',
      `yum install -y ${osPackages.join(' ')}`,
      // Setup docker
      'service docker start',
      `usermod -aG docker ${whoamiUser}`,
      // Increse file watchers
      'ulimit -n 65536',
      // Setup zsh and oh-my-zsh
      `chsh -s $(which zsh) ${whoamiUser}`,
      this.#runCommandAsWhoamiUser(
        `sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended`
      ),
      // Download .zshrc template
      this.#runCommandAsWhoamiUser(
        `curl -fsSL ${zshrcTemplateUrl} -o $HOME/.zshrc`
      ),
      // Install Pyenv (Python version manager)
      this.#runCommandAsWhoamiUser('curl -s https://pyenv.run | zsh'),
      // Install fnm (Node.js version manager)
      this.#runCommandAsWhoamiUser(
        'curl -fsSL https://fnm.vercel.app/install | zsh'
      ),
      // Setup Python
      this.#runCommandAsWhoamiUser(
        `export PATH="$HOME/.pyenv/bin:$PATH"`,
        `eval "$(pyenv init --path)"`,
        `pyenv install ${pythonVersion}`,
        `pyenv global ${pythonVersion}`
      ),
      // Setup Node
      this.#runCommandAsWhoamiUser(
        `export PATH="$HOME/.local/share/fnm:$PATH"`,
        `eval "\`fnm env\`"`,
        `fnm install ${nodeVersion}`,
        `fnm use ${nodeVersion}`,
        `fnm default ${nodeVersion}`,
        'npm install -g esbuild'
      ),
      // Install AWS CLI
      this.#runCommandAsWhoamiUser(
        'curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o $HOME/awscliv2.zip',
        'unzip $HOME/awscliv2.zip',
        'sudo $HOME/aws/install',
        'rm -rf $HOME/awscliv2.zip $HOME/aws',
        `aws configure set region ${Stack.of(this).region}`,
        'sleep 20'
      ),
      // Configure git
      this.#runCommandAsWhoamiUser(
        'git config --global init.defaultBranch main'
      ),
      // Create parameter & write to config.yaml + SSM
      this.#runCommandAsWhoamiUser(
        'mkdir -p $HOME/.config/code-server',
        `echo -e "bind-addr: 0.0.0.0:8080\nauth: password\npassword: ${vscodePassword}\ncert: false" > $HOME/.config/code-server/config.yaml`
      ),
      // Install & configure VSCode
      this.#runCommandAsWhoamiUser(
        'curl -fsSL https://code-server.dev/install.sh | sh -s -- --version=4.104.3',
        'code-server --install-extension ms-python.python',
        'code-server --install-extension biomejs.biome'
      ),
      // Configure VSCode preferences
      this.#runCommandAsWhoamiUser(
        `mkdir -p /home/${whoamiUser}/${workshopDirectory}`,
        `mkdir -p /home/${whoamiUser}/.local/share/code-server/User`,
        `tee /home/${whoamiUser}/.local/share/code-server/User/settings.json <<EOF
{
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "terminal.integrated.cwd": "/home/${whoamiUser}/${workshopDirectory}",
  "telemetry.telemetryLevel": "off",
  "security.workspace.trust.startupPrompt": "never",
  "security.workspace.trust.enabled": false,
  "security.workspace.trust.banner": "never",
  "security.workspace.trust.emptyWindow": false,
  "editor.indentSize": "tabSize",
  "editor.tabSize": 2,
  "python.testing.pytestEnabled": true,
  "biome.lsp.bin": "/home/${whoamiUser}/${workshopDirectory}/typescript/src/node_modules/.bin/biome",
  "chat.agent.enabled": false,
  "chat.disableAIFeatures": true,
  "auto-run-command.rules": [
    {
      "command": "workbench.action.terminal.new"
    }
  ]
}
EOF
`
      ),
      `systemctl enable --now code-server@${whoamiUser}`,
      // Install SAM CLI
      this.#runCommandAsWhoamiUser(
        'curl -LO https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip',
        'unzip -q aws-sam-cli-linux-x86_64.zip -d sam-installation',
        'sudo ./sam-installation/install',
        'rm -rf sam-installation aws-sam-cli-linux-*'
      ),
      // Configure workspace
      this.#runCommandAsWhoamiUser(
        // Put the two asset bucket URLs in a file for easier troubleshooting - if the download fails, we can check the file to see which bucket was used
        // if it succeeds, the files will be deleted at the end of the script
        `echo -e 's3://${wsAssetBucket}/${wsAssetPrefix}${workshopAssets.s3ObjectKey}' > /home/${whoamiUser}/${workshopDirectory}/asset-bucket-ws.txt`,
        `echo -e 's3://${workshopAssets.bucket.bucketName}/${workshopAssets.s3ObjectKey}' > /home/${whoamiUser}/${workshopDirectory}/asset-bucket.txt`
      ),
      this.#runCommandAsWhoamiUser(
        // Download assets from WS (only works during workshop deployment)
        `aws s3 cp s3://${wsAssetBucket}/${wsAssetPrefix}${workshopAssets.s3ObjectKey} /home/${whoamiUser}/${workshopDirectory}`
      ),
      this.#runCommandAsWhoamiUser(
        // If the download fails, attempt to download from the own bucket (only works during dev)
        `aws s3 cp s3://${workshopAssets.bucket.bucketName}/${workshopAssets.s3ObjectKey} /home/${whoamiUser}/${workshopDirectory}`
      ),
      this.#runCommandAsWhoamiUser(
        // Unzip assets
        `unzip /home/${whoamiUser}/${workshopDirectory}/${workshopAssets.s3ObjectKey} -d /home/${whoamiUser}/${workshopDirectory}`,
        // Clean up
        `rm -f /home/${whoamiUser}/${workshopDirectory}/${workshopAssets.s3ObjectKey}`,
        `rm -f /home/${whoamiUser}/${workshopDirectory}/asset-bucket-ws.txt`,
        `rm -f /home/${whoamiUser}/${workshopDirectory}/asset-bucket.txt`
      ),
      // Set Account ID & Region
      `echo 'export AWS_REGION=${Stack.of(this).region}' >> $HOME/.zshrc`,
      `echo 'export AWS_ACCOUNT_ID=${Stack.of(this).account}' >> $HOME/.zshrc`,
      `echo 'export CDK_DEFAULT_REGION=${
        Stack.of(this).region
      }' >> $HOME/.zshrc`,
      `echo 'export CDK_DEFAULT_ACCOUNT=${
        Stack.of(this).account
      }' >> $HOME/.zshrc`,
      // Bootstrap CDK
      this.#runCommandAsWhoamiUser(
        `export PATH="/home/${whoamiUser}/.local/share/fnm:$PATH"`,
        `eval "\`fnm env\`"`,
        `cd /home/${whoamiUser}/${workshopDirectory}/typescript/src`,
        'npm ci',
      ),
      // Finally, reboot the instance
      'reboot'
    );

    this.instance = new Instance(this, 'ide-instance', {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: new InstanceType('c5.large'),
      machineImage: MachineImage.fromSsmParameter(
        '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64'
      ),
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(50),
        },
      ],
      userDataCausesReplacement: true,
      userData: userData,
    });
    Tags.of(this.instance).add('Name', 'VSCode');

    this.instance.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM')
    );
    this.instance.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
    );
    workshopAssets.grantRead(this.instance);

    this.target = new InstanceIdTarget(
      this.instance.instanceId,
      Number.parseInt(idePort)
    );

    NagSuppressions.addResourceSuppressions(
      this.instance,
      [
        {
          id: 'AwsSolutions-EC26',
          reason:
            'This instance is used exclusively to provide a browser-based IDE to attendants for the duration of the workshop.',
        },
        {
          id: 'AwsSolutions-EC28',
          reason:
            'This instance is used exclusively to provide a browser-based IDE to attendants for the duration of the workshop.',
        },
        {
          id: 'AwsSolutions-EC29',
          reason:
            'This instance is used exclusively to provide a browser-based IDE to attendants for the duration of the workshop.',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'This instance is used exclusively to provide a browser-based IDE to attendants for the duration of the workshop.',
        },
      ],
      true
    );
  }

  #runCommandAsWhoamiUser(...commands: string[]): string {
    return `su - ${whoamiUser} -c '${commands.join(' && ')}'`;
  }

  /**
   * Allow inbound HTTP from the load balancer on the configured IDE port.
   *
   * @param loadBalancer - The load balancer to allow inbound HTTP from.
   */
  public allowConnectionFromLoadBalancer(
    loadBalancer: ApplicationLoadBalancer
  ): void {
    this.instance.connections.allowFrom(
      loadBalancer,
      Port.tcp(Number.parseInt(idePort)),
      'Allow inbound HTTP from load balancer'
    );
  }
}
