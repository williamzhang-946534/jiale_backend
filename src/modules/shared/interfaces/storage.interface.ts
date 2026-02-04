export interface StorageService {
  uploadFile(file: Buffer, key: string, contentType?: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): string;
  generateUploadPath(type: UploadType, originalName?: string): string;
}

export enum UploadType {
  // 用户相关 - mobile目录
  USER_AVATAR = 'mobile/avatars',
  SERVICE_IMAGES = 'mobile/services', 
  FEEDBACK_FILES = 'mobile/feedback',
  
  // 管理相关 - admin目录
  BANNER_IMAGES = 'admin/banners',
  CATEGORY_IMAGES = 'admin/categories',
  CONFIG_FILES = 'admin/configs',
  
  // 公共资源 - common目录
  ICON_FILES = 'common/icons',
  STATIC_FILES = 'common/static',
  
  // 临时文件 - temp目录
  TEMP_FILES = 'temp',
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface STSCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
}
