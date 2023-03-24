/* eslint-disable @typescript-eslint/no-explicit-any */
import { IsNotEmpty, IsString } from 'class-validator';

export class FileAccessDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsNotEmpty()
  data: string;

  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @IsNotEmpty()
  accessKey: string;

  @IsNotEmpty()
  fileMetaData: any;

  @IsNotEmpty()
  iv: string;

  @IsNotEmpty()
  @IsString()
  salt: string;
}
// export class UpdateLinkDto {
//   @IsString()
//   @IsNotEmpty()
//   status: string;

//   @IsString()
//   @IsNotEmpty()
//   fileType: string;

//   @IsString()
//   @IsOptional()
//   data: string;
// }
