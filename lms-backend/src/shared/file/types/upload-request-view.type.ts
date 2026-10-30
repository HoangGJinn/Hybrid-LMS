/** Everything the browser needs to POST one file straight to S3. */
export class UploadRequestView {
  constructor(
    readonly fileId: string,
    readonly upload: {
      readonly url: string;
      /** Form fields to append to FormData BEFORE the file; S3 rejects the request if the file comes first. */
      readonly fields: Readonly<Record<string, string>>;
    },
  ) {}
}
