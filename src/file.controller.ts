/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-var-requires */
import { Controller, Get, Res, Param, Req } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FileAccess, FileAccessDocument } from './file-access.entity';
import { Model } from 'mongoose';

import { HttpService } from '@nestjs/axios';

import type { Response } from 'express';
import { Readable } from 'stream';
import { firstValueFrom, map } from 'rxjs';

const crypto = require('crypto').webcrypto;

async function generateSecretKeyForEncryption(
  secreteKeyString: string,
  userSalt: string,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreteKeyString),
    { name: 'PBKDF2', hash: 'SHA-256' },
    false,
    ['deriveKey'],
  );

  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(userSalt),
      iterations: 1000,
      hash: 'SHA-256',
    },
    key,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
  console.log('derivedKey ===', derivedKey);
  return derivedKey;
}

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

const decryptedSecretKeyAndFile = async (
  data,
  secretKey,
  accessKey,
  iv,
  fileData,
  userSalt,
) => {
  const newDataArray = fromHexString(data);
  const key = await generateSecretKeyForEncryption(secretKey, userSalt);
  const encryptionKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new TextEncoder().encode(accessKey),
      tagLength: 128,
    },
    key,
    newDataArray,
  );

  const ecnryptionKeyForFile = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(encryptionKey),
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt'],
  );

  const encrtedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new TextEncoder().encode(iv) },
    ecnryptionKeyForFile,
    fileData,
  );
  return encrtedData;
};

@Controller('file')
export class FileController {
  constructor(
    @InjectModel(FileAccess.name)
    private fileAccessModel: Model<FileAccessDocument>,
    private readonly httpService: HttpService,
  ) {}

  @Get('access/:accessKey')
  async getAcessFile(@Res() res: Response, @Param() params, @Req() req) {
    const { accessKey } = params;
    const accessData = await this.fileAccessModel.findOne({ accessKey });
    // @ts-ignore
    const ipfsMetaData = accessData.fileMetaData.sort(function (a, b) {
      return a.index - b.index;
    });

    console.log('ipfsMetaData ====', ipfsMetaData);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `filename="${accessData.fileName}"`,
    });
    const readableStream = new Readable();
    readableStream._read = () => {};
    readableStream.pipe(res);

    for (let i = 0; i < ipfsMetaData.length; i++) {
      const fileRespone = await firstValueFrom(
        this.httpService
          .get(`http://localhost:8080/api/v0/cat/${ipfsMetaData[i].cid}`, {
            responseType: 'arraybuffer',
          })
          .pipe(
            map((response) => {
              // console.log(response);
              return response.data;
            }),
          ),
      );
      const decryptedData = await decryptedSecretKeyAndFile(
        accessData.data,
        accessData.secretKey,
        accessData.accessKey,
        accessData.iv,
        fileRespone,
        accessData.salt,
      );

      readableStream.push(Buffer.from(decryptedData));
    }
    readableStream.push(null);
  }
}
