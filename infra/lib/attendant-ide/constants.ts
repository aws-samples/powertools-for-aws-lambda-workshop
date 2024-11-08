// Header expected by the load balancer to allow traffic to the instance from the distribution
const customSecurityHeader = 'X-VscodeServer';
const customSecurityHeaderValue = 'PowertoolsForAWS';

// Port where the IDE will be served from
const idePort = '8080';

// Languages
const nodeVersion = 'v18';
const pythonVersion = '3.11.0';
const javaVersion = 'java-17-amazon-corretto-headless';
const dotNetRepo =
  'https://packages.microsoft.com/config/centos/7/packages-microsoft-prod.rpm';
const dotNetVersion = ['aspnetcore-runtime-8.0', 'dotnet-sdk-8.0'].join(' ');

// OS Packages
const osPackages = [
  // General
  'git',
  'docker',
  'jq',
  'zsh',
  'util-linux-user',
  'gcc',
  'make',
  'gcc-c++',
  'libunwind',
  'unzip',
  'zip',
  // Python requirements
  'zlib',
  'zlib-devel',
  'openssl-devel',
  'ncurses-devel',
  'readline-devel',
  'bzip2-devel',
  'libffi-devel',
  'sqlite-devel',
  'xz-devel',
  // Java requirements
  javaVersion,
  // .NET requirements
  dotNetVersion,
];

const vscodeAccessCode = "powertools-workshop"

const whoamiUser = 'ec2-user';
const workshopRepo = 'aws-samples/powertools-for-aws-lambda-workshop';
const zshrcTemplateUrl = `https://raw.githubusercontent.com/${workshopRepo}/main/infra/lib/attendant-ide/zshrc-sample.txt`;
const workshopDirectory = 'workshop';

export {
  customSecurityHeader,
  customSecurityHeaderValue,
  idePort,
  nodeVersion,
  pythonVersion,
  javaVersion,
  dotNetRepo,
  dotNetVersion,
  osPackages,
  whoamiUser,
  workshopRepo,
  zshrcTemplateUrl,
  workshopDirectory,
  vscodeAccessCode
};
