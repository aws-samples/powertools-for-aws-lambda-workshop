import { CfnOutput, Stack, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SubnetType,
  SecurityGroup,
  Instance,
  InstanceType,
  MachineImage,
  BlockDeviceVolume,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';

interface AttendantIdeProps {}

export class AttendantIde extends Construct {
  public constructor(scope: Construct, id: string, _props: AttendantIdeProps) {
    super(scope, id);

    const defaultVpc = Vpc.fromLookup(this, 'defaultVpc', { isDefault: true });
    const instanceSecurityGroup = new SecurityGroup(this, 'instance-sg', {
      vpc: defaultVpc,
      allowAllOutbound: true,
    });

    const userData = UserData.forLinux();
    userData.addCommands(
      // Install general dependencies
      'yum install -y git docker jq zsh util-linux-user gcc make gcc-c++ libunwind java-17-amazon-corretto-headless unzip zip',
      // Setup docker
      'service docker start',
      'usermod -aG docker ec2-user',
      // Setup zsh and oh-my-zsh
      'chsh -s $(which zsh) ec2-user',
      `su - ec2-user -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended'`,
      // Install Pyenv
      `su - ec2-user -c 'curl -s https://pyenv.run | zsh'`,
      `su - ec2-user -c 'echo "export PYENV_ROOT="$HOME/.pyenv"" >> $HOME/.zshrc'`,
      `su - ec2-user -c 'echo "command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"" >> $HOME/.zshrc'`,
      `su - ec2-user -c 'echo "eval \"\$(pyenv init -)\"" >> $HOME/.zshrc'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.pyenv/bin:$PATH" && eval "$(pyenv init --path)" && pyenv install 3.11.0'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.pyenv/bin:$PATH" && eval "$(pyenv init --path)" && pyenv global 3.11.0'`,
      // Install Node
      "su - ec2-user -c 'curl -fsSL https://fnm.vercel.app/install | zsh'",
      `su - ec2-user -c 'export PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm install v18'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm default v18'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm use v18'`,
      // Install .NET
      "su - ec2-user -c 'curl -fsSL https://dot.net/v1/dotnet-install.sh | zsh -s -c 6.0'",
      'su - ec2-user -c \'echo "export PATH="$HOME/.dotnet:%HOME/.dotnet/tools:$PATH"" >> $HOME/.zshrc\'',
      // Install Java
      'wget http://repos.fedorapeople.org/repos/dchen/apache-maven/epel-apache-maven.repo -O /etc/yum.repos.d/epel-apache-maven.repo',
      'sed -i s/$releasever/6/g /etc/yum.repos.d/epel-apache-maven.repo',
      'yum install -y apache-maven',
      // Install AWS CLI
      "su - ec2-user -c 'curl https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip -o $HOME/awscliv2.zip'",
      "su - ec2-user -c 'unzip $HOME/awscliv2.zip'",
      "su - ec2-user -c 'sudo $HOME/aws/install'",
      "su - ec2-user -c 'rm -rf $HOME/awscliv2.zip $HOME/aws'",
      // Configure AWS CLI
      `su - ec2-user -c 'aws configure set region ${Stack.of(this).region}'`,
      // Configure git
      `su - ec2-user -c 'git config --global init.defaultBranch main'`,
      // Install VSCode
      "su - ec2-user -c 'curl -fsSL https://code-server.dev/install.sh | sh'"
    );

    const vscodeInstance = new Instance(this, 'instance', {
      vpc: defaultVpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: new InstanceType('c6g.large'),
      machineImage: MachineImage.fromSsmParameter(
        '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64'
      ),
      securityGroup: instanceSecurityGroup,
      keyName: 'VSCode',
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(50),
        },
      ],
      userDataCausesReplacement: true,
      userData: userData,
    });
    Tags.of(vscodeInstance).add('chronicled', 'true');
    Tags.of(vscodeInstance).add('Name', 'VSCode');
    vscodeInstance.role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    new CfnOutput(this, 'instanceId', {
      value: vscodeInstance.instanceId,
    });

    new CfnOutput(this, 'publicIP', {
      value: vscodeInstance.instancePublicIp,
    });
  }
}
