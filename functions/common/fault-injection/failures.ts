import { default as mitm } from 'mitm';
import { spawnSync } from 'child_process';

const latencyFailure = async (min: number, max: number): Promise<number> => {
  const latencyRange = max - min;
  const setLatency = Math.floor(min + Math.random() * latencyRange);
  await new Promise((resolve) => setTimeout(resolve, setLatency));
  
  return setLatency;
};

const exceptionFailure = (message: string) => {
  throw new Error(message);
};

const statusCodeFailure = (statusCode: number) => ({
  statusCode,
});

const diskSpaceFailure = (diskSpace: number) => {
  spawnSync('dd', [
    'if=/dev/zero',
    'of=/tmp/diskspace-failure-' + Date.now() + '.tmp',
    'count=1000',
    'bs=' + diskSpace * 1000,
  ]);
};

const denyListFailure = (denylist: string[], mitmHandler: any) => {
  // if the global mitm doesn't yet exist, create it now
  if (!mitmHandler) mitmHandler = mitm();
  mitmHandler.enable();

  const blockRegexes: RegExp[] = [];
  denylist.forEach((regex: string) => {
    blockRegexes.push(new RegExp(regex));
  });

  // attach a handler to filter the configured deny patterns
  mitmHandler.on('connect', (socket: any, opts: any) => {
    let block = false;
    blockRegexes.forEach((blRegex) => {
      if (blRegex.test(opts.host)) {
        block = true;
      }
    });
    if (block) {
      socket.end();
    } else {
      socket.bypass();
    }
  });

  // remove any previously attached handlers, leaving only the most recently added one
  while (typeof mitmHandler._events.connect !== 'function') {
    mitmHandler.removeListener('connect', mitmHandler._events.connect[0]);
  }
};

const memoryFailure = () => {
  const array = [];
  while (true) {
    array.push('a');
  }
};

const timeoutFailure = async () => {
  await new Promise((resolve) => setTimeout(resolve, 15 * 60 * 1000)); // 15 minutes
};

export {
  latencyFailure,
  exceptionFailure,
  statusCodeFailure,
  diskSpaceFailure,
  denyListFailure,
  memoryFailure,
  timeoutFailure,
};
