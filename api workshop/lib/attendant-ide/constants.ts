// Header expected by the load balancer to allow traffic to the instance from the distribution
const customSecurityHeader = 'X-VscodeServer';
const customSecurityHeaderValue = 'PowertoolsForAWS';

// Port where the IDE will be served from
const idePort = '8080';

// Languages
const nodeVersion = 'v22';
const pythonVersion = '3.13.0';

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
];

const vscodeAccessCode = 'powertools-workshop';

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
  osPackages,
  whoamiUser,
  workshopRepo,
  zshrcTemplateUrl,
  workshopDirectory,
  vscodeAccessCode,
};
