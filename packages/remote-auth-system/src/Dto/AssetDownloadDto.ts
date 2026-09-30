export interface AssetDownloadDto{
    id: string,
    fileName: string | null
    contentType: string | null,
    fileBytes: string,
}