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
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  idePort,
  osPackages,
  whoamiUser,
  workshopDirectory,
} from './constants';

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
   * Git repository URL for workshop content.
   */
  gitRepoUrl: string;
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
      gitRepoUrl,
    } = props;

    const userData = UserData.forLinux();
    userData.addCommands(
      // Allow ec2-user to use sudo without password
      `echo "${whoamiUser} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/${whoamiUser}`,
      `chmod 0440 /etc/sudoers.d/${whoamiUser}`,

      // Update system first
      'dnf update -y',
      'dnf clean all',

      // Install general dependencies
      `dnf install -y ${osPackages.join(' ')}`,
      // Increase file watchers
      'echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf',
      'sysctl -p',

      // Setup zsh and oh-my-zsh
      `chsh -s $(which zsh) ${whoamiUser}`,
      this.#runCommandAsWhoamiUser(
        `sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended`
      ),
      // Install Python 3.13 via dnf (simpler than pyenv)
      'dnf install -y python3.13',
      'alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 1',
      'alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 2',
      'alternatives --set python3 /usr/bin/python3.13',
      'alternatives --install /usr/bin/python python /usr/bin/python3 1',

      // Fix dnf to always use python3.9
      'sed -i "1s|.*|#!/usr/bin/python3.9|" /usr/bin/dnf',

      // Install Node.js 22 via NodeSource
      'curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -',
      'sleep 5',
      'dnf install -y nodejs',

      // Install AWS CDK
      `npm install -g aws-cdk`,

      // Setup Java
      this.#runCommandAsWhoamiUser(
        `curl -s "https://get.sdkman.io" | bash`,
        `source "$HOME/.sdkman/bin/sdkman-init.sh"`,
        `sdk install java 21.0.9-amzn`,
        `sdk install maven 3.9.11`
      ),

      // Setup .NET
      'sleep 5',
      'dnf install -y dotnet-sdk-8.0',

      // Install AWS CLI v2 (detect architecture)
      this.#runCommandAsWhoamiUser(
        'ARCH=$(uname -m)',
        'if [ "$ARCH" = "aarch64" ]; then AWS_CLI_ARCH="aarch64"; else AWS_CLI_ARCH="x86_64"; fi',
        'curl "https://awscli.amazonaws.com/awscli-exe-linux-$AWS_CLI_ARCH.zip" -o $HOME/awscliv2.zip',
        'unzip -q $HOME/awscliv2.zip -d $HOME',
        'sudo $HOME/aws/install',
        'rm -rf $HOME/awscliv2.zip $HOME/aws',
        `aws configure set region ${Stack.of(this).region}`
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
        'curl -fsSL https://code-server.dev/install.sh | sh',
        `code-server --install-extension ms-python.python`,
        `code-server --install-extension vscjava.vscode-java-pack`,
        `code-server --install-extension muhammad-sammy.csharp`
      ),
      // Make 'code' command available
      this.#runCommandAsWhoamiUser(
        'sudo ln -sf /usr/bin/code-server /usr/local/bin/code'
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
  "dotnet.defaultSolution": "disable",
  "csharp.showOmnisharpLogOnError": false,
  "omnisharp.loggingLevel": "error",
  "output.smartScroll.enabled": false,
  "csharp.suppressBuildAssetsNotification": true,
  "csharp.suppressDotnetInstallWarning": true,
  "csharp.suppressDotnetRestoreNotification": true,
  "razor.format.enable": false,
  "terminal.integrated.defaultProfile.linux": "zsh",
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
      this.#runCommandAsWhoamiUser(
        // Clone workshop repository
        `git clone ${gitRepoUrl} /home/${whoamiUser}/${workshopDirectory}`,
        // Set git config for the workshop directory
        `cd /home/${whoamiUser}/${workshopDirectory} && git config --local user.name "Workshop User"`,
        `cd /home/${whoamiUser}/${workshopDirectory} && git config --local user.email "workshop@example.com"`
      ),

      // ========================================
      // Configure .zshrc - All customizations in one place
      // ========================================
      this.#runCommandAsWhoamiUser(
        `tee -a $HOME/.zshrc <<'ZSHRC_EOF'

# AWS Environment Variables
export AWS_REGION=${Stack.of(this).region}
export AWS_ACCOUNT_ID=${Stack.of(this).account}
export CDK_DEFAULT_REGION=${Stack.of(this).region}
export CDK_DEFAULT_ACCOUNT=${Stack.of(this).account}

ZSHRC_EOF
`
      ),
      'reboot'
    );

    // Create IAM role with proper cleanup
    const instanceRole = new Role(this, 'InstanceRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM'),
        ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    });

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
          volume: BlockDeviceVolume.ebs(50, {
            deleteOnTermination: true,
          }),
        },
      ],
      userDataCausesReplacement: true,
      userData: userData,
      role: instanceRole,
    });
    Tags.of(this.instance).add('Name', 'VSCode');

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
