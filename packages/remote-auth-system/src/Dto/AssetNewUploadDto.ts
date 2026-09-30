export interface AssetNewUploadDto{
    entityType: string,
    assetType: string,
    contentType: string | null,
    fileBytes: string,
    fileName: string,
    isSingletonAsset: boolean
}