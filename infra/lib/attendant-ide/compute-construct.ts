import { Stack, Tags, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  type Vpc,
  UserData,
  Instance,
  InstanceType,
  SubnetType,
  MachineImage,
  BlockDeviceVolume,
  Port,
} from 'aws-cdk-lib/aws-ec2';
import { InstanceIdTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import {
  dotNetRepo,
  idePort,
  nodeVersion,
  osPackages,
  pythonVersion,
  whoamiUser,
  workshopDirectory,
  workshopRepo,
  zshrcTemplateUrl,
} from './constants.js';
import { ApplicationLoadBalancer } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { NagSuppressions } from 'cdk-nag';

interface ComputeConstructProps extends StackProps {
  /**
   * The VPC to deploy the compute resources into.
   */
  vpc: Vpc;
  /**
   * The bucket name of the website to deploy.
   */
  websiteBucketName: string;
  /**
   * The vscode password from CfnParameter.
   */
  vscodePassword: string;

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

    const { vpc } = props;

    const userData = UserData.forLinux();
    userData.addCommands(
      // Add .NET repo
      `rpm -Uvh ${dotNetRepo}`,
      `yum clean all`,
      // Install general dependencies
      `yum install -y --downloadonly  ${osPackages.join(' ')}`,
      `sleep 20`,
      `yum install -y ${osPackages.join(' ')}`,
      // Setup docker
      'service docker start',
      `usermod -aG docker ${whoamiUser}`,
      // Increse file watchers
      `ulimit -n 65536`,
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
      this.#runCommandAsWhoamiUser(`curl -s https://pyenv.run | zsh`),
      // Install fnm (Node.js version manager)
      this.#runCommandAsWhoamiUser(
        `curl -fsSL https://fnm.vercel.app/install | zsh`
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
        `fnm default ${nodeVersion}`
      ),
      // Setup .NET
      `dotnet tool install -g Amazon.Lambda.Tools dotnet new -i "Amazon.Lambda.Templates::*"`,
      // Setup Java
      'wget https://dlcdn.apache.org/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.zip',
      'unzip apache-maven-3.9.5-bin.zip -d /opt',
      'ln -s /opt/apache-maven-3.9.5/ /opt/maven',
      'echo "export M2_HOME=/opt/maven" | tee /etc/profile.d/mvn.sh',
      'echo "export PATH=${M2_HOME}/bin:${PATH}" | tee -a /etc/profile.d/mvn.sh',
      'chmod a+x /etc/profile.d/mvn.sh',
      // Install AWS CLI
      this.#runCommandAsWhoamiUser(
        `curl https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip -o $HOME/awscliv2.zip`,
        `unzip $HOME/awscliv2.zip`,
        `sudo $HOME/aws/install`,
        `rm -rf $HOME/awscliv2.zip $HOME/aws`,
        `aws configure set region ${Stack.of(this).region}`,
        `sleep 20`
      ),
      // Configure git
      this.#runCommandAsWhoamiUser(
        'git config --global init.defaultBranch main'
      ),
      // Create parameter & write to config.yaml + SSM
      this.#runCommandAsWhoamiUser(
        `mkdir -p $HOME/.config/code-server`,
        `echo -e "bind-addr: 0.0.0.0:8080\nauth: password\npassword: ${props.vscodePassword}\ncert: false" > $HOME/.config/code-server/config.yaml`
      ),
      // Install VSCode
      this.#runCommandAsWhoamiUser(
        `curl -fsSL https://code-server.dev/install.sh | sh`,
        `code-server --install-extension ms-python.python`,
        `code-server --install-extension vscjava.vscode-java-pack`,
        `code-server --install-extension muhammad-sammy.csharp`
      ),
      // Configure VSCode preferences
      this.#runCommandAsWhoamiUser(
        `mkdir -p /home/${whoamiUser}/${workshopDirectory}`,
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
      // Clone Workshop repo & install dependencies
      this.#runCommandAsWhoamiUser(
        `git clone https://github.com/${workshopRepo}.git $HOME/${workshopDirectory}`,
        `export PATH="$HOME/.local/share/fnm:$PATH"`,
        `eval "\`fnm env\`"`,
        `cd /home/${whoamiUser}/${workshopDirectory}`,
        `npm ci`,
        `npm run utils:createConfig`,
        `npm run frontend:build`,
        `aws s3 cp --recursive ./frontend/build s3://${props.websiteBucketName}`
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
        `cd /home/${whoamiUser}/${workshopDirectory}`,
        `npx cdk bootstrap aws://${Stack.of(this).account}/${
          Stack.of(this).region
        }`
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

    this.target = new InstanceIdTarget(
      this.instance.instanceId,
      parseInt(idePort)
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
      Port.tcp(parseInt(idePort)),
      'Allow inbound HTTP from load balancer'
    );
  }
}
