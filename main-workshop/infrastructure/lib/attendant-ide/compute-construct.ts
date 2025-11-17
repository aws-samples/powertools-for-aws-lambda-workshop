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
import { readFileSync } from 'fs';
import { join } from 'path';
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

    // Load resource files with substitutions
    const vscodeSettings = this.#loadResourceFile('vscode-settings.json', {
      WHOAMI_USER: whoamiUser,
      WORKSHOP_DIRECTORY: workshopDirectory,
    });

    const workspaceConfig = this.#loadResourceFile('workshop.code-workspace', {
      WHOAMI_USER: whoamiUser,
      WORKSHOP_DIRECTORY: workshopDirectory,
    });

    const storageConfig = this.#loadResourceFile('vscode-storage.json', {
      WHOAMI_USER: whoamiUser,
    });



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
      // Verify git installation
      'which git || (echo "Git not found, installing separately" && dnf install -y git)',
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

      // Verify Node.js and npm installation
      'node --version',
      'npm --version',
      'which npx || echo "npx not found in PATH"',

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
        'curl -fsSL https://code-server.dev/install.sh | sh -s -- --version=4.104.3',
        `code-server --install-extension ms-python.python`,
        `code-server --install-extension vscjava.vscode-java-pack`,
        `code-server --install-extension muhammad-sammy.csharp`
      ),
      // Make 'code' command available
      this.#runCommandAsWhoamiUser(
        'sudo ln -sf /usr/bin/code-server /usr/local/bin/code'
      ),
      // Create User settings from resource file
      `mkdir -p /home/${whoamiUser}/.local/share/code-server/User`,
      `cat > /home/${whoamiUser}/.local/share/code-server/User/settings.json << 'SETTINGS_EOF'
${vscodeSettings}
SETTINGS_EOF
`,
      `chown ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/.local/share/code-server/User/settings.json`,
      // Setup workshop content - run as root for reliability
      `echo "=== Workshop Setup Started at $(date) ===" > /var/log/workshop-setup.log`,
      `echo "Git Repo URL: ${gitRepoUrl}" >> /var/log/workshop-setup.log`,
      `echo "Workshop Directory: /home/${whoamiUser}/${workshopDirectory}" >> /var/log/workshop-setup.log`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Verify git is installed before cloning
      `echo "Verifying git installation..." >> /var/log/workshop-setup.log`,
      `which git >> /var/log/workshop-setup.log 2>&1 || (echo "Git not found, installing now..." >> /var/log/workshop-setup.log && dnf install -y git >> /var/log/workshop-setup.log 2>&1)`,
      `git --version >> /var/log/workshop-setup.log 2>&1`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Clone workshop repository to temp location
      `echo "Step 1: Cloning repository..." >> /var/log/workshop-setup.log`,
      `git clone ${gitRepoUrl} /tmp/workshop-repo >> /var/log/workshop-setup.log 2>&1`,
      `echo "Clone exit code: $?" >> /var/log/workshop-setup.log`,
      `echo "Listing /tmp/workshop-repo:" >> /var/log/workshop-setup.log`,
      `ls -la /tmp/workshop-repo >> /var/log/workshop-setup.log 2>&1`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Check if main-workshop folder exists
      `echo "Step 2: Checking for 'main-workshop' folder..." >> /var/log/workshop-setup.log`,
      `if [ -d "/tmp/workshop-repo/main-workshop" ]; then echo "Found main-workshop folder" >> /var/log/workshop-setup.log; else echo "ERROR: main-workshop folder NOT found" >> /var/log/workshop-setup.log; fi`,
      `ls -la /tmp/workshop-repo/main-workshop >> /var/log/workshop-setup.log 2>&1`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Ensure workshop directory exists
      `mkdir -p /home/${whoamiUser}/${workshopDirectory}`,

      // Copy only main-workshop contents to the workshop directory
      `echo "Step 3: Copying contents to ${workshopDirectory}..." >> /var/log/workshop-setup.log`,
      `cp -rv /tmp/workshop-repo/main-workshop/* /home/${whoamiUser}/${workshopDirectory}/ >> /var/log/workshop-setup.log 2>&1`,
      `echo "Copy exit code: $?" >> /var/log/workshop-setup.log`,

      // Copy hidden files if any
      `shopt -s dotglob && cp -rv /tmp/workshop-repo/main-workshop/.??* /home/${whoamiUser}/${workshopDirectory}/ >> /var/log/workshop-setup.log 2>&1 || true`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Fix ownership
      `echo "Step 4: Fixing ownership..." >> /var/log/workshop-setup.log`,
      `chown -R ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/${workshopDirectory}`,
      `echo "Ownership fixed" >> /var/log/workshop-setup.log`,

      // Verify copied files
      `echo "Step 5: Verifying copied files..." >> /var/log/workshop-setup.log`,
      `ls -la /home/${whoamiUser}/${workshopDirectory} >> /var/log/workshop-setup.log 2>&1`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Clean up temp directory
      `echo "Step 6: Cleaning up temp directory..." >> /var/log/workshop-setup.log`,
      `rm -rf /tmp/workshop-repo`,
      `echo "Cleanup completed" >> /var/log/workshop-setup.log`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Modify workshop files
      `echo "Step 7: Modifying workshop files..." >> /var/log/workshop-setup.log`,

      // Remove original README
      `rm -f /home/${whoamiUser}/${workshopDirectory}/README.md`,
      `echo "Original README.md removed" >> /var/log/workshop-setup.log`,

      // Move WORKSHOP.md from infrastructure/resources to root and rename to README.md
      `if [ -f "/home/${whoamiUser}/${workshopDirectory}/infrastructure/resources/WORKSHOP.md" ]; then mv /home/${whoamiUser}/${workshopDirectory}/infrastructure/resources/WORKSHOP.md /home/${whoamiUser}/${workshopDirectory}/README.md && echo "WORKSHOP.md moved to README.md" >> /var/log/workshop-setup.log; else echo "WARNING: WORKSHOP.md not found at expected location" >> /var/log/workshop-setup.log; fi`,

      // Remove load-generator folder
      `rm -rf /home/${whoamiUser}/${workshopDirectory}/load-generator`,
      `echo "load-generator folder removed" >> /var/log/workshop-setup.log`,

      // Remove unwanted scripts (keep only build.sh, deploy.sh, check-load-generator-status.sh, tail-logs.sh)
      `cd /home/${whoamiUser}/${workshopDirectory}/scripts && ls | grep -v -E "^(build\\.sh|deploy\\.sh|check-load-generator-status\\.sh|tail-logs\\.sh)$" | xargs -r rm -f`,
      `echo "Unwanted scripts removed" >> /var/log/workshop-setup.log`,
      `echo "Remaining scripts:" >> /var/log/workshop-setup.log`,
      `ls -la /home/${whoamiUser}/${workshopDirectory}/scripts >> /var/log/workshop-setup.log 2>&1`,

      // Replace Makefile with workshop version from infrastructure/resources
      `rm -f /home/${whoamiUser}/${workshopDirectory}/Makefile`,
      `if [ -f "/home/${whoamiUser}/${workshopDirectory}/infrastructure/resources/Makefile" ]; then cp /home/${whoamiUser}/${workshopDirectory}/infrastructure/resources/Makefile /home/${whoamiUser}/${workshopDirectory}/Makefile && echo "Makefile copied from infrastructure/resources" >> /var/log/workshop-setup.log; else echo "WARNING: Makefile not found at expected location" >> /var/log/workshop-setup.log; fi`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Install infrastructure dependencies as root (before reboot)
      `echo "Step 8: Installing infrastructure dependencies..." >> /var/log/workshop-setup.log`,
      `cd /home/${whoamiUser}/${workshopDirectory}/infrastructure && npm install >> /var/log/workshop-setup.log 2>&1`,
      `echo "Infrastructure dependencies installed with exit code: $?" >> /var/log/workshop-setup.log`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Fix ownership of node_modules and package-lock.json
      `chown -R ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/${workshopDirectory}/infrastructure/node_modules`,
      `chown ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/${workshopDirectory}/infrastructure/package-lock.json 2>/dev/null || true`,

      // Bootstrap CDK as root
      `echo "Step 9: Bootstrapping CDK..." >> /var/log/workshop-setup.log`,
      `cd /home/${whoamiUser}/${workshopDirectory}/infrastructure && npx cdk bootstrap >> /var/log/workshop-setup.log 2>&1`,
      `echo "CDK bootstrap completed with exit code: $?" >> /var/log/workshop-setup.log`,
      `echo "" >> /var/log/workshop-setup.log`,

      // Fix ownership of cdk.out directory
      `chown -R ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/${workshopDirectory}/infrastructure/cdk.out 2>/dev/null || true`,

      // Create a symlink to the log file for easy access
      `ln -sf /var/log/workshop-setup.log /home/${whoamiUser}/workshop-setup.log`,
      `chown ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/workshop-setup.log`,

      `echo "=== Workshop Setup Completed at $(date) ===" >> /var/log/workshop-setup.log`,

      // Initialize git as the user
      this.#runCommandAsWhoamiUser(
        `cd /home/${whoamiUser}/${workshopDirectory} && git init`,
        `cd /home/${whoamiUser}/${workshopDirectory} && git config --local user.name "Workshop User"`,
        `cd /home/${whoamiUser}/${workshopDirectory} && git config --local user.email "workshop@example.com"`,
        `cd /home/${whoamiUser}/${workshopDirectory} && git add .`,
        `cd /home/${whoamiUser}/${workshopDirectory} && git commit -m "Initial workshop content" || true`,
        // Create workspace file to open workshop folder by default
        `mkdir -p /home/${whoamiUser}/.local/share/code-server/User/Workspaces`,
        `cat > /home/${whoamiUser}/.local/share/code-server/User/Workspaces/workshop.code-workspace << 'WORKSPACE_EOF'
${workspaceConfig}
WORKSPACE_EOF
`,
        `chown ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/.local/share/code-server/User/Workspaces/workshop.code-workspace`,
        // Set the last opened workspace
        `mkdir -p /home/${whoamiUser}/.local/share/code-server/User/globalStorage`,
        `cat > /home/${whoamiUser}/.local/share/code-server/User/globalStorage/storage.json << 'STORAGE_EOF'
${storageConfig}
STORAGE_EOF
`,
        `chown ${whoamiUser}:${whoamiUser} /home/${whoamiUser}/.local/share/code-server/User/globalStorage/storage.json`
      ),
      `systemctl enable --now code-server@${whoamiUser}`,

      // ========================================
      // Configure .zshrc - All customizations in one place
      // ========================================
      this.#runCommandAsWhoamiUser(
        `echo "" >> $HOME/.zshrc`,
        `echo "# AWS Environment Variables" >> $HOME/.zshrc`,
        `echo "export AWS_DEFAULT_REGION=${Stack.of(this).region}" >> $HOME/.zshrc`,
        `echo "export AWS_REGION=${Stack.of(this).region}" >> $HOME/.zshrc`,
        `echo "export AWS_ACCOUNT_ID=${Stack.of(this).account}" >> $HOME/.zshrc`,
        `echo "export CDK_DEFAULT_REGION=${Stack.of(this).region}" >> $HOME/.zshrc`,
        `echo "export CDK_DEFAULT_ACCOUNT=${Stack.of(this).account}" >> $HOME/.zshrc`,
        `echo "" >> $HOME/.zshrc`,
        `echo "# Workshop Makefile wrapper - run make from anywhere in workshop directory" >> $HOME/.zshrc`,
        `echo "function make() {" >> $HOME/.zshrc`,
        `echo "  local workshop_root=\\"/home/${whoamiUser}/${workshopDirectory}\\"" >> $HOME/.zshrc`,
        `echo "  local current_dir=\\"\\$PWD\\"" >> $HOME/.zshrc`,
        `echo "  case \\"\\$current_dir\\" in" >> $HOME/.zshrc`,
        `echo "    \\"\\$workshop_root\\"*)" >> $HOME/.zshrc`,
        `echo "      command make -C \\"\\$workshop_root\\" \\"\\$@\\"" >> $HOME/.zshrc`,
        `echo "      ;;" >> $HOME/.zshrc`,
        `echo "    *)" >> $HOME/.zshrc`,
        `echo "      command make \\"\\$@\\"" >> $HOME/.zshrc`,
        `echo "      ;;" >> $HOME/.zshrc`,
        `echo "  esac" >> $HOME/.zshrc`,
        `echo "}" >> $HOME/.zshrc`
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

  #loadResourceFile(filename: string, substitutions: Record<string, string>): string {
    const filePath = join(__dirname, '../../resources', filename);
    let content = readFileSync(filePath, 'utf-8');

    // Replace template variables
    for (const [key, value] of Object.entries(substitutions)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return content;
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
