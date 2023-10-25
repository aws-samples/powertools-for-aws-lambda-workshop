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
      'yum install -y git docker jq zsh util-linux-user gcc make gcc-c++ libunwind java-17-amazon-corretto-headless unzip zip zlib zlib-devel openssl-devel ncurses-devel readline-devel bzip2-devel libffi-devel sqlite-devel xz-devel',
      // Setup docker
      'service docker start',
      'usermod -aG docker ec2-user',
      // Setup zsh and oh-my-zsh
      'chsh -s $(which zsh) ec2-user',
      `su - ec2-user -c 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended'`,
      // Download .zshrc
      `su - ec2-user -c 'curl -fsSL https://raw.githubusercontent.com/chronicled/attendant-ide/main/.zshrc -o $HOME/.zshrc'`,
      // Install Pyenv
      `su - ec2-user -c 'curl -s https://pyenv.run | zsh'`,
      // Install fnm (Node.js)
      "su - ec2-user -c 'curl -fsSL https://fnm.vercel.app/install | zsh'",
      // Setup Python
      `su - ec2-user -c 'export PATH="/home/ec2-user/.pyenv/bin:$PATH" && eval "$(pyenv init --path)" && pyenv install 3.11.0'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.pyenv/bin:$PATH" && eval "$(pyenv init --path)" && pyenv global 3.11.0'`,
      // Setup Node
      `su - ec2-user -c 'export PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm install v18'`,
      `su - ec2-user -c 'exso port PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm default v18'`,
      `su - ec2-user -c 'export PATH="/home/ec2-user/.local/share/fnm:$PATH" && eval "\`fnm env\`" && fnm use v18'`,
      // Install .NET
      "rpm -Uvh https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm",
      "yum install -y aspnetcore-runtime-6.0 dotnet-sdk-6.0",
      "echo 'export DOTNET_ROOT=/home/ec2-user/.dotnet'                  >> /home/ec2-user/.bash_profile",
      "echo 'export PATH=\"$DOTNET_ROOT:$DOTNET_ROOT/tools:$PATH\"'        >> /home/ec2-user/.bash_profile"
      // Install Java
      'wget https://dlcdn.apache.org/maven/maven-3/3.9.5/binaries/apache-maven-3.9.5-bin.zip',
      'unzip apache-maven-3.9.5-bin.zip -d /opt',
      'ln -s /opt/apache-maven-3.9.5/ /opt/maven',
      'echo "export M2_HOME=/opt/maven" | tee /etc/profile.d/mvn.sh',
      'echo "export PATH=${M2_HOME}/bin:${PATH}" | tee -a /etc/profile.d/mvn.sh',
      'chmod a+x /etc/profile.d/mvn.sh'
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
