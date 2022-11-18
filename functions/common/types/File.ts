type FileStatus = 'queued' | 'in-progress' | 'completed' | 'failed';

type FileType = 'video/mp4' | 'video/webm' | 'image/jpeg' | 'image/png';

type File = {
  id: string
  name: string
  key: string
  type: FileType
  status?: FileStatus
};

export { File, FileStatus, FileType };
